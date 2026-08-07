package cm.schoolmanage.auth.controller;

import cm.schoolmanage.auth.dto.LoginRequest;
import cm.schoolmanage.auth.dto.PasswordResetConfirmRequest;
import cm.schoolmanage.auth.dto.PasswordResetRequestRequest;
import cm.schoolmanage.auth.dto.RefreshRequest;
import cm.schoolmanage.auth.dto.RegisterRequest;
import cm.schoolmanage.auth.dto.TokenPairResponse;
import cm.schoolmanage.auth.dto.UpdateStatusRequest;
import cm.schoolmanage.auth.dto.UserProfileResponse;
import cm.schoolmanage.auth.dto.ValidateTokenRequest;
import cm.schoolmanage.auth.dto.ValidateTokenResponse;
import cm.schoolmanage.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Controleur REST pour auth-service - endpoints extraits du document de conception
 * (section 5.2, UC1-UC4). Gardien central de la plateforme : identites, JWT, RBAC.
 */
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Roles autorises : Public
     */
    @PostMapping("/api/auth/register")
    public ResponseEntity<UserProfileResponse> creerUnNouveauCompte(@Valid @RequestBody RegisterRequest request) {
        var user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserProfileResponse.from(user));
    }

    /**
     * Roles autorises : Public
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<TokenPairResponse> authentifierEtRetournerLesTokensJwt(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Roles autorises : Authentifie
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> invaliderLeTokenBlacklistRedis(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(authorization);
        return ResponseEntity.noContent().build();
    }

    /**
     * Roles autorises : Public.
     * Envoie un lien de reinitialisation par email si le compte existe - reponse identique
     * dans tous les cas (compte trouve ou non) pour ne pas reveler les adresses existantes.
     */
    @PostMapping("/api/auth/password-reset/request")
    public ResponseEntity<Void> demanderUneReinitialisationDeMotDePasse(
            @Valid @RequestBody PasswordResetRequestRequest request) {
        authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.accepted().build();
    }

    /**
     * Roles autorises : Public.
     * Finalise la reinitialisation a partir du jeton recu par email (usage unique, 1h).
     */
    @PostMapping("/api/auth/password-reset/confirm")
    public ResponseEntity<Void> confirmerLaReinitialisationDeMotDePasse(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.confirmPasswordReset(request);
        return ResponseEntity.noContent().build();
    }

    /**
     * Roles autorises : Authentifie
     */
    @PostMapping("/api/auth/refresh")
    public ResponseEntity<TokenPairResponse> renouvelerLAccessToken(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
    }

    /**
     * Roles autorises : Authentifie
     */
    @GetMapping("/api/auth/me")
    public ResponseEntity<UserProfileResponse> retournerLeProfilDeLUtilisateurConnecte(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(authService.me(authorization));
    }

    /**
     * Roles autorises : Services internes
     */
    @PostMapping("/api/auth/validate-token")
    public ResponseEntity<ValidateTokenResponse> validerUnJwtUsageInterne(
            @Valid @RequestBody ValidateTokenRequest request) {
        return ResponseEntity.ok(authService.validateToken(request.getToken()));
    }

    /**
     * Roles autorises : Admin Systeme.
     * Liste tous les comptes - permet de retrouver l'identifiant d'un utilisateur avant de
     * l'activer/suspendre (cf. AdminController#activerSuspendreUnCompte, admin-service).
     */
    @GetMapping("/api/auth/users")
    public ResponseEntity<List<UserProfileResponse>> listerLesComptes() {
        var users = authService.listAll().stream().map(UserProfileResponse::from).toList();
        return ResponseEntity.ok(users);
    }

    /**
     * Roles autorises : Admin
     */
    @PatchMapping("/api/auth/users/{id}/status")
    public ResponseEntity<UserProfileResponse> activerDesactiverOuSuspendreUnCompte(
            @PathVariable UUID id, @Valid @RequestBody UpdateStatusRequest request) {
        var user = authService.updateStatus(id, request.getStatus());
        return ResponseEntity.ok(UserProfileResponse.from(user));
    }

    /**
     * Roles autorises : Services internes.
     * N'appartient pas au contrat REST documente au depart : ajoute pour permettre a d'autres
     * services (notification-service) de resoudre un userId en email sans dupliquer cette
     * donnee (annuaire utilisateur -> contact, cf. Database per Service).
     */
    @GetMapping("/api/auth/users/{id}")
    public ResponseEntity<UserProfileResponse> consulterLeProfilDUnUtilisateur(@PathVariable UUID id) {
        return ResponseEntity.ok(UserProfileResponse.from(authService.getById(id)));
    }
}
