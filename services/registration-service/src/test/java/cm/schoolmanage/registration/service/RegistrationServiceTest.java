package cm.schoolmanage.registration.service;

import cm.schoolmanage.registration.domain.Guardian;
import cm.schoolmanage.registration.domain.Registration;
import cm.schoolmanage.registration.domain.RegistrationType;
import cm.schoolmanage.registration.dto.AssignClassRequest;
import cm.schoolmanage.registration.dto.RegisterStaffRequest;
import cm.schoolmanage.registration.dto.RegisterStudentRequest;
import cm.schoolmanage.registration.dto.SchoolClassReference;
import cm.schoolmanage.registration.exception.RegistrationNotFoundException;
import cm.schoolmanage.registration.repository.GuardianRepository;
import cm.schoolmanage.registration.repository.RegistrationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest {

    @Mock
    private RegistrationRepository registrationRepository;

    @Mock
    private GuardianRepository guardianRepository;

    @Mock
    private DocumentStorageService documentStorageService;

    @Mock
    private AuthAccountClient authAccountClient;

    @Mock
    private AdminServiceClient adminServiceClient;

    @Mock
    private RegistrationEventPublisher eventPublisher;

    private RegistrationService service() {
        return new RegistrationService(registrationRepository, guardianRepository, documentStorageService,
                authAccountClient, adminServiceClient, eventPublisher);
    }

    private void mockGuardianSaveReturnsArgument() {
        when(guardianRepository.save(any())).thenAnswer(invocation -> {
            Guardian g = invocation.getArgument(0);
            if (g.getId() == null) {
                g.setId(UUID.randomUUID());
            }
            return g;
        });
    }

    private SchoolClassReference schoolClass(UUID classId, UUID establishmentId) {
        SchoolClassReference reference = new SchoolClassReference();
        reference.setId(classId);
        reference.setEstablishmentId(establishmentId);
        reference.setName("6eme A");
        return reference;
    }

    @Test
    void registerStudent_creeLeCompteParentEtPublieLEvenement() {
        RegistrationService service = service();
        UUID classId = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        when(adminServiceClient.getSchoolClass(classId)).thenReturn(schoolClass(classId, establishmentId));
        when(registrationRepository.save(any())).thenAnswer(invocation -> {
            Registration r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        mockGuardianSaveReturnsArgument();

        RegisterStudentRequest request = new RegisterStudentRequest();
        request.setFirstName("Jean");
        request.setLastName("Dupont");
        request.setDateOfBirth(LocalDate.of(2014, 3, 10));
        request.setGuardianName("Marie Dupont");
        request.setParentEmail("parent@example.cm");
        request.setClassId(classId);

        Registration registration = service.registerStudent(request);

        assertThat(registration.getType()).isEqualTo(RegistrationType.STUDENT);
        assertThat(registration.getClassId()).isEqualTo(classId);
        assertThat(registration.getEstablishmentId()).isEqualTo(establishmentId);
        assertThat(registration.getGuardians()).hasSize(1);
        assertThat(registration.getGuardians().get(0).getFullName()).isEqualTo("Marie Dupont");
        assertThat(registration.getGuardians().get(0).getEmail()).isEqualTo("parent@example.cm");

        verify(authAccountClient).registerAccount("parent@example.cm", "Marie Dupont", "PARENT");

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(eventPublisher).publishStudentEnrolled(payloadCaptor.capture());
        assertThat(payloadCaptor.getValue())
                .containsEntry("parentEmails", List.of("parent@example.cm"))
                .containsEntry("classId", classId.toString())
                .containsEntry("establishmentId", establishmentId.toString());
    }

    @Test
    void registerStudent_avecDeuxiemeTuteur_creeDeuxComptesEtDeuxGuardians() {
        RegistrationService service = service();
        UUID classId = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        when(adminServiceClient.getSchoolClass(classId)).thenReturn(schoolClass(classId, establishmentId));
        when(registrationRepository.save(any())).thenAnswer(invocation -> {
            Registration r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        mockGuardianSaveReturnsArgument();

        RegisterStudentRequest request = new RegisterStudentRequest();
        request.setFirstName("Jean");
        request.setLastName("Dupont");
        request.setDateOfBirth(LocalDate.of(2014, 3, 10));
        request.setGuardianName("Marie Dupont");
        request.setParentEmail("marie@example.cm");
        request.setSecondGuardianName("Paul Dupont");
        request.setSecondGuardianEmail("paul@example.cm");
        request.setClassId(classId);

        Registration registration = service.registerStudent(request);

        assertThat(registration.getGuardians()).hasSize(2);
        assertThat(registration.getGuardians())
                .extracting(Guardian::getEmail)
                .containsExactlyInAnyOrder("marie@example.cm", "paul@example.cm");

        verify(authAccountClient).registerAccount("marie@example.cm", "Marie Dupont", "PARENT");
        verify(authAccountClient).registerAccount("paul@example.cm", "Paul Dupont", "PARENT");
        verify(authAccountClient, times(2)).registerAccount(any(), any(), any());

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(eventPublisher).publishStudentEnrolled(payloadCaptor.capture());
        @SuppressWarnings("unchecked")
        List<String> parentEmails = (List<String>) payloadCaptor.getValue().get("parentEmails");
        assertThat(parentEmails).containsExactlyInAnyOrder("marie@example.cm", "paul@example.cm");
    }

    @Test
    void registerStudent_deuxiemeTuteurSansEmail_leveUneException() {
        RegistrationService service = service();
        UUID classId = UUID.randomUUID();
        when(adminServiceClient.getSchoolClass(classId)).thenReturn(schoolClass(classId, UUID.randomUUID()));

        RegisterStudentRequest request = new RegisterStudentRequest();
        request.setFirstName("Jean");
        request.setLastName("Dupont");
        request.setDateOfBirth(LocalDate.of(2014, 3, 10));
        request.setGuardianName("Marie Dupont");
        request.setParentEmail("marie@example.cm");
        request.setSecondGuardianName("Paul Dupont");
        request.setClassId(classId);

        assertThatThrownBy(() -> service.registerStudent(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("deuxieme tuteur");

        verify(registrationRepository, never()).save(any());
    }

    @Test
    void registerStudent_classeInconnue_leveUneException() {
        RegistrationService service = service();
        UUID classId = UUID.randomUUID();
        when(adminServiceClient.getSchoolClass(classId))
                .thenThrow(new IllegalArgumentException("Classe introuvable : " + classId));

        RegisterStudentRequest request = new RegisterStudentRequest();
        request.setFirstName("Jean");
        request.setLastName("Dupont");
        request.setDateOfBirth(LocalDate.of(2014, 3, 10));
        request.setGuardianName("Marie Dupont");
        request.setParentEmail("parent@example.cm");
        request.setClassId(classId);

        assertThatThrownBy(() -> service.registerStudent(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Classe introuvable");

        verify(registrationRepository, never()).save(any());
    }

    @Test
    void registerStaff_roleInvalide_leveUneException() {
        RegistrationService service = service();

        RegisterStaffRequest request = new RegisterStaffRequest();
        request.setFirstName("Paul");
        request.setLastName("Biya");
        request.setEmail("paul@example.cm");
        request.setRole("PARENT");
        request.setEstablishmentId(UUID.randomUUID());

        assertThatThrownBy(() -> service.registerStaff(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Role invalide");

        verify(registrationRepository, never()).save(any());
    }

    @Test
    void registerStaff_roleValide_creeLeCompte() {
        RegistrationService service = service();
        UUID establishmentId = UUID.randomUUID();
        when(registrationRepository.save(any())).thenAnswer(invocation -> {
            Registration r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        RegisterStaffRequest request = new RegisterStaffRequest();
        request.setFirstName("Paul");
        request.setLastName("Biya");
        request.setEmail("paul@example.cm");
        request.setRole("enseignant");
        request.setEstablishmentId(establishmentId);

        Registration registration = service.registerStaff(request);

        assertThat(registration.getRole()).isEqualTo("ENSEIGNANT");
        assertThat(registration.getEstablishmentId()).isEqualTo(establishmentId);
        verify(adminServiceClient).verifyEstablishmentExists(establishmentId);
        verify(authAccountClient).registerAccount("paul@example.cm", "Paul Biya", "ENSEIGNANT");
    }

    @Test
    void assignClass_surUneInscriptionStaff_leveUneException() {
        RegistrationService service = service();
        UUID id = UUID.randomUUID();
        Registration staff = Registration.builder()
                .id(id)
                .type(RegistrationType.STAFF)
                .firstName("Paul")
                .lastName("Biya")
                .build();
        when(registrationRepository.findById(id)).thenReturn(Optional.of(staff));

        AssignClassRequest request = new AssignClassRequest();
        request.setClassId(UUID.randomUUID());

        assertThatThrownBy(() -> service.assignClass(id, request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void assignClass_classeDunAutreEtablissement_leveUneException() {
        RegistrationService service = service();
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID newClassId = UUID.randomUUID();
        Registration eleve = Registration.builder()
                .id(id)
                .type(RegistrationType.STUDENT)
                .establishmentId(establishmentId)
                .build();
        when(registrationRepository.findById(id)).thenReturn(Optional.of(eleve));
        when(adminServiceClient.getSchoolClass(newClassId))
                .thenReturn(schoolClass(newClassId, UUID.randomUUID()));

        AssignClassRequest request = new AssignClassRequest();
        request.setClassId(newClassId);

        assertThatThrownBy(() -> service.assignClass(id, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("autre etablissement");
    }

    @Test
    void assignClass_memeEtablissement_reaffecteLaClasse() {
        RegistrationService service = service();
        UUID id = UUID.randomUUID();
        UUID establishmentId = UUID.randomUUID();
        UUID newClassId = UUID.randomUUID();
        Registration eleve = Registration.builder()
                .id(id)
                .type(RegistrationType.STUDENT)
                .establishmentId(establishmentId)
                .build();
        when(registrationRepository.findById(id)).thenReturn(Optional.of(eleve));
        when(adminServiceClient.getSchoolClass(newClassId)).thenReturn(schoolClass(newClassId, establishmentId));
        when(registrationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AssignClassRequest request = new AssignClassRequest();
        request.setClassId(newClassId);

        Registration updated = service.assignClass(id, request);

        assertThat(updated.getClassId()).isEqualTo(newClassId);
    }

    @Test
    void listByParentEmail_retourneSesEnfants() {
        RegistrationService service = service();
        UUID registrationId = UUID.randomUUID();
        Registration enfant = Registration.builder()
                .id(registrationId)
                .type(RegistrationType.STUDENT)
                .firstName("Jean")
                .lastName("Dupont")
                .build();
        Guardian guardian = Guardian.builder()
                .id(UUID.randomUUID())
                .registrationId(registrationId)
                .fullName("Marie Dupont")
                .email("marie.dupont@test.cm")
                .build();
        when(guardianRepository.findByEmail("marie.dupont@test.cm")).thenReturn(List.of(guardian));
        when(registrationRepository.findAllById(List.of(registrationId))).thenReturn(List.of(enfant));
        when(guardianRepository.findByRegistrationId(registrationId)).thenReturn(List.of(guardian));

        List<Registration> result = service.listByParentEmail("marie.dupont@test.cm");

        assertThat(result).containsExactly(enfant);
        assertThat(result.get(0).getGuardians()).containsExactly(guardian);
    }

    @Test
    void listByParentEmail_deuxiemeTuteurRetrouveAussiLEnfant() {
        RegistrationService service = service();
        UUID registrationId = UUID.randomUUID();
        Registration enfant = Registration.builder()
                .id(registrationId)
                .type(RegistrationType.STUDENT)
                .firstName("Jean")
                .lastName("Dupont")
                .build();
        Guardian secondGuardian = Guardian.builder()
                .id(UUID.randomUUID())
                .registrationId(registrationId)
                .fullName("Paul Dupont")
                .email("paul.dupont@test.cm")
                .build();
        when(guardianRepository.findByEmail("paul.dupont@test.cm")).thenReturn(List.of(secondGuardian));
        when(registrationRepository.findAllById(List.of(registrationId))).thenReturn(List.of(enfant));

        List<Registration> result = service.listByParentEmail("paul.dupont@test.cm");

        assertThat(result).containsExactly(enfant);
    }

    @Test
    void listByParentEmail_aucunEnfant_retourneListeVide() {
        RegistrationService service = service();
        when(guardianRepository.findByEmail("inconnu@test.cm")).thenReturn(List.of());

        assertThat(service.listByParentEmail("inconnu@test.cm")).isEmpty();
    }

    @Test
    void listByParentEmail_emailNul_retourneListeVide() {
        RegistrationService service = service();

        assertThat(service.listByParentEmail(null)).isEmpty();
    }

    @Test
    void get_inconnu_leveRegistrationNotFoundException() {
        RegistrationService service = service();
        UUID id = UUID.randomUUID();
        when(registrationRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(id)).isInstanceOf(RegistrationNotFoundException.class);
    }

    @Test
    void listByClassId_retourneLesElevesDeLaClasse() {
        RegistrationService service = service();
        UUID classId = UUID.randomUUID();
        Registration eleve = Registration.builder()
                .id(UUID.randomUUID())
                .type(RegistrationType.STUDENT)
                .firstName("Jean")
                .lastName("Dupont")
                .classId(classId)
                .build();
        when(registrationRepository.findByClassIdAndType(classId, RegistrationType.STUDENT))
                .thenReturn(List.of(eleve));

        List<Registration> result = service.listByClassId(classId);

        assertThat(result).containsExactly(eleve);
    }

    @Test
    void listByClassId_classeInconnue_retourneListeVide() {
        RegistrationService service = service();
        UUID classId = UUID.randomUUID();
        when(registrationRepository.findByClassIdAndType(classId, RegistrationType.STUDENT))
                .thenReturn(List.of());

        assertThat(service.listByClassId(classId)).isEmpty();
    }
}
