package cm.schoolmanage.auth.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Jetons de reinitialisation de mot de passe - cle Redis sm:auth:password-reset:{token},
 * valeur = userId, expiration courte (1h) et usage unique (supprime des consommation).
 * Meme pattern que TokenBlacklistService : pas besoin d'une table dediee, Redis gere
 * nativement l'expiration.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final String KEY_PREFIX = "sm:auth:password-reset:";
    private static final Duration TOKEN_TTL = Duration.ofHours(1);

    private final StringRedisTemplate redisTemplate;

    public String createToken(UUID userId) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(KEY_PREFIX + token, userId.toString(), TOKEN_TTL);
        return token;
    }

    /** Usage unique : le jeton est supprime des sa consommation, valide ou non. */
    public Optional<UUID> consumeToken(String token) {
        String userId = redisTemplate.opsForValue().getAndDelete(KEY_PREFIX + token);
        if (userId == null) {
            return Optional.empty();
        }
        return Optional.of(UUID.fromString(userId));
    }
}
