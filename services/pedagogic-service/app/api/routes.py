import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.admin_client import AdminResourceNotFound, AdminServiceClient, AdminServiceUnavailable, get_admin_client
from app.core.database import get_db
from app.core.storage import PedagogicStorage, get_storage
from app.models.course import Course
from app.models.resource import PedagogicResource
from app.schemas.course import CourseCreate, CourseOut
from app.schemas.resource import ResourceOut, ResourceType

router = APIRouter()

_UNSAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_object_key(title: str, filename: str) -> str:
    """Construit une cle d'objet MinIO unique et sans caractere dangereux : le nom de
    fichier fourni par l'utilisateur ne doit jamais etre utilise tel quel (separateurs de
    chemin, caracteres de controle), et un prefixe UUID evite qu'un meme titre/nom de
    fichier n'ecrase un objet existant."""
    safe_title = _UNSAFE_CHARS.sub("-", title.lower().strip()).strip("-") or "ressource"
    basename = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    safe_filename = _UNSAFE_CHARS.sub("-", basename).strip("-") or "fichier"
    return f"{safe_title}-{uuid.uuid4()}-{safe_filename}"


def _require_teacher_assignment(admin_client: AdminServiceClient, teacher_id: Optional[str], class_id: str, subject_id: str) -> None:
    """Verifie que teacher_id est bien affecte a cette classe/matiere aupres d'admin-service -
    empeche un enseignant de publier un cours/une ressource sur une classe/matiere qui ne lui
    est pas confiee (meme garde-fou que saisir_une_note dans reportcard-service)."""
    assignments = admin_client.list_teacher_assignments(class_id)
    is_assigned = any(a["teacherId"] == teacher_id and a["subjectId"] == subject_id for a in assignments)
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'etes pas affecte a cette classe/matiere - demandez a l'administrateur de vous y affecter",
        )

# Routes pedagogic-service - extraites du document de conception (section 5.2)


@router.post(
    "/api/v1/pedagogic/resources",
    response_model=ResourceOut,
    status_code=status.HTTP_201_CREATED,
)
def uploader_une_ressource(
    file: UploadFile = File(...),
    title: str = Form(...),
    resource_type: ResourceType = Form(...),
    description: Optional[str] = Form(None),
    class_id: Optional[str] = Form(None),
    subject_id: Optional[str] = Form(None),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    storage: PedagogicStorage = Depends(get_storage),
    admin_client: AdminServiceClient = Depends(get_admin_client),
):
    """Roles autorises : Enseignant. Uploade une ressource (document/video/plan/evaluation)
    vers MinIO et enregistre ses metadonnees en base. class_id/subject_id restent optionnels
    (une ressource peut etre generale), mais quand fournis ils doivent referencer une
    classe/matiere reelle d'admin-service, et l'enseignant doit y etre affecte."""
    subject_name = None
    try:
        if class_id:
            admin_client.get_class(class_id)
        if subject_id:
            subject_name = admin_client.get_subject(subject_id)["name"]
    except AdminResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except AdminServiceUnavailable as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    if class_id and subject_id:
        _require_teacher_assignment(admin_client, x_user_id, class_id, subject_id)

    content = file.file.read()
    content_type = file.content_type or "application/octet-stream"
    object_key = _safe_object_key(title, file.filename or "fichier")

    file_url = storage.upload(object_key, data=content, content_type=content_type)

    resource = PedagogicResource(
        title=title,
        description=description,
        resource_type=resource_type.value,
        class_id=class_id,
        subject_id=subject_id,
        subject_name=subject_name,
        file_name=file.filename,
        object_key=object_key,
        file_url=file_url,
        content_type=content_type,
        size_bytes=len(content),
        uploaded_by=x_user_id,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.get("/api/v1/pedagogic/resources", response_model=list[ResourceOut])
def lister_les_ressources_disponibles(
    subject_id: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None),
    resource_type: Optional[ResourceType] = Query(None),
    db: Session = Depends(get_db),
):
    """Roles autorises : Enseignant. Liste les ressources disponibles, avec filtres optionnels."""
    stmt = select(PedagogicResource)
    if subject_id:
        stmt = stmt.where(PedagogicResource.subject_id == subject_id)
    if class_id:
        stmt = stmt.where(PedagogicResource.class_id == class_id)
    if resource_type:
        stmt = stmt.where(PedagogicResource.resource_type == resource_type.value)
    stmt = stmt.order_by(PedagogicResource.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.post(
    "/api/v1/pedagogic/courses",
    response_model=CourseOut,
    status_code=status.HTTP_201_CREATED,
)
def creer_un_cours_plan_de_lecon(
    payload: CourseCreate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    admin_client: AdminServiceClient = Depends(get_admin_client),
):
    """Roles autorises : Enseignant, uniquement pour une classe/matiere qui lui est
    affectee (verifie aupres d'admin-service - meme garde-fou que reportcard-service)."""
    try:
        admin_client.get_class(payload.class_id)
        subject = admin_client.get_subject(payload.subject_id)
    except AdminResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except AdminServiceUnavailable as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    _require_teacher_assignment(admin_client, x_user_id, payload.class_id, payload.subject_id)

    course = Course(
        title=payload.title,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        subject_name=subject["name"],
        content=payload.content,
        created_by=x_user_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/api/v1/pedagogic/courses", response_model=list[CourseOut])
def lister_les_cours_disponibles(
    subject_id: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Roles autorises : Enseignant. Liste les cours/plans de lecon deja crees, avec filtres
    optionnels - jusqu'ici un enseignant ne pouvait pas revoir un cours cree faute d'endpoint
    de listing (seules les ressources fichiers en avaient un)."""
    stmt = select(Course)
    if subject_id:
        stmt = stmt.where(Course.subject_id == subject_id)
    if class_id:
        stmt = stmt.where(Course.class_id == class_id)
    stmt = stmt.order_by(Course.created_at.desc())
    return db.execute(stmt).scalars().all()
