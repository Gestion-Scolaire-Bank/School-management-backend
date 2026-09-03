package cm.schoolmanage.admin.controller;

import cm.schoolmanage.admin.domain.Establishment;
import cm.schoolmanage.admin.dto.AssignSubjectToClassRequest;
import cm.schoolmanage.admin.dto.ClassSubjectResponse;
import cm.schoolmanage.admin.dto.CreateEstablishmentRequest;
import cm.schoolmanage.admin.dto.CreateFeeScheduleRequest;
import cm.schoolmanage.admin.dto.CreateSchoolClassRequest;
import cm.schoolmanage.admin.dto.CreateSubjectRequest;
import cm.schoolmanage.admin.dto.CreateTeacherAssignmentRequest;
import cm.schoolmanage.admin.dto.EstablishmentResponse;
import cm.schoolmanage.admin.dto.FeeScheduleResponse;
import cm.schoolmanage.admin.dto.GlobalConfigResponse;
import cm.schoolmanage.admin.dto.SchoolClassResponse;
import cm.schoolmanage.admin.dto.SubjectResponse;
import cm.schoolmanage.admin.dto.TeacherAssignmentResponse;
import cm.schoolmanage.admin.dto.UpdateUserStatusRequest;
import cm.schoolmanage.admin.service.ClassSubjectService;
import cm.schoolmanage.admin.service.EstablishmentService;
import cm.schoolmanage.admin.service.FeeScheduleService;
import cm.schoolmanage.admin.service.GlobalConfigService;
import cm.schoolmanage.admin.service.SchoolClassService;
import cm.schoolmanage.admin.service.SubjectService;
import cm.schoolmanage.admin.service.TeacherAssignmentService;
import cm.schoolmanage.admin.service.UserStatusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * Controleur REST pour admin-service - endpoints extraits du document de conception
 * (section 5.2, UC23 - Gerer la configuration multi-etablissement) et du chantier de
 * coherence des donnees de reference (classes/matieres/affectations/tarifs - jusqu'ici
 * du texte libre ressaisi independamment dans chaque service).
 */
@RestController
@RequiredArgsConstructor
public class AdminController {

    private final EstablishmentService establishmentService;
    private final UserStatusService userStatusService;
    private final GlobalConfigService globalConfigService;
    private final SchoolClassService schoolClassService;
    private final SubjectService subjectService;
    private final ClassSubjectService classSubjectService;
    private final TeacherAssignmentService teacherAssignmentService;
    private final FeeScheduleService feeScheduleService;

    /**
     * Roles autorises : Admin Systeme
     * Ajoute un nouvel etablissement rattache a la plateforme.
     */
    @PostMapping("/api/v1/admin/establishments")
    public ResponseEntity<EstablishmentResponse> ajouterUnEtablissement(
            @Valid @RequestBody CreateEstablishmentRequest request) {
        var establishment = establishmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(EstablishmentResponse.from(establishment));
    }

