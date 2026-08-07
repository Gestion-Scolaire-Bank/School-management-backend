from collections import defaultdict
from typing import Callable, List, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.admin_client import AdminResourceNotFound, AdminServiceClient, AdminServiceUnavailable, get_admin_client
from app.core.database import get_db
from app.core.events import KafkaEventPublisher, get_event_publisher
from app.core.pdf_renderer import get_pdf_renderer
from app.core.registration_client import RegistrationServiceClient, get_registration_client
from app.core.storage import ReportCardStorage, get_storage
from app.models.grade import Grade
from app.models.report_card import ReportCard
from app.schemas.grade import GradeCreate, GradeOut
from app.schemas.report_card import (
    ClassSummaryOut,
    GenerateReportCardsRequest,
    ReportCardOut,
    StudentSummary,
)

router = APIRouter()

# Routes reportcard-service - extraites du document de conception (section 5.2)

TOPIC_REPORTCARD_AVAILABLE = "sm.reportcard.available"
TOPIC_REPORTCARD_GENERATED = "sm.reportcard.generated"


def _weighted_average(grades: List[Grade]) -> float:
    total_weight = sum(grade.weight for grade in grades)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum((grade.score / grade.max_score) * 20 * grade.weight for grade in grades)
    return weighted_sum / total_weight


@router.post("/api/v1/reports/grades", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
def saisir_une_note(
    payload: GradeCreate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    admin_client: AdminServiceClient = Depends(get_admin_client),
):
    """Roles autorises : Enseignant, uniquement pour une classe/matiere qui lui est
    affectee (verifie aupres d'admin-service - cf. proposition de schema, TeacherAssignment).
    """
    try:
        admin_client.get_class(payload.class_id)
        subject = admin_client.get_subject(payload.subject_id)
        assignments = admin_client.list_teacher_assignments(payload.class_id)
    except AdminResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except AdminServiceUnavailable as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    is_assigned = any(
        a["teacherId"] == x_user_id and a["subjectId"] == payload.subject_id for a in assignments
    )
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'etes pas affecte a cette classe/matiere - demandez a l'administrateur de vous y affecter",
        )

    grade = Grade(
        student_id=payload.student_id,
        class_id=payload.class_id,
        period=payload.period,
        subject_id=payload.subject_id,
        subject_name=subject["name"],
        score=payload.score,
        max_score=payload.max_score,
        weight=payload.weight,
        teacher_id=x_user_id,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


@router.post(
    "/api/v1/reports/generate",
    response_model=List[ReportCardOut],
    status_code=status.HTTP_201_CREATED,
)
def generer_les_bulletins_d_une_classe_periode(
    payload: GenerateReportCardsRequest,
    db: Session = Depends(get_db),
    storage: ReportCardStorage = Depends(get_storage),
    publisher: KafkaEventPublisher = Depends(get_event_publisher),
    render_pdf: Callable = Depends(get_pdf_renderer),
):
    """Roles autorises : Admin. Calcule les moyennes/rangs et genere un bulletin PDF par eleve."""
    stmt = select(Grade).where(Grade.class_id == payload.class_id, Grade.period == payload.period)
    grades = db.execute(stmt).scalars().all()

    if not grades:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucune note trouvee pour la classe {payload.class_id} / periode {payload.period}",
        )

    grades_by_student: dict[str, list[Grade]] = defaultdict(list)
    for grade in grades:
        grades_by_student[grade.student_id].append(grade)

    averages = {
        student_id: _weighted_average(student_grades)
        for student_id, student_grades in grades_by_student.items()
    }
    ranking = sorted(averages.items(), key=lambda item: item[1], reverse=True)
    ranks = {student_id: index + 1 for index, (student_id, _) in enumerate(ranking)}
    class_size = len(averages)

    report_cards: list[ReportCard] = []
    for student_id, student_grades in grades_by_student.items():
        average = averages[student_id]
        rank = ranks[student_id]

        pdf_bytes = render_pdf(
            student_id=student_id,
            class_id=payload.class_id,
            period=payload.period,
            grades=student_grades,
            average=average,
            rank=rank,
            class_size=class_size,
        )
        object_key = f"{payload.class_id}/{payload.period}/{student_id}.pdf"
        pdf_url = storage.upload(object_key, pdf_bytes)

        report_card = ReportCard(
            student_id=student_id,
            class_id=payload.class_id,
            period=payload.period,
            average=average,
            rank=rank,
            class_size=class_size,
            object_key=object_key,
            pdf_url=pdf_url,
        )
        db.add(report_card)
        report_cards.append(report_card)

    db.commit()
    for report_card in report_cards:
        db.refresh(report_card)

    # Best-effort : une panne Kafka ne doit pas empecher la generation des bulletins.
    for report_card in report_cards:
        try:
            publisher.publish(
                TOPIC_REPORTCARD_AVAILABLE,
                {"studentId": report_card.student_id, "bulletin_url": report_card.pdf_url},
            )
        except Exception:
            pass

    try:
        publisher.publish(TOPIC_REPORTCARD_GENERATED, {"classId": payload.class_id, "moyennes": averages})
    except Exception:
        pass

    return report_cards


@router.get("/api/v1/reports/student/{id}")
def consulter_telecharger_le_bulletin(
    student_id: str = Path(..., alias="id"),
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    storage: ReportCardStorage = Depends(get_storage),
):
    """Roles autorises : Parent / Eleve. Telecharge le bulletin le plus recent (ou d'une periode donnee)."""
    stmt = select(ReportCard).where(ReportCard.student_id == student_id)
    if period:
        stmt = stmt.where(ReportCard.period == period)
    stmt = stmt.order_by(ReportCard.generated_at.desc())
    report_card = db.execute(stmt).scalars().first()

    if report_card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun bulletin disponible")

    pdf_bytes = storage.download(report_card.object_key)
    return Response(content=pdf_bytes, media_type="application/pdf")


@router.get("/api/v1/reports/class/{id}/summary", response_model=ClassSummaryOut)
def statistiques_de_classe(
    period: str,
    class_id: str = Path(..., alias="id"),
    db: Session = Depends(get_db),
    registration_client: RegistrationServiceClient = Depends(get_registration_client),
):
    """Roles autorises : Enseignant / Admin."""
    stmt = (
        select(ReportCard)
        .where(ReportCard.class_id == class_id, ReportCard.period == period)
        .order_by(ReportCard.rank)
    )
    report_cards = db.execute(stmt).scalars().all()

    # Resout le nom des eleves aupres de registration-service - degrade sur l'identifiant brut
    # si le service est injoignable, plutot que de faire echouer toute la synthese pour un
    # affichage secondaire.
    student_names: dict[str, str] = {}
    try:
        for registration in registration_client.list_by_class(class_id):
            student_names[registration["id"]] = f"{registration['firstName']} {registration['lastName']}"
    except httpx.HTTPError:
        pass

    students = [
        StudentSummary(
            student_id=rc.student_id,
            student_name=student_names.get(rc.student_id, rc.student_id),
            average=rc.average,
            rank=rc.rank,
        )
        for rc in report_cards
    ]
    class_average = sum(s.average for s in students) / len(students) if students else 0.0

    return ClassSummaryOut(
        class_id=class_id,
        period=period,
        student_count=len(students),
        class_average=class_average,
        students=students,
    )
