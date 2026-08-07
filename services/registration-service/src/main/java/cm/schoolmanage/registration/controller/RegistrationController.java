package cm.schoolmanage.registration.controller;

import cm.schoolmanage.registration.dto.AssignClassRequest;
import cm.schoolmanage.registration.dto.RegisterStaffRequest;
import cm.schoolmanage.registration.dto.RegisterStudentRequest;
import cm.schoolmanage.registration.dto.RegistrationResponse;
import cm.schoolmanage.registration.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Controleur REST pour registration-service - endpoints extraits du document de conception
 * (section 5.2, UC6 - Inscrire un eleve/staff, UC8 - Affecter une classe).
 */
@RestController
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    /**
     * Roles autorises : Admin
     */
    @PostMapping(value = "/api/v1/registrations/student", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RegistrationResponse> inscrireUnNouvelEleve(
            @Valid @ModelAttribute RegisterStudentRequest request) {
        var registration = registrationService.registerStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(RegistrationResponse.from(registration));
    }

    /**
     * Roles autorises : Admin
     */
    @PostMapping(value = "/api/v1/registrations/staff", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RegistrationResponse> inscrireUnMembreDuPersonnel(
            @Valid @ModelAttribute RegisterStaffRequest request) {
        var registration = registrationService.registerStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(RegistrationResponse.from(registration));
    }

    /**
     * Roles autorises : Parent
     * Liste les enfants du parent connecte (identifie par le JWT, pas par un parametre) -
     * permet au parent de choisir son enfant par nom au lieu de devoir connaitre son
     * identifiant de dossier (cf. proposition de coherence - point n.6).
     */
    @GetMapping("/api/v1/registrations/children")
    public ResponseEntity<List<RegistrationResponse>> listerMesEnfants(
            @RequestHeader(value = "X-User-Email", required = false) String parentEmail) {
        var registrations = registrationService.listByParentEmail(parentEmail);
        return ResponseEntity.ok(registrations.stream().map(RegistrationResponse::from).toList());
    }

    /**
     * Roles autorises : Admin
     */
    @GetMapping("/api/v1/registrations/{id}")
    public ResponseEntity<RegistrationResponse> consulterUnDossierDInscription(@PathVariable UUID id) {
        return ResponseEntity.ok(RegistrationResponse.from(registrationService.get(id)));
    }

    /**
     * Roles autorises : Admin
     */
    @GetMapping("/api/v1/registrations/class/{classId}")
    public ResponseEntity<List<RegistrationResponse>> listerLesElevesDUneClasse(@PathVariable UUID classId) {
        var registrations = registrationService.listByClassId(classId);
        return ResponseEntity.ok(registrations.stream().map(RegistrationResponse::from).toList());
    }

    /**
     * Roles autorises : Admin
     */
    @PatchMapping("/api/v1/registrations/{id}/class")
    public ResponseEntity<RegistrationResponse> affecterModifierLaClasse(
            @PathVariable UUID id, @Valid @RequestBody AssignClassRequest request) {
        var registration = registrationService.assignClass(id, request);
        return ResponseEntity.ok(RegistrationResponse.from(registration));
    }
}
