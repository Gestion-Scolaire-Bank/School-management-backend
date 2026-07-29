package cm.schoolmanage.admin.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Squelette de controleur REST pour admin-service - endpoints extraits du document de
 * conception (section 5.2). Chaque methode est un stub 501 Not Implemented a completer
 * par l'equipe en charge de ce service.
 */
@RestController
public class AdminController {

    /**
     * Roles autorises : Admin Systeme
     * TODO : Ajouter un etablissement (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/admin/establishments")
    public ResponseEntity<?> ajouterUnEtablissement() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin Systeme
     * TODO : Activer / suspendre un compte (cf. document de conception - section 5.2)
     */
    @PatchMapping("/api/v1/admin/users/{id}/status")
    public ResponseEntity<?> activerSuspendreUnCompte(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin Systeme
     * TODO : Consulter la configuration globale (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/v1/admin/config")
    public ResponseEntity<?> consulterLaConfigurationGlobale() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

}