    /**
     * Roles autorises : Admin Systeme
     * Liste les etablissements rattaches a la plateforme (tableau de bord).
     */
    @GetMapping("/api/v1/admin/establishments")
    public ResponseEntity<List<EstablishmentResponse>> listerLesEtablissements(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size);
            Page<Establishment> pageResult = establishmentService.findAll(pageable);
            var establishments = pageResult.getContent().stream()
                    .map(EstablishmentResponse::from)
                    .toList();
            return ResponseEntity.ok(establishments);
        }
        var establishments = establishmentService.findAll().stream()
                .map(EstablishmentResponse::from)
                .toList();
        return ResponseEntity.ok(establishments);
    }

    /**
     * Roles autorises : Services internes
     * Consulte un etablissement par id - utilise par les autres services (registration-service...)
     * pour valider une reference avant d'y rattacher une inscription.
     */
    @GetMapping("/api/v1/admin/establishments/{id}")
    public ResponseEntity<EstablishmentResponse> consulterUnEtablissement(@PathVariable UUID id) {
        return ResponseEntity.ok(EstablishmentResponse.from(establishmentService.getById(id)));
    }

    /**
     * Roles autorises : Admin Systeme
     * Active ou suspend un compte utilisateur. Le compte est possede par auth-service
     * (pattern Database per Service) : cet endpoint repercute la decision via un appel REST.
     */
    @PatchMapping("/api/v1/admin/users/{id}/status")
    public ResponseEntity<String> activerSuspendreUnCompte(
            @PathVariable String id, @Valid @RequestBody UpdateUserStatusRequest request) {
        return userStatusService.updateStatus(id, request);
    }

    /**
     * Roles autorises : Admin Systeme
     * Retourne la configuration technique globale de la plateforme (annee scolaire, tarifs).
     */
    @GetMapping("/api/v1/admin/config")
    public ResponseEntity<GlobalConfigResponse> consulterLaConfigurationGlobale() {
        return ResponseEntity.ok(GlobalConfigResponse.from(globalConfigService.getConfig()));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur
     * Cree une classe rattachee a un etablissement (remplace le champ texte libre
     * "className" ressaisi jusqu'ici independamment dans chaque service).
     */
    @PostMapping("/api/v1/admin/classes")
    public ResponseEntity<SchoolClassResponse> creerUneClasse(@Valid @RequestBody CreateSchoolClassRequest request) {
        var schoolClass = schoolClassService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SchoolClassResponse.from(schoolClass));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur / Enseignant
     * Liste les classes, avec filtre optionnel par etablissement.
     */
    @GetMapping("/api/v1/admin/classes")
    public ResponseEntity<List<SchoolClassResponse>> listerLesClasses(
            @RequestParam(required = false) UUID establishmentId) {
        var classes = schoolClassService.findAll(establishmentId).stream()
                .map(SchoolClassResponse::from)
                .toList();
        return ResponseEntity.ok(classes);
    }

    /**
     * Roles autorises : Services internes
     * Consulte une classe par id - utilise par les autres services (registration-service,
     * reportcard-service...) pour valider une reference avant d'y rattacher une donnee.
     */
    @GetMapping("/api/v1/admin/classes/{id}")
    public ResponseEntity<SchoolClassResponse> consulterUneClasse(@PathVariable UUID id) {
        return ResponseEntity.ok(SchoolClassResponse.from(schoolClassService.getById(id)));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur
     * Cree une matiere du catalogue (partage entre tous les etablissements).
     */
    @PostMapping("/api/v1/admin/subjects")
    public ResponseEntity<SubjectResponse> creerUneMatiere(@Valid @RequestBody CreateSubjectRequest request) {
        var subject = subjectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SubjectResponse.from(subject));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur / Enseignant
     * Liste le catalogue des matieres.
     */
    @GetMapping("/api/v1/admin/subjects")
    public ResponseEntity<List<SubjectResponse>> listerLesMatieres() {
        var subjects = subjectService.findAll().stream().map(SubjectResponse::from).toList();
        return ResponseEntity.ok(subjects);
    }

    /**
     * Roles autorises : Services internes
     * Consulte une matiere par id - utilise par reportcard-service pour resoudre le nom
     * affiche sur le bulletin a partir du subjectId envoye par l'enseignant.
     */
    @GetMapping("/api/v1/admin/subjects/{id}")
    public ResponseEntity<SubjectResponse> consulterUneMatiere(@PathVariable UUID id) {
        return ResponseEntity.ok(SubjectResponse.from(subjectService.getById(id)));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur
     * Associe une matiere au programme d'une classe (avec son coefficient par defaut).
     */
    @PostMapping("/api/v1/admin/classes/{classId}/subjects")
    public ResponseEntity<ClassSubjectResponse> affecterUneMatiereAUneClasse(
            @PathVariable UUID classId, @Valid @RequestBody AssignSubjectToClassRequest request) {
        var classSubject = classSubjectService.assign(classId, request);
        var subject = subjectService.getById(classSubject.getSubjectId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ClassSubjectResponse.from(classSubject, subject));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur / Enseignant
     * Liste le programme (matieres + coefficients) d'une classe.
     */
    @GetMapping("/api/v1/admin/classes/{classId}/subjects")
    public ResponseEntity<List<ClassSubjectResponse>> listerLeProgrammeDUneClasse(@PathVariable UUID classId) {
        var programme = classSubjectService.listForClass(classId).stream()
                .map(cs -> ClassSubjectResponse.from(cs, subjectService.getById(cs.getSubjectId())))
                .toList();
        return ResponseEntity.ok(programme);
    }

    /**
     * Roles autorises : Admin Systeme / Directeur
     * Affecte un enseignant a une classe/matiere pour une annee scolaire - source de
     * verite utilisee par reportcard-service/pedagogic-service pour autoriser (ou non)
     * la saisie de notes / la publication de ressources.
     */
    @PostMapping("/api/v1/admin/teacher-assignments")
    public ResponseEntity<TeacherAssignmentResponse> affecterUnEnseignant(
            @Valid @RequestBody CreateTeacherAssignmentRequest request) {
        var assignment = teacherAssignmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(TeacherAssignmentResponse.from(assignment));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur / Enseignant
     * Liste les affectations d'un enseignant pour une annee scolaire, ou d'une classe si
     * teacherId est omis.
     */
    @GetMapping("/api/v1/admin/teacher-assignments")
    public ResponseEntity<List<TeacherAssignmentResponse>> listerLesAffectations(
            @RequestParam(required = false) UUID teacherId,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) UUID classId) {
        var assignments = teacherId != null
                ? teacherAssignmentService.findByTeacher(teacherId, academicYear)
                : teacherAssignmentService.findByClass(classId);
        return ResponseEntity.ok(assignments.stream().map(TeacherAssignmentResponse::from).toList());
    }

    /**
     * Roles autorises : Admin Systeme / Directeur
     * Cree un tarif attendu (frais de scolarite, inscription...) pour un etablissement,
     * optionnellement limite a une classe - remplace le "defaultTuitionFee" global et
     * jamais utilise de GlobalConfig.
     */
    @PostMapping("/api/v1/admin/fee-schedules")
    public ResponseEntity<FeeScheduleResponse> creerUnTarif(@Valid @RequestBody CreateFeeScheduleRequest request) {
        var feeSchedule = feeScheduleService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(FeeScheduleResponse.from(feeSchedule));
    }

    /**
     * Roles autorises : Admin Systeme / Directeur / Parent
     * Liste les tarifs d'un etablissement pour une annee scolaire (utilise par
     * payment-service / le parent pour connaitre le montant attendu).
     */
    @GetMapping("/api/v1/admin/fee-schedules")
    public ResponseEntity<List<FeeScheduleResponse>> listerLesTarifs(
            @RequestParam UUID establishmentId, @RequestParam String academicYear) {
        var feeSchedules = feeScheduleService.findAll(establishmentId, academicYear).stream()
                .map(FeeScheduleResponse::from)
                .toList();
        return ResponseEntity.ok(feeSchedules);
    }

    /**
     * Roles autorises : Services internes
     * Consulte un tarif par id - utilise par payment-service pour valider le montant d'un
     * paiement avant de l'accepter (cf. point n.5 - un parent ne doit plus pouvoir payer un
     * montant invente, decorrele de tout tarif reel).
     */
    @GetMapping("/api/v1/admin/fee-schedules/{id}")
    public ResponseEntity<FeeScheduleResponse> consulterUnTarif(@PathVariable UUID id) {
        return ResponseEntity.ok(FeeScheduleResponse.from(feeScheduleService.getById(id)));
    }
}
