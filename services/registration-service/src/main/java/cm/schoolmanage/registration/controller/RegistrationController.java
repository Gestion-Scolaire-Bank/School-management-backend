package cm.schoolmanage.registration.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Squelette de controleur REST pour registration-service - endpoints extraits du document de
 * conception (section 5.2). Chaque methode est un stub 501 Not Implemented a completer
 * par l'equipe en charge de ce service.
 */
@RestController
public class RegistrationController {

    /**
     * Roles autorises : Admin
     * TODO : Inscrire un nouvel eleve (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/registrations/student")
    public ResponseEntity<?> inscrireUnNouvelEleve() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin
     * TODO : Inscrire un membre du personnel (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/registrations/staff")
    public ResponseEntity<?> inscrireUnMembreDuPersonnel() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin
     * TODO : Consulter un dossier d'inscription (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/v1/registrations/{id}")
    public ResponseEntity<?> consulterUnDossierDInscription(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin
     * TODO : Affecter / modifier la classe (cf. document de conception - section 5.2)
     */
    @PatchMapping("/api/v1/registrations/{id}/class")
    public ResponseEntity<?> affecterModifierLaClasse(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

}
