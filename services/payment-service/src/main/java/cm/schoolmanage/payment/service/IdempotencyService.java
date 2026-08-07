package cm.schoolmanage.payment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Mecanisme d'idempotence (cle unique Redis) pour eviter les doubles debits en cas de retry
 * reseau (cf. README). Le client fournit un en-tete "Idempotency-Key" ; une meme cle rejouee
 * dans les 24h renvoie la transaction deja creee au lieu d'en initier une nouvelle.
 */
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private static final String KEY_PREFIX = "sm:payment:idempotency:";
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;

    public Optional<UUID> findExistingTransaction(String idempotencyKey) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + idempotencyKey);
        return Optional.ofNullable(value).map(UUID::fromString);
    }

    public void remember(String idempotencyKey, UUID transactionId) {
        redisTemplate.opsForValue().set(KEY_PREFIX + idempotencyKey, transactionId.toString(), TTL);
    }
}
