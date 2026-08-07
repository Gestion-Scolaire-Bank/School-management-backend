package cm.schoolmanage.auth.security;

import cm.schoolmanage.auth.exception.TooManyLoginAttemptsException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Protection anti-brute-force sur /api/auth/login - cle Redis sm:auth:login-attempts:{email}.
 * Compte les echecs consecutifs par adresse email ; au-dela du seuil, les tentatives sont
 * bloquees jusqu'a expiration de la fenetre (meme en cas de bon mot de passe entre-temps,
 * pour eviter qu'un attaquant ne "reinitialise" son propre blocage).
 */
@Service
@RequiredArgsConstructor
public class LoginRateLimiter {

    private static final String KEY_PREFIX = "sm:auth:login-attempts:";
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final StringRedisTemplate redisTemplate;

    public void checkAllowed(String email) {
        String value = redisTemplate.opsForValue().get(key(email));
        int attempts = value == null ? 0 : Integer.parseInt(value);
        if (attempts >= MAX_ATTEMPTS) {
            throw new TooManyLoginAttemptsException();
        }
    }

    public void recordFailure(String email) {
        Long attempts = redisTemplate.opsForValue().increment(key(email));
        if (attempts != null && attempts == 1L) {
            redisTemplate.expire(key(email), WINDOW);
        }
    }

    public void recordSuccess(String email) {
        redisTemplate.delete(key(email));
    }

    private String key(String email) {
        return KEY_PREFIX + email.toLowerCase();
    }
}
