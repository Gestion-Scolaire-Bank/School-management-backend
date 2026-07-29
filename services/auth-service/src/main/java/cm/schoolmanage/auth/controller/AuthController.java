package cm.schoolmanage.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Squelette de controleur REST pour auth-service - endpoints extraits du document de
 * conception (section 5.2). Chaque methode est un stub 501 Not Implemented a completer
 * par l'equipe en charge de ce service.
 */
@RestController
public class AuthController {

    /**
     * Roles autorises : Public
     * TODO : Creer un nouveau compte (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/auth/register")
    public ResponseEntity<?> creerUnNouveauCompte() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Public
     * TODO : Authentifier et retourner les tokens JWT (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<?> authentifierEtRetournerLesTokensJwt() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Authentifie
     * TODO : Invalider le token (blacklist Redis) (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<?> invaliderLeTokenBlacklistRedis() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Authentifie
     * TODO : Renouveler l'access token (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/auth/refresh")
    public ResponseEntity<?> renouvelerLAccessToken() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Authentifie
     * TODO : Retourner le profil de l'utilisateur connecte (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/auth/me")
    public ResponseEntity<?> retournerLeProfilDeLUtilisateurConnecte() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Services internes
     * TODO : Valider un JWT (usage interne) (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/auth/validate-token")
    public ResponseEntity<?> validerUnJwtUsageInterne() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin
     * TODO : Activer, desactiver ou suspendre un compte (cf. document de conception - section 5.2)
     */
    @PatchMapping("/api/auth/users/{id}/status")
    public ResponseEntity<?> activerDesactiverOuSuspendreUnCompte(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

}
