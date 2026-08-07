package cm.schoolmanage.auth.service;

import cm.schoolmanage.auth.domain.User;
import cm.schoolmanage.auth.domain.UserStatus;
import cm.schoolmanage.auth.dto.LoginRequest;
import cm.schoolmanage.auth.dto.PasswordResetConfirmRequest;
import cm.schoolmanage.auth.dto.RegisterRequest;
import cm.schoolmanage.auth.dto.TokenPairResponse;
import cm.schoolmanage.auth.dto.ValidateTokenResponse;
import cm.schoolmanage.auth.event.AuthEventPublisher;
import cm.schoolmanage.auth.exception.AccountSuspendedException;
import cm.schoolmanage.auth.exception.EmailAlreadyUsedException;
import cm.schoolmanage.auth.exception.InvalidCredentialsException;
import cm.schoolmanage.auth.exception.InvalidResetTokenException;
import cm.schoolmanage.auth.exception.TooManyLoginAttemptsException;
import cm.schoolmanage.auth.exception.UnauthorizedException;
import cm.schoolmanage.auth.repository.UserRepository;
import cm.schoolmanage.auth.security.JwtService;
import cm.schoolmanage.auth.security.LoginRateLimiter;
import cm.schoolmanage.auth.security.PasswordResetService;
import cm.schoolmanage.auth.security.TokenBlacklistService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private PasswordResetService passwordResetService;

    @Mock
    private AuthEventPublisher eventPublisher;

    @Mock
    private LoginRateLimiter loginRateLimiter;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtService jwtService = new JwtService("test-secret-key-not-for-production-use", 15, 7);

    private AuthService service() {
        AuthService service = new AuthService(
                userRepository, passwordEncoder, jwtService, tokenBlacklistService, passwordResetService,
                eventPublisher, loginRateLimiter);
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "http://localhost:5173");
        return service;
    }

    private User activeUser(UUID id, String email, String rawPassword, String role) {
        return User.builder()
                .id(id)
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName("Jean Dupont")
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void register_emailDejaUtilise_leveUneException() {
        when(userRepository.existsByEmail("a@b.cm")).thenReturn(true);

        RegisterRequest request = new RegisterRequest();
        request.setEmail("a@b.cm");
        request.setPassword("password123");
        request.setFullName("Jean Dupont");
        request.setRole("PARENT");

        assertThatThrownBy(() -> service().register(request)).isInstanceOf(EmailAlreadyUsedException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_creeLeCompteEtPublieLesEvenements() {
        when(userRepository.existsByEmail("a@b.cm")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(passwordResetService.createToken(any())).thenReturn("le-token");

        RegisterRequest request = new RegisterRequest();
        request.setEmail("a@b.cm");
        request.setPassword("password123");
        request.setFullName("Jean Dupont");
        request.setRole("PARENT");

        User created = service().register(request);

        assertThat(created.getEmail()).isEqualTo("a@b.cm");
        assertThat(created.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(passwordEncoder.matches("password123", created.getPasswordHash())).isTrue();

        verify(eventPublisher).publishUserCreated(any(), eq("a@b.cm"), eq("PARENT"));
        verify(eventPublisher).publishAccountCreated(
                eq("a@b.cm"), eq("Jean Dupont"), eq("http://localhost:5173/reset-password?token=le-token"));
    }

    @Test
    void login_motDePasseIncorrect_leveUneException() {
        User user = activeUser(UUID.randomUUID(), "a@b.cm", "password123", "PARENT");
        when(userRepository.findByEmail("a@b.cm")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setEmail("a@b.cm");
        request.setPassword("wrong-password");

        assertThatThrownBy(() -> service().login(request)).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_motDePasseIncorrect_enregistreUnEchecAupresDuRateLimiter() {
        User user = activeUser(UUID.randomUUID(), "a@b.cm", "password123", "PARENT");
        when(userRepository.findByEmail("a@b.cm")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setEmail("a@b.cm");
        request.setPassword("wrong-password");

        assertThatThrownBy(() -> service().login(request)).isInstanceOf(InvalidCredentialsException.class);
        verify(loginRateLimiter).recordFailure("a@b.cm");
    }

    @Test
    void login_troptentativesEchouees_leveUneExceptionSansInterrogerLaBase() {
        doThrow(new TooManyLoginAttemptsException()).when(loginRateLimiter).checkAllowed("a@b.cm");

        LoginRequest request = new LoginRequest();
        request.setEmail("a@b.cm");
        request.setPassword("password123");

        assertThatThrownBy(() -> service().login(request)).isInstanceOf(TooManyLoginAttemptsException.class);
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void login_compteSuspendu_leveUneException() {
        User user = activeUser(UUID.randomUUID(), "a@b.cm", "password123", "PARENT");
        user.setStatus(UserStatus.SUSPENDED);
        when(userRepository.findByEmail("a@b.cm")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setEmail("a@b.cm");
        request.setPassword("password123");

        assertThatThrownBy(() -> service().login(request)).isInstanceOf(AccountSuspendedException.class);
    }

    @Test
    void login_succes_retourneUnCoupleDeTokens() {
        User user = activeUser(UUID.randomUUID(), "a@b.cm", "password123", "PARENT");
        when(userRepository.findByEmail("a@b.cm")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setEmail("a@b.cm");
        request.setPassword("password123");

        TokenPairResponse tokens = service().login(request);

        assertThat(tokens.getAccessToken()).isNotBlank();
        assertThat(tokens.getRefreshToken()).isNotBlank();
        assertThat(tokens.getTokenType()).isEqualTo("Bearer");
        assertThat(tokens.getExpiresIn()).isEqualTo(15 * 60L);
        verify(loginRateLimiter).recordSuccess("a@b.cm");
    }

    @Test
    void logout_blackListeLAccessToken() {
        UUID id = UUID.randomUUID();
        String accessToken = jwtService.generateAccessToken(id, "a@b.cm", "PARENT");

        service().logout("Bearer " + accessToken);

        verify(tokenBlacklistService).blacklist(eq(accessToken), any());
    }

    @Test
    void logout_sansEnTeteAuthorization_leveUneException() {
        assertThatThrownBy(() -> service().logout(null)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refresh_avecUnAccessTokenAuLieuDUnRefresh_leveUneException() {
        UUID id = UUID.randomUUID();
        String accessToken = jwtService.generateAccessToken(id, "a@b.cm", "PARENT");

        assertThatThrownBy(() -> service().refresh(accessToken)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refresh_succes_emetUnNouveauCoupleEtRevoqueLAncien() {
        UUID id = UUID.randomUUID();
        User user = activeUser(id, "a@b.cm", "password123", "PARENT");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        String refreshToken = jwtService.generateRefreshToken(id, "a@b.cm", "PARENT");

        TokenPairResponse tokens = service().refresh(refreshToken);

        assertThat(tokens.getAccessToken()).isNotBlank();
        verify(tokenBlacklistService).blacklist(eq(refreshToken), any());
    }

    @Test
    void validateToken_tokenInvalide_retourneInvalid() {
        ValidateTokenResponse response = service().validateToken("not-a-real-jwt");
        assertThat(response.isValid()).isFalse();
    }

    @Test
    void validateToken_tokenValide_retourneLesInfosUtilisateur() {
        UUID id = UUID.randomUUID();
        String accessToken = jwtService.generateAccessToken(id, "a@b.cm", "PARENT");

        ValidateTokenResponse response = service().validateToken(accessToken);

        assertThat(response.isValid()).isTrue();
        assertThat(response.getUserId()).isEqualTo(id.toString());
        assertThat(response.getEmail()).isEqualTo("a@b.cm");
        assertThat(response.getRole()).isEqualTo("PARENT");
    }

    @Test
    void updateStatus_modifieLeStatutDuCompte() {
        UUID id = UUID.randomUUID();
        User user = activeUser(id, "a@b.cm", "password123", "PARENT");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = service().updateStatus(id, UserStatus.SUSPENDED);

        assertThat(updated.getStatus()).isEqualTo(UserStatus.SUSPENDED);
    }

    @Test
    void requestPasswordReset_compteExistant_publieLEvenementAvecLeLien() {
        User user = activeUser(UUID.randomUUID(), "a@b.cm", "password123", "PARENT");
        when(userRepository.findByEmail("a@b.cm")).thenReturn(Optional.of(user));
        when(passwordResetService.createToken(user.getId())).thenReturn("le-token");

        service().requestPasswordReset("a@b.cm");

        verify(eventPublisher).publishPasswordResetRequested(
                eq("a@b.cm"), eq("Jean Dupont"), eq("http://localhost:5173/reset-password?token=le-token"));
    }

    @Test
    void requestPasswordReset_emailInconnu_nePublieRien() {
        when(userRepository.findByEmail("inconnu@b.cm")).thenReturn(Optional.empty());

        service().requestPasswordReset("inconnu@b.cm");

        verify(eventPublisher, never()).publishPasswordResetRequested(any(), any(), any());
        verify(passwordResetService, never()).createToken(any());
    }

    @Test
    void confirmPasswordReset_tokenValide_metAJourLeMotDePasse() {
        UUID id = UUID.randomUUID();
        User user = activeUser(id, "a@b.cm", "ancien-mdp", "PARENT");
        when(passwordResetService.consumeToken("le-token")).thenReturn(Optional.of(id));
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PasswordResetConfirmRequest request = new PasswordResetConfirmRequest();
        request.setToken("le-token");
        request.setNewPassword("nouveau-mdp-123");

        service().confirmPasswordReset(request);

        assertThat(passwordEncoder.matches("nouveau-mdp-123", user.getPasswordHash())).isTrue();
    }

    @Test
    void confirmPasswordReset_tokenInvalideOuExpire_leveUneException() {
        when(passwordResetService.consumeToken("mauvais-token")).thenReturn(Optional.empty());

        PasswordResetConfirmRequest request = new PasswordResetConfirmRequest();
        request.setToken("mauvais-token");
        request.setNewPassword("nouveau-mdp-123");

        assertThatThrownBy(() -> service().confirmPasswordReset(request))
                .isInstanceOf(InvalidResetTokenException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void getById_utilisateurExistant_leRetourne() {
        UUID id = UUID.randomUUID();
        User user = activeUser(id, "a@b.cm", "password123", "PARENT");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        assertThat(service().getById(id)).isEqualTo(user);
    }

    @Test
    void getById_utilisateurInconnu_leveUneException() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getById(id)).isInstanceOf(cm.schoolmanage.auth.exception.UserNotFoundException.class);
    }
}
