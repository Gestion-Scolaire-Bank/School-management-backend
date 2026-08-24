package cm.schoolmanage.registration.service;

import cm.schoolmanage.registration.domain.Guardian;
import cm.schoolmanage.registration.domain.Registration;
import cm.schoolmanage.registration.domain.RegistrationType;
import cm.schoolmanage.registration.dto.AssignClassRequest;
import cm.schoolmanage.registration.dto.RegisterStaffRequest;
import cm.schoolmanage.registration.dto.RegisterStudentRequest;
import cm.schoolmanage.registration.dto.UpdateStudentInfoRequest;
import cm.schoolmanage.registration.dto.SchoolClassReference;
import cm.schoolmanage.registration.exception.RegistrationNotFoundException;
import cm.schoolmanage.registration.repository.GuardianRepository;
import cm.schoolmanage.registration.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private static final Set<String> STAFF_ROLES = Set.of("ENSEIGNANT", "ADMINISTRATEUR", "DIRECTEUR");

    private final RegistrationRepository registrationRepository;
    private final GuardianRepository guardianRepository;
    private final DocumentStorageService documentStorageService;
    private final AuthAccountClient authAccountClient;
    private final AdminServiceClient adminServiceClient;
    private final RegistrationEventPublisher eventPublisher;

    public Registration registerStudent(RegisterStudentRequest request) {
        SchoolClassReference schoolClass = adminServiceClient.getSchoolClass(request.getClassId());

        if ((request.getSecondGuardianName() != null) != (request.getSecondGuardianEmail() != null)) {
            throw new IllegalArgumentException(
                    "Le nom et l'email du deuxieme tuteur doivent etre fournis ensemble, ou aucun des deux");
        }

        Map<String, String> documents = new HashMap<>();
        uploadIfPresent(documents, "photo", request.getPhoto());
        uploadIfPresent(documents, "birthCertificate", request.getBirthCertificate());

        Registration registration = Registration.builder()
                .type(RegistrationType.STUDENT)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dateOfBirth(request.getDateOfBirth())
                .establishmentId(schoolClass.getEstablishmentId())
                .classId(schoolClass.getId())
                .documents(documents)
                .build();

        registration = registrationRepository.save(registration);

        List<Guardian> guardians = new ArrayList<>();
        guardians.add(saveGuardian(
                registration.getId(), request.getGuardianName(), request.getParentEmail(), request.getParentPhone()));
        if (request.getSecondGuardianEmail() != null) {
            guardians.add(saveGuardian(registration.getId(), request.getSecondGuardianName(),
                    request.getSecondGuardianEmail(), request.getSecondGuardianPhone()));
        }
        for (Guardian guardian : guardians) {
            authAccountClient.registerAccount(guardian.getEmail(), guardian.getFullName(), "PARENT");
        }
        registration.setGuardians(guardians);

        Map<String, Object> eventPayload = new HashMap<>();
        eventPayload.put("studentId", registration.getId().toString());
        eventPayload.put("photo", documents.get("photo"));
        eventPayload.put("parentEmails", guardians.stream().map(Guardian::getEmail).toList());
        eventPayload.put("classId", registration.getClassId().toString());
        eventPayload.put("establishmentId", registration.getEstablishmentId().toString());
        // "fullName" n'est pas dans le contrat documente au depart ({studentId, photo}), mais
        // schoolid-service en a besoin pour generer la carte (nom affiche) - ajoute pour que la
        // generation automatique fonctionne reellement de bout en bout.
        eventPayload.put("fullName", registration.getFirstName() + " " + registration.getLastName());
        eventPublisher.publishStudentEnrolled(eventPayload);

        return registration;
    }

    private Guardian saveGuardian(UUID registrationId, String fullName, String email, String phone) {
        return guardianRepository.save(Guardian.builder()
                .registrationId(registrationId)
                .fullName(fullName)
                .email(email)
                .phone(phone)
                .build());
    }

    public Registration registerStaff(RegisterStaffRequest request) {
        String role = request.getRole().toUpperCase();
        if (!STAFF_ROLES.contains(role)) {
            throw new IllegalArgumentException(
                    "Role invalide : " + request.getRole() + " (attendu : " + STAFF_ROLES + ")");
        }

        adminServiceClient.verifyEstablishmentExists(request.getEstablishmentId());

        Map<String, String> documents = new HashMap<>();
        uploadIfPresent(documents, "cv", request.getCv());
        uploadIfPresent(documents, "diploma", request.getDiploma());

        Registration registration = Registration.builder()
                .type(RegistrationType.STAFF)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(role)
                .establishmentId(request.getEstablishmentId())
                .documents(documents)
                .build();

        registration = registrationRepository.save(registration);

        authAccountClient.registerAccount(
                registration.getEmail(), request.getFirstName() + " " + request.getLastName(), role);

        return registration;
    }

    public Registration get(UUID id) {
        Registration registration = registrationRepository.findById(id)
                .orElseThrow(() -> new RegistrationNotFoundException(id));
        attachGuardians(registration);
        return registration;
    }

    public List<Registration> listByClassId(UUID classId) {
        List<Registration> registrations = registrationRepository.findByClassIdAndType(classId, RegistrationType.STUDENT);
        registrations.forEach(this::attachGuardians);
        return registrations;
    }

    /**
     * Liste les enfants d'un parent, par email - l'email vient de X-User-Email (propage par
     * le Gateway a partir du JWT), jamais d'un parametre client, pour qu'un parent ne puisse
     * pas consulter les enfants d'un autre en changeant un parametre de requete. Passe par
     * Guardian (et non plus Registration.email) : un eleve peut avoir plusieurs tuteurs, chacun
     * doit pouvoir retrouver l'enfant avec son propre email.
     */
    public List<Registration> listByParentEmail(String parentEmail) {
        if (parentEmail == null) {
            return List.of();
        }
        List<UUID> registrationIds = guardianRepository.findByEmail(parentEmail).stream()
                .map(Guardian::getRegistrationId)
                .toList();
        if (registrationIds.isEmpty()) {
            return List.of();
        }
        List<Registration> registrations = registrationRepository.findAllById(registrationIds);
        registrations.forEach(this::attachGuardians);
        return registrations;
    }

    public Registration assignClass(UUID id, AssignClassRequest request) {
        Registration registration = get(id);
        if (registration.getType() != RegistrationType.STUDENT) {
            throw new IllegalArgumentException("L'affectation de classe ne s'applique qu'aux eleves");
        }

        SchoolClassReference schoolClass = adminServiceClient.getSchoolClass(request.getClassId());
        if (!schoolClass.getEstablishmentId().equals(registration.getEstablishmentId())) {
            throw new IllegalArgumentException(
                    "Cette classe appartient a un autre etablissement que celui de l'eleve");
        }

        registration.setClassId(schoolClass.getId());
        Registration saved = registrationRepository.save(registration);
        attachGuardians(saved);
        return saved;
    }

    /** Le champ Guardian n'est pas persiste sur Registration (@Transient) : il doit etre
     * rattache explicitement a chaque lecture, et re-rattache apres tout save() (JPA merge ne
     * copie pas les champs transients sur l'instance retournee). */
    private void attachGuardians(Registration registration) {
        if (registration.getType() == RegistrationType.STUDENT) {
            registration.setGuardians(guardianRepository.findByRegistrationId(registration.getId()));
        }
    }

    private void uploadIfPresent(Map<String, String> documents, String type, MultipartFile file) {
        if (file != null && !file.isEmpty()) {
            documents.put(type, documentStorageService.upload(file, type));
        }
    }

    public Registration updatePhoto(UUID id, MultipartFile photo) {
        Registration registration = get(id);
        if (registration.getType() != RegistrationType.STUDENT) {
            throw new IllegalArgumentException("La mise a jour de photo ne s'applique qu'aux eleves");
        }
        if (photo != null && !photo.isEmpty()) {
            registration.getDocuments().put("photo", documentStorageService.upload(photo, "photo"));
            registration = registrationRepository.save(registration);
            attachGuardians(registration);
        }
        return registration;
    }

    public Registration updateStudentInfo(UUID id, UpdateStudentInfoRequest request) {
        Registration registration = get(id);
        if (registration.getType() != RegistrationType.STUDENT) {
            throw new IllegalArgumentException("La modification d'informations ne s'applique qu'aux eleves");
        }
        registration.setFirstName(request.getFirstName());
        registration.setLastName(request.getLastName());
        registration.setDateOfBirth(request.getDateOfBirth());
        registration = registrationRepository.save(registration);

        List<Guardian> guardians = guardianRepository.findByRegistrationId(id);
        if (!guardians.isEmpty()) {
            Guardian primary = guardians.get(0);
            primary.setFullName(request.getGuardianName());
            primary.setEmail(request.getParentEmail());
            primary.setPhone(request.getParentPhone());
            guardianRepository.save(primary);
        } else {
            guardianRepository.save(Guardian.builder()
                    .registrationId(id)
                    .fullName(request.getGuardianName())
                    .email(request.getParentEmail())
                    .phone(request.getParentPhone())
                    .build());
        }

        attachGuardians(registration);
        return registration;
    }
}
