package cm.schoolmanage.auth.service;

import cm.schoolmanage.auth.domain.User;
import cm.schoolmanage.auth.domain.UserStatus;
import cm.schoolmanage.auth.dto.LoginRequest;
import cm.schoolmanage.auth.dto.PasswordResetConfirmRequest;
import cm.schoolmanage.auth.dto.RegisterRequest;
import cm.schoolmanage.auth.dto.TokenPairResponse;
import cm.schoolmanage.auth.dto.UserProfileResponse;
import cm.schoolmanage.auth.dto.ValidateTokenResponse;
import cm.schoolmanage.auth.event.AuthEventPublisher;
import cm.schoolmanage.auth.exception.AccountSuspendedException;
import cm.schoolmanage.auth.exception.EmailAlreadyUsedException;
import cm.schoolmanage.auth.exception.InvalidCredentialsException;
import cm.schoolmanage.auth.exception.InvalidResetTokenException;
import cm.schoolmanage.auth.exception.UnauthorizedException;
import cm.schoolmanage.auth.exception.UserNotFoundException;
import cm.schoolmanage.auth.repository.UserRepository;
import cm.schoolmanage.auth.security.JwtService;
import cm.schoolmanage.auth.security.LoginRateLimiter;
import cm.schoolmanage.auth.security.PasswordResetService;
import cm.schoolmanage.auth.security.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;
    private final PasswordResetService passwordResetService;
    private final AuthEventPublisher eventPublisher;
    private final LoginRateLimiter loginRateLimiter;

    @Value("${schoolmanage.frontend.base-url}")
    private String frontendBaseUrl;

    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyUsedException(request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .status(UserStatus.ACTIVE)
                .build();
        user = userRepository.save(user);

        eventPublisher.publishUserCreated(user.getId(), user.getEmail(), user.getRole());

        String token = passwordResetService.createToken(user.getId());
        String setPasswordUrl = frontendBaseUrl + "/reset-password?token=" + token;
        eventPublisher.publishAccountCreated(user.getEmail(), user.getFullName(), setPasswordUrl);

        return user;
    }

    public TokenPairResponse login(LoginRequest request) {
        loginRateLimiter.checkAllowed(request.getEmail());

        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            loginRateLimiter.recordFailure(request.getEmail());
            throw new InvalidCredentialsException();
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AccountSuspendedException(user.getStatus());
        }

        loginRateLimiter.recordSuccess(request.getEmail());
        return issueTokenPair(user);
    }

    public void logout(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        Claims claims = requireValidToken(token);
        tokenBlacklistService.blacklist(token, claims.getExpiration().toInstant());
    }

    public TokenPairResponse refresh(String refreshToken) {
        Claims claims = requireValidToken(refreshToken);
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new UnauthorizedException("Le token fourni n'est pas un refresh token");
        }

        User user = userRepository.findById(UUID.fromString(claims.getSubject()))
                .orElseThrow(UserNotFoundException::new);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AccountSuspendedException(user.getStatus());
        }

        // Rotation : l'ancien refresh token est revoque des qu'un nouveau couple est emis.
        tokenBlacklistService.blacklist(refreshToken, claims.getExpiration().toInstant());
        return issueTokenPair(user);
    }

    public UserProfileResponse me(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        Claims claims = requireValidToken(token);
        User user = userRepository.findById(UUID.fromString(claims.getSubject()))
                .orElseThrow(UserNotFoundException::new);
        return UserProfileResponse.from(user);
    }

    public ValidateTokenResponse validateToken(String token) {
        if (token == null || tokenBlacklistService.isBlacklisted(token) || !jwtService.isValid(token)) {
            return ValidateTokenResponse.invalid();
        }
        Claims claims = jwtService.parseClaims(token);
        return ValidateTokenResponse.valid(
                claims.getSubject(),
                claims.get("email", String.class),
                claims.get("role", String.class));
    }

    /**
     * Lecture par ID pour usage interne (cf. AuthController#consulterLeProfilDUnUtilisateur) -
     * permet a d'autres services (ex. notification-service) de resoudre un userId en email,
     * sans dupliquer cette donnee dans chaque service (pattern Database per Service).
     */
    public User getById(UUID id) {
        return userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    }

    /**
     * Liste tous les comptes - vue Admin Systeme (cf. AuthController#listerLesComptes) pour
     * retrouver l'identifiant d'un utilisateur avant d'activer/suspendre son compte.
     */
    public List<User> listAll() {
        return userRepository.findAll();
    }

    public User updateStatus(UUID id, UserStatus status) {
        User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        user.setStatus(status);
        return userRepository.save(user);
    }

    /**
     * Demande de reinitialisation de mot de passe. Reste silencieuse si l'email est inconnu
     * (pas d'exception, pas de difference de comportement observable) - evite qu'un attaquant
     * puisse enumerer les comptes existants en testant des adresses.
     */
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.info("Demande de reinitialisation pour un email inconnu (ignoree) : {}", email);
            return;
        }
        String token = passwordResetService.createToken(user.getId());
        String resetUrl = frontendBaseUrl + "/reset-password?token=" + token;
        eventPublisher.publishPasswordResetRequested(user.getEmail(), user.getFullName(), resetUrl);
    }

    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        UUID userId = passwordResetService.consumeToken(request.getToken())
                .orElseThrow(InvalidResetTokenException::new);
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private TokenPairResponse issueTokenPair(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail(), user.getRole());
        return TokenPairResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTtlSeconds())
                .build();
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("En-tete Authorization manquant ou invalide");
        }
        return authorizationHeader.substring(7);
    }

    private Claims requireValidToken(String token) {
        if (tokenBlacklistService.isBlacklisted(token)) {
            throw new UnauthorizedException("Token revoque");
        }
        try {
            return jwtService.parseClaims(token);
        } catch (RuntimeException e) {
            throw new UnauthorizedException("Token invalide ou expire");
        }
    }
}
