package cm.schoolmanage.auth.controller;

import cm.schoolmanage.auth.domain.User;
import cm.schoolmanage.auth.domain.UserStatus;
import cm.schoolmanage.auth.dto.TokenPairResponse;
import cm.schoolmanage.auth.dto.ValidateTokenResponse;
import cm.schoolmanage.auth.exception.InvalidCredentialsException;
import cm.schoolmanage.auth.exception.InvalidResetTokenException;
import cm.schoolmanage.auth.exception.UnauthorizedException;
import cm.schoolmanage.auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * addFilters = false : la securite (blacklist/roles) est deja couverte par AuthServiceTest ;
 * ce test verifie uniquement le cablage HTTP du controleur (statuts, corps de requete/reponse).
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    private User sampleUser(UUID id) {
        return User.builder()
                .id(id)
                .email("a@b.cm")
                .fullName("Jean Dupont")
                .role("PARENT")
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void creerUnNouveauCompte_retourne201() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.register(any())).thenReturn(sampleUser(id));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "a@b.cm",
                                "password", "password123",
                                "fullName", "Jean Dupont",
                                "role", "PARENT"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("a@b.cm"));
    }

    @Test
    void creerUnNouveauCompte_roleInvalide_retourne400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "a@b.cm",
                                "password", "password123",
                                "fullName", "Jean Dupont",
                                "role", "SUPERADMIN"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void authentifierEtRetournerLesTokensJwt_succes_retourne200() throws Exception {
        when(authService.login(any())).thenReturn(TokenPairResponse.builder()
                .accessToken("access")
                .refreshToken("refresh")
                .tokenType("Bearer")
                .expiresIn(900)
                .build());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "a@b.cm", "password", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));
    }

    @Test
    void authentifierEtRetournerLesTokensJwt_identifiantsInvalides_retourne401() throws Exception {
        when(authService.login(any())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "a@b.cm", "password", "wrong"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void demanderUneReinitialisationDeMotDePasse_retourne202() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "a@b.cm"))))
                .andExpect(status().isAccepted());

        verify(authService).requestPasswordReset("a@b.cm");
    }

    @Test
    void demanderUneReinitialisationDeMotDePasse_emailInvalide_retourne400() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "pas-un-email"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmerLaReinitialisationDeMotDePasse_succes_retourne204() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "le-token",
                                "newPassword", "nouveau-mdp-123"))))
                .andExpect(status().isNoContent());

        verify(authService).confirmPasswordReset(any());
    }

    @Test
    void confirmerLaReinitialisationDeMotDePasse_tokenInvalide_retourne400() throws Exception {
        doThrow(new InvalidResetTokenException()).when(authService).confirmPasswordReset(any());

        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "mauvais-token",
                                "newPassword", "nouveau-mdp-123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmerLaReinitialisationDeMotDePasse_motDePasseTropCourt_retourne400() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "le-token",
                                "newPassword", "court"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invaliderLeTokenBlacklistRedis_transmetLEnTeteAuService() throws Exception {
        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer abc123"))
                .andExpect(status().isNoContent());

        verify(authService).logout("Bearer abc123");
    }

    @Test
    void retournerLeProfilDeLUtilisateurConnecte_sansToken_retourne401() throws Exception {
        when(authService.me(null)).thenThrow(new UnauthorizedException("En-tete Authorization manquant ou invalide"));

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validerUnJwtUsageInterne_retourneLeResultat() throws Exception {
        when(authService.validateToken("abc123")).thenReturn(
                ValidateTokenResponse.valid(UUID.randomUUID().toString(), "a@b.cm", "PARENT"));

        mockMvc.perform(post("/api/auth/validate-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", "abc123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }

    @Test
    void activerDesactiverOuSuspendreUnCompte_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        User suspended = sampleUser(id);
        suspended.setStatus(UserStatus.SUSPENDED);
        when(authService.updateStatus(eq(id), eq(UserStatus.SUSPENDED))).thenReturn(suspended);

        mockMvc.perform(patch("/api/auth/users/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "SUSPENDED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
    }

    @Test
    void consulterLeProfilDUnUtilisateur_retourne200() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.getById(id)).thenReturn(sampleUser(id));

        mockMvc.perform(get("/api/auth/users/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("a@b.cm"));
    }

    @Test
    void consulterLeProfilDUnUtilisateur_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.getById(id)).thenThrow(new cm.schoolmanage.auth.exception.UserNotFoundException());

        mockMvc.perform(get("/api/auth/users/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void listerLesComptes_retourneLaListe() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.listAll()).thenReturn(java.util.List.of(sampleUser(id)));

        mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("a@b.cm"))
                .andExpect(jsonPath("$[0].role").value("PARENT"));
    }

    @Test
    void listerLesComptes_aucunCompte_retourneTableauVide() throws Exception {
        when(authService.listAll()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
