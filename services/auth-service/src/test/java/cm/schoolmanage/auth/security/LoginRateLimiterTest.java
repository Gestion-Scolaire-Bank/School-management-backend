package cm.schoolmanage.auth.security;

import cm.schoolmanage.auth.exception.TooManyLoginAttemptsException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoginRateLimiterTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private LoginRateLimiter rateLimiter() {
        return new LoginRateLimiter(redisTemplate);
    }

    @Test
    void checkAllowed_aucuneTentativeEnregistree_neLevePasDException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("sm:auth:login-attempts:a@b.cm")).thenReturn(null);

        assertThatCode(() -> rateLimiter().checkAllowed("a@b.cm")).doesNotThrowAnyException();
    }

    @Test
    void checkAllowed_sousLeSeuil_neLevePasDException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("sm:auth:login-attempts:a@b.cm")).thenReturn("4");

        assertThatCode(() -> rateLimiter().checkAllowed("a@b.cm")).doesNotThrowAnyException();
    }

    @Test
    void checkAllowed_seuilAtteint_leveUneException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("sm:auth:login-attempts:a@b.cm")).thenReturn("5");

        assertThatThrownBy(() -> rateLimiter().checkAllowed("a@b.cm"))
                .isInstanceOf(TooManyLoginAttemptsException.class);
    }

    @Test
    void recordFailure_premierEchec_positionneUnTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("sm:auth:login-attempts:a@b.cm")).thenReturn(1L);

        rateLimiter().recordFailure("a@b.cm");

        verify(redisTemplate).expire(eq("sm:auth:login-attempts:a@b.cm"), eq(Duration.ofMinutes(15)));
    }

    @Test
    void recordFailure_echecsSuivants_neReplacePasLeTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("sm:auth:login-attempts:a@b.cm")).thenReturn(2L);

        rateLimiter().recordFailure("a@b.cm");

        verify(redisTemplate, never()).expire(any(), any());
    }

    @Test
    void recordSuccess_reinitialiseLeCompteur() {
        rateLimiter().recordSuccess("a@b.cm");

        verify(redisTemplate).delete("sm:auth:login-attempts:a@b.cm");
    }
}
