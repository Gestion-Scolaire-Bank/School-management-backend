package cm.schoolmanage.registration.controller;

import cm.schoolmanage.registration.domain.Guardian;
import cm.schoolmanage.registration.domain.Registration;
import cm.schoolmanage.registration.domain.RegistrationStatus;
import cm.schoolmanage.registration.domain.RegistrationType;
import cm.schoolmanage.registration.exception.RegistrationNotFoundException;
import cm.schoolmanage.registration.service.RegistrationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RegistrationController.class)
class RegistrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RegistrationService registrationService;

    private Registration studentRegistration(UUID id, UUID establishmentId, UUID classId) {
        Registration registration = Registration.builder()
                .id(id)
                .type(RegistrationType.STUDENT)
                .firstName("Jean")
                .lastName("Dupont")
                .dateOfBirth(LocalDate.of(2014, 3, 10))
                .establishmentId(establishmentId)
                .classId(classId)
                .status(RegistrationStatus.VALIDATED)
                .documents(new HashMap<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        registration.setGuardians(List.of(Guardian.builder()
                .id(UUID.randomUUID())
                .registrationId(id)
                .fullName("Marie Dupont")
                .email("parent@example.cm")
                .build()));
        return registration;
    }

    @Test
    void inscrireUnNouvelEleve_retourne201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(registrationService.registerStudent(any())).thenReturn(studentRegistration(id, establishmentId, classId));

        mockMvc.perform(multipart("/api/v1/registrations/student")
                        .param("firstName", "Jean")
                        .param("lastName", "Dupont")
                        .param("dateOfBirth", "2014-03-10")
                        .param("guardianName", "Marie Dupont")
                        .param("parentEmail", "parent@example.cm")
                        .param("classId", classId.toString()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("STUDENT"))
                .andExpect(jsonPath("$.guardians[0].email").value("parent@example.cm"));
    }

    @Test
    void inscrireUnNouvelEleve_sansPrenom_retourne400() throws Exception {
        mockMvc.perform(multipart("/api/v1/registrations/student")
                        .param("lastName", "Dupont")
                        .param("dateOfBirth", "2014-03-10")
                        .param("guardianName", "Marie Dupont")
                        .param("parentEmail", "parent@example.cm")
                        .param("classId", UUID.randomUUID().toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void inscrireUnNouvelEleve_sansClasse_retourne400() throws Exception {
        mockMvc.perform(multipart("/api/v1/registrations/student")
                        .param("firstName", "Jean")
                        .param("lastName", "Dupont")
                        .param("dateOfBirth", "2014-03-10")
                        .param("guardianName", "Marie Dupont")
                        .param("parentEmail", "parent@example.cm"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void inscrireUnNouvelEleve_avecDeuxiemeTuteur_retourne201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(registrationService.registerStudent(any())).thenReturn(studentRegistration(id, establishmentId, classId));

        mockMvc.perform(multipart("/api/v1/registrations/student")
                        .param("firstName", "Jean")
                        .param("lastName", "Dupont")
                        .param("dateOfBirth", "2014-03-10")
                        .param("guardianName", "Marie Dupont")
                        .param("parentEmail", "marie@example.cm")
                        .param("secondGuardianName", "Paul Dupont")
                        .param("secondGuardianEmail", "paul@example.cm")
                        .param("classId", classId.toString()))
                .andExpect(status().isCreated());
    }

    @Test
    void inscrireUnNouvelEleve_avecPhoto_retourne201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(registrationService.registerStudent(any())).thenReturn(studentRegistration(id, establishmentId, classId));

        MockMultipartFile photo = new MockMultipartFile("photo", "photo.jpg", "image/jpeg", "fake".getBytes());

        mockMvc.perform(multipart("/api/v1/registrations/student")
                        .file(photo)
                        .param("firstName", "Jean")
                        .param("lastName", "Dupont")
                        .param("dateOfBirth", "2014-03-10")
                        .param("guardianName", "Marie Dupont")
                        .param("parentEmail", "parent@example.cm")
                        .param("classId", classId.toString()))
                .andExpect(status().isCreated());
    }

    @Test
    void inscrireUnMembreDuPersonnel_retourne201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        Registration staff = Registration.builder()
                .id(id)
                .type(RegistrationType.STAFF)
                .firstName("Paul")
                .lastName("Biya")
                .email("paul.biya@example.cm")
                .role("ENSEIGNANT")
                .establishmentId(establishmentId)
                .status(RegistrationStatus.VALIDATED)
                .documents(new HashMap<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        when(registrationService.registerStaff(any())).thenReturn(staff);

        mockMvc.perform(multipart("/api/v1/registrations/staff")
                        .param("firstName", "Paul")
                        .param("lastName", "Biya")
                        .param("email", "paul.biya@example.cm")
                        .param("role", "ENSEIGNANT")
                        .param("establishmentId", establishmentId.toString()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("STAFF"))
                .andExpect(jsonPath("$.role").value("ENSEIGNANT"));
    }

    @Test
    void inscrireUnMembreDuPersonnel_sansEtablissement_retourne400() throws Exception {
        mockMvc.perform(multipart("/api/v1/registrations/staff")
                        .param("firstName", "Paul")
                        .param("lastName", "Biya")
                        .param("email", "paul.biya@example.cm")
                        .param("role", "ENSEIGNANT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listerMesEnfants_retourne200AvecLaListe() throws Exception {
        UUID id = UUID.randomUUID();
        when(registrationService.listByParentEmail("marie.dupont@test.cm"))
                .thenReturn(List.of(studentRegistration(id, UUID.randomUUID(), UUID.randomUUID())));

        mockMvc.perform(get("/api/v1/registrations/children").header("X-User-Email", "marie.dupont@test.cm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].firstName").value("Jean"));
    }

    @Test
    void listerMesEnfants_sansEnTeteEmail_retourne200AvecListeVide() throws Exception {
        when(registrationService.listByParentEmail(null)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/registrations/children"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void consulterUnDossierDInscription_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        when(registrationService.get(id)).thenReturn(studentRegistration(id, UUID.randomUUID(), UUID.randomUUID()));

        mockMvc.perform(get("/api/v1/registrations/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Jean"));
    }

    @Test
    void consulterUnDossierDInscription_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(registrationService.get(id)).thenThrow(new RegistrationNotFoundException(id));

        mockMvc.perform(get("/api/v1/registrations/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void affecterModifierLaClasse_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID newClassId = UUID.randomUUID();
        Registration updated = studentRegistration(id, establishmentId, newClassId);
        when(registrationService.assignClass(any(), any())).thenReturn(updated);

        mockMvc.perform(patch("/api/v1/registrations/{id}/class", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("classId", newClassId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classId").value(newClassId.toString()));
    }

    @Test
    void affecterModifierLaClasse_sansClasse_retourne400() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(patch("/api/v1/registrations/{id}/class", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listerLesElevesDUneClasse_retourne200AvecLaListe() throws Exception {
        UUID id = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(registrationService.listByClassId(classId))
                .thenReturn(List.of(studentRegistration(id, UUID.randomUUID(), classId)));

        mockMvc.perform(get("/api/v1/registrations/class/{classId}", classId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].firstName").value("Jean"))
                .andExpect(jsonPath("$[0].classId").value(classId.toString()));
    }

    @Test
    void listerLesElevesDUneClasse_classeInconnue_retourne200AvecListeVide() throws Exception {
        UUID classId = UUID.randomUUID();
        when(registrationService.listByClassId(classId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/registrations/class/{classId}", classId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
