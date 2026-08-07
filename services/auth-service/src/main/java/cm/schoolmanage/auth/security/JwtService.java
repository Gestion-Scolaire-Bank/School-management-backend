package cm.schoolmanage.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/** Emission et validation des JWT (access 15 min / refresh 7 jours, cf. document de conception). */
@Component
public class JwtService {

    private final SecretKey key;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(
            @Value("${schoolmanage.security.jwt.secret}") String secret,
            @Value("${schoolmanage.security.jwt.access-ttl-minutes}") long accessTtlMinutes,
            @Value("${schoolmanage.security.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.key = Keys.hmacShaKeyFor(normalizeSecret(secret));
        this.accessTtl = Duration.ofMinutes(accessTtlMinutes);
        this.refreshTtl = Duration.ofDays(refreshTtlDays);
    }

    private static byte[] normalizeSecret(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        // HS256 exige une cle d'au moins 256 bits (32 octets) ; on complete si besoin (dev uniquement,
        // le secret par defaut de .env.example fait moins de 32 caracteres).
        if (bytes.length >= 32) {
            return bytes;
        }
        byte[] padded = new byte[32];
        System.arraycopy(bytes, 0, padded, 0, bytes.length);
        return padded;
    }

    public String generateAccessToken(UUID userId, String email, String role) {
        return generateToken(userId, email, role, "access", accessTtl);
    }

    public String generateRefreshToken(UUID userId, String email, String role) {
        return generateToken(userId, email, role, "refresh", refreshTtl);
    }

    public long getAccessTtlSeconds() {
        return accessTtl.getSeconds();
    }

    private String generateToken(UUID userId, String email, String role, String type, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claims(Map.of("email", email, "role", role, "type", type))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }
}
