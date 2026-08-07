package cm.schoolmanage.admin.controller;

import cm.schoolmanage.admin.domain.ClassSubject;
import cm.schoolmanage.admin.domain.Establishment;
import cm.schoolmanage.admin.domain.EstablishmentStatus;
import cm.schoolmanage.admin.domain.FeeSchedule;
import cm.schoolmanage.admin.domain.GlobalConfig;
import cm.schoolmanage.admin.domain.SchoolClass;
import cm.schoolmanage.admin.domain.SchoolClassStatus;
import cm.schoolmanage.admin.domain.Subject;
import cm.schoolmanage.admin.domain.TeacherAssignment;
import cm.schoolmanage.admin.dto.AccountStatus;
import cm.schoolmanage.admin.exception.DuplicateResourceException;
import cm.schoolmanage.admin.exception.ResourceNotFoundException;
import cm.schoolmanage.admin.service.ClassSubjectService;
import cm.schoolmanage.admin.service.EstablishmentService;
import cm.schoolmanage.admin.service.FeeScheduleService;
import cm.schoolmanage.admin.service.GlobalConfigService;
import cm.schoolmanage.admin.service.SchoolClassService;
import cm.schoolmanage.admin.service.SubjectService;
import cm.schoolmanage.admin.service.TeacherAssignmentService;
import cm.schoolmanage.admin.service.UserStatusService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EstablishmentService establishmentService;

    @MockBean
    private UserStatusService userStatusService;

    @MockBean
    private GlobalConfigService globalConfigService;

    @MockBean
    private SchoolClassService schoolClassService;

    @MockBean
    private SubjectService subjectService;

    @MockBean
    private ClassSubjectService classSubjectService;

    @MockBean
    private TeacherAssignmentService teacherAssignmentService;

    @MockBean
    private FeeScheduleService feeScheduleService;

    @Test
    void ajouterUnEtablissement_retourne201() throws Exception {
        Establishment saved = Establishment.builder()
                .id(UUID.randomUUID())
                .name("Lycee de Yaounde")
                .status(EstablishmentStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(establishmentService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/v1/admin/establishments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Lycee de Yaounde"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Lycee de Yaounde"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void ajouterUnEtablissement_sansNom_retourne400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/establishments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("city", "Douala"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listerLesEtablissements_retourneLaListe() throws Exception {
        Establishment saved = Establishment.builder()
                .id(UUID.randomUUID())
                .name("Lycee de Yaounde")
                .city("Yaounde")
                .status(EstablishmentStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(establishmentService.findAll()).thenReturn(List.of(saved));

        mockMvc.perform(get("/api/v1/admin/establishments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Lycee de Yaounde"))
                .andExpect(jsonPath("$[0].city").value("Yaounde"));
    }

    @Test
    void consulterUnEtablissement_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        Establishment saved = Establishment.builder()
                .id(id)
                .name("Lycee de Yaounde")
                .status(EstablishmentStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(establishmentService.getById(id)).thenReturn(saved);

        mockMvc.perform(get("/api/v1/admin/establishments/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Lycee de Yaounde"));
    }

    @Test
    void consulterUnEtablissement_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(establishmentService.getById(id)).thenThrow(new ResourceNotFoundException("Etablissement introuvable"));

        mockMvc.perform(get("/api/v1/admin/establishments/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void listerLesEtablissements_listeVide_retourneTableauVide() throws Exception {
        when(establishmentService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/establishments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void activerSuspendreUnCompte_repercuteVersAuthService() throws Exception {
        when(userStatusService.updateStatus(anyString(), any()))
                .thenReturn(ResponseEntity.ok("{\"status\":\"SUSPENDED\"}"));

        mockMvc.perform(patch("/api/v1/admin/users/{id}/status", "user-42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", AccountStatus.SUSPENDED))))
                .andExpect(status().isOk());
    }

    @Test
    void consulterLaConfigurationGlobale_retourneLaConfig() throws Exception {
        GlobalConfig config = GlobalConfig.builder()
                .id(GlobalConfig.SINGLETON_ID)
                .currentAcademicYear("2025-2026")
                .termStartDate(LocalDate.of(2025, 9, 1))
                .termEndDate(LocalDate.of(2026, 6, 30))
                .currency("XAF")
                .defaultTuitionFee(BigDecimal.valueOf(150000))
                .updatedAt(Instant.now())
                .build();
        when(globalConfigService.getConfig()).thenReturn(config);

        mockMvc.perform(get("/api/v1/admin/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentAcademicYear").value("2025-2026"))
                .andExpect(jsonPath("$.currency").value("XAF"));
    }

    @Test
    void creerUneClasse_retourne201() throws Exception {
        UUID establishmentId = UUID.randomUUID();
        SchoolClass saved = SchoolClass.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .name("6eme A")
                .level("6eme")
                .academicYear("2025-2026")
                .status(SchoolClassStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(schoolClassService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/v1/admin/classes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", establishmentId,
                                "name", "6eme A",
                                "level", "6eme",
                                "academicYear", "2025-2026"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("6eme A"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void creerUneClasse_etablissementIntrouvable_retourne404() throws Exception {
        when(schoolClassService.create(any())).thenThrow(new ResourceNotFoundException("Etablissement introuvable"));

        mockMvc.perform(post("/api/v1/admin/classes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", UUID.randomUUID(),
                                "name", "6eme A",
                                "level", "6eme",
                                "academicYear", "2025-2026"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void creerUneClasse_doublon_retourne409() throws Exception {
        when(schoolClassService.create(any())).thenThrow(new DuplicateResourceException("La classe existe deja"));

        mockMvc.perform(post("/api/v1/admin/classes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", UUID.randomUUID(),
                                "name", "6eme A",
                                "level", "6eme",
                                "academicYear", "2025-2026"))))
                .andExpect(status().isConflict());
    }

    @Test
    void creerUneClasse_sansNom_retourne400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/classes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", UUID.randomUUID(),
                                "level", "6eme",
                                "academicYear", "2025-2026"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listerLesClasses_retourneLaListe() throws Exception {
        SchoolClass saved = SchoolClass.builder()
                .id(UUID.randomUUID())
                .establishmentId(UUID.randomUUID())
                .name("CM2")
                .level("CM2")
                .academicYear("2025-2026")
                .status(SchoolClassStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(schoolClassService.findAll(any())).thenReturn(List.of(saved));

        mockMvc.perform(get("/api/v1/admin/classes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("CM2"));
    }

    @Test
    void consulterUneClasse_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        SchoolClass saved = SchoolClass.builder()
                .id(id)
                .establishmentId(UUID.randomUUID())
                .name("6eme A")
                .level("6eme")
                .academicYear("2025-2026")
                .status(SchoolClassStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(schoolClassService.getById(id)).thenReturn(saved);

        mockMvc.perform(get("/api/v1/admin/classes/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("6eme A"));
    }

    @Test
    void consulterUneClasse_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(schoolClassService.getById(id)).thenThrow(new ResourceNotFoundException("Classe introuvable"));

        mockMvc.perform(get("/api/v1/admin/classes/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void creerUneMatiere_retourne201() throws Exception {
        Subject saved = Subject.builder()
                .id(UUID.randomUUID())
                .name("Mathematiques")
                .code("MATH")
                .createdAt(Instant.now())
                .build();
        when(subjectService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/v1/admin/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Mathematiques", "code", "MATH"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("MATH"));
    }

    @Test
    void creerUneMatiere_doublon_retourne409() throws Exception {
        when(subjectService.create(any())).thenThrow(new DuplicateResourceException("Code deja utilise"));

        mockMvc.perform(post("/api/v1/admin/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Mathematiques", "code", "MATH"))))
                .andExpect(status().isConflict());
    }

    @Test
    void listerLesMatieres_retourneLaListe() throws Exception {
        Subject saved = Subject.builder().id(UUID.randomUUID()).name("Francais").code("FR").createdAt(Instant.now()).build();
        when(subjectService.findAll()).thenReturn(List.of(saved));

        mockMvc.perform(get("/api/v1/admin/subjects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("FR"));
    }

    @Test
    void consulterUneMatiere_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        Subject saved = Subject.builder().id(id).name("Mathematiques").code("MATH").createdAt(Instant.now()).build();
        when(subjectService.getById(id)).thenReturn(saved);

        mockMvc.perform(get("/api/v1/admin/subjects/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("MATH"));
    }

    @Test
    void consulterUneMatiere_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(subjectService.getById(id)).thenThrow(new ResourceNotFoundException("Matiere introuvable"));

        mockMvc.perform(get("/api/v1/admin/subjects/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void affecterUneMatiereAUneClasse_retourne201() throws Exception {
        UUID classId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        ClassSubject saved = ClassSubject.builder()
                .id(UUID.randomUUID())
                .classId(classId)
                .subjectId(subjectId)
                .defaultCoefficient(2.0)
                .createdAt(Instant.now())
                .build();
        Subject subject = Subject.builder().id(subjectId).name("Mathematiques").code("MATH").createdAt(Instant.now()).build();
        when(classSubjectService.assign(any(), any())).thenReturn(saved);
        when(subjectService.getById(subjectId)).thenReturn(subject);

        mockMvc.perform(post("/api/v1/admin/classes/{classId}/subjects", classId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("subjectId", subjectId, "defaultCoefficient", 2.0))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subjectCode").value("MATH"))
                .andExpect(jsonPath("$.defaultCoefficient").value(2.0));
    }

    @Test
    void listerLeProgrammeDUneClasse_retourneLaListe() throws Exception {
        UUID classId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        ClassSubject classSubject = ClassSubject.builder()
                .id(UUID.randomUUID())
                .classId(classId)
                .subjectId(subjectId)
                .defaultCoefficient(1.0)
                .createdAt(Instant.now())
                .build();
        Subject subject = Subject.builder().id(subjectId).name("Francais").code("FR").createdAt(Instant.now()).build();
        when(classSubjectService.listForClass(classId)).thenReturn(List.of(classSubject));
        when(subjectService.getById(subjectId)).thenReturn(subject);

        mockMvc.perform(get("/api/v1/admin/classes/{classId}/subjects", classId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subjectName").value("Francais"));
    }

    @Test
    void affecterUnEnseignant_retourne201() throws Exception {
        TeacherAssignment saved = TeacherAssignment.builder()
                .id(UUID.randomUUID())
                .establishmentId(UUID.randomUUID())
                .teacherId(UUID.randomUUID())
                .classId(UUID.randomUUID())
                .subjectId(UUID.randomUUID())
                .academicYear("2025-2026")
                .createdAt(Instant.now())
                .build();
        when(teacherAssignmentService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/v1/admin/teacher-assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", saved.getEstablishmentId(),
                                "teacherId", saved.getTeacherId(),
                                "classId", saved.getClassId(),
                                "subjectId", saved.getSubjectId(),
                                "academicYear", "2025-2026"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.academicYear").value("2025-2026"));
    }

    @Test
    void affecterUnEnseignant_dejaAffecte_retourne409() throws Exception {
        when(teacherAssignmentService.create(any()))
                .thenThrow(new DuplicateResourceException("Deja affecte"));

        mockMvc.perform(post("/api/v1/admin/teacher-assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", UUID.randomUUID(),
                                "teacherId", UUID.randomUUID(),
                                "classId", UUID.randomUUID(),
                                "subjectId", UUID.randomUUID(),
                                "academicYear", "2025-2026"))))
                .andExpect(status().isConflict());
    }

    @Test
    void listerLesAffectations_parEnseignant_retourneLaListe() throws Exception {
        UUID teacherId = UUID.randomUUID();
        TeacherAssignment saved = TeacherAssignment.builder()
                .id(UUID.randomUUID())
                .establishmentId(UUID.randomUUID())
                .teacherId(teacherId)
                .classId(UUID.randomUUID())
                .subjectId(UUID.randomUUID())
                .academicYear("2025-2026")
                .createdAt(Instant.now())
                .build();
        when(teacherAssignmentService.findByTeacher(teacherId, "2025-2026")).thenReturn(List.of(saved));

        mockMvc.perform(get("/api/v1/admin/teacher-assignments")
                        .param("teacherId", teacherId.toString())
                        .param("academicYear", "2025-2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].teacherId").value(teacherId.toString()));
    }

    @Test
    void creerUnTarif_retourne201() throws Exception {
        UUID establishmentId = UUID.randomUUID();
        FeeSchedule saved = FeeSchedule.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .academicYear("2025-2026")
                .label("Trimestre 1")
                .amount(BigDecimal.valueOf(150000))
                .currency("XAF")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(feeScheduleService.create(any())).thenReturn(saved);

        mockMvc.perform(post("/api/v1/admin/fee-schedules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", establishmentId,
                                "academicYear", "2025-2026",
                                "label", "Trimestre 1",
                                "amount", 150000))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Trimestre 1"))
                .andExpect(jsonPath("$.amount").value(150000));
    }

    @Test
    void creerUnTarif_montantNegatif_retourne400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/fee-schedules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", UUID.randomUUID(),
                                "academicYear", "2025-2026",
                                "label", "Trimestre 1",
                                "amount", -100))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void creerUnTarif_doublon_retourne409() throws Exception {
        when(feeScheduleService.create(any())).thenThrow(new DuplicateResourceException("Un tarif existe deja"));

        mockMvc.perform(post("/api/v1/admin/fee-schedules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "establishmentId", UUID.randomUUID(),
                                "academicYear", "2025-2026",
                                "label", "Trimestre 1",
                                "amount", 150000))))
                .andExpect(status().isConflict());
    }

    @Test
    void consulterUnTarif_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        FeeSchedule saved = FeeSchedule.builder()
                .id(id)
                .establishmentId(UUID.randomUUID())
                .academicYear("2025-2026")
                .label("Trimestre 1")
                .amount(BigDecimal.valueOf(150000))
                .currency("XAF")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(feeScheduleService.getById(id)).thenReturn(saved);

        mockMvc.perform(get("/api/v1/admin/fee-schedules/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Trimestre 1"))
                .andExpect(jsonPath("$.amount").value(150000));
    }

    @Test
    void consulterUnTarif_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(feeScheduleService.getById(id)).thenThrow(new ResourceNotFoundException("Tarif introuvable"));

        mockMvc.perform(get("/api/v1/admin/fee-schedules/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void listerLesTarifs_retourneLaListe() throws Exception {
        UUID establishmentId = UUID.randomUUID();
        FeeSchedule saved = FeeSchedule.builder()
                .id(UUID.randomUUID())
                .establishmentId(establishmentId)
                .academicYear("2025-2026")
                .label("Inscription")
                .amount(BigDecimal.valueOf(25000))
                .currency("XAF")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(feeScheduleService.findAll(establishmentId, "2025-2026")).thenReturn(List.of(saved));

        mockMvc.perform(get("/api/v1/admin/fee-schedules")
                        .param("establishmentId", establishmentId.toString())
                        .param("academicYear", "2025-2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Inscription"));
    }
}
