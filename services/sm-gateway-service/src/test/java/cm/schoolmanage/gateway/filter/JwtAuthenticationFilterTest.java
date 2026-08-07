package cm.schoolmanage.gateway.filter;

import cm.schoolmanage.gateway.config.GatewaySecurityProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "test-secret-key-not-for-production-use";

    private GatewaySecurityProperties properties;
    private ReactiveStringRedisTemplate redisTemplate;
    private JwtAuthenticationFilter filter;
    private GatewayFilterChain chain;

    @BeforeEach
    void setUp() {
        properties = new GatewaySecurityProperties();
        properties.getJwt().setSecret(SECRET);

        GatewaySecurityProperties.RouteRule publicLogin = new GatewaySecurityProperties.RouteRule();
        publicLogin.setMethod("POST");
        publicLogin.setPath("/api/auth/login");
        properties.setPublicRoutes(List.of(publicLogin));

        GatewaySecurityProperties.RouteRule adminOnly = new GatewaySecurityProperties.RouteRule();
        adminOnly.setPath("/api/v1/admin/**");
        adminOnly.setRoles(List.of("ADMINISTRATEUR"));

        GatewaySecurityProperties.RouteRule statusLive = new GatewaySecurityProperties.RouteRule();
        statusLive.setPath("/api/v1/status/live");
        statusLive.setRoles(List.of("ADMINISTRATEUR"));

        properties.setRbacRules(List.of(adminOnly, statusLive));

        redisTemplate = mock(ReactiveStringRedisTemplate.class);
        when(redisTemplate.hasKey(anyString())).thenReturn(Mono.just(false));

        filter = new JwtAuthenticationFilter(properties, redisTemplate);
        chain = exchange -> Mono.empty();
    }

    private String token(String role) {
        SecretKey key = Keys.hmacShaKeyFor(pad(SECRET));
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .claims(Map.of("email", "a@b.cm", "role", role, "type", "access"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(15))))
                .signWith(key)
                .compact();
    }

    private static byte[] pad(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length >= 32) {
            return bytes;
        }
        byte[] padded = new byte[32];
        System.arraycopy(bytes, 0, padded, 0, bytes.length);
        return padded;
    }

    @Test
    void routePublique_laisseZPasserSansToken() {
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/api/auth/login"));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }

    @Test
    void routeProtegee_sansToken_retourne401() {
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/admin/config"));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void routeProtegee_tokenInvalide_retourne401() {
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/admin/config")
                .header("Authorization", "Bearer not-a-real-jwt"));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void routeProtegee_tokenValideMaisMauvaisRole_retourne403() {
        String token = token("PARENT");
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/admin/config")
                .header("Authorization", "Bearer " + token));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void routeProtegee_tokenValideEtRoleAutorise_propageLesEnTetes() {
        String token = token("ADMINISTRATEUR");
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/admin/config")
                .header("Authorization", "Bearer " + token));

        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        GatewayFilterChain capturingChain = ex -> {
            captured.set(ex);
            return Mono.empty();
        };

        StepVerifier.create(filter.filter(exchange, capturingChain)).verifyComplete();

        ServerWebExchange downstream = captured.get();
        assertThat(downstream).isNotNull();
        assertThat(downstream.getRequest().getHeaders().getFirst("X-User-Role")).isEqualTo("ADMINISTRATEUR");
        assertThat(downstream.getRequest().getHeaders().getFirst("X-User-Id")).isNotBlank();
        assertThat(downstream.getRequest().getHeaders().getFirst("X-User-Email")).isEqualTo("a@b.cm");
    }

    @Test
    void routeSansRegleRbac_toutRoleAuthentifiePasse() {
        String token = token("PARENT");
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/notifications/user/42")
                .header("Authorization", "Bearer " + token));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }

    @Test
    void statusLive_tokenEnParametreDeRequete_estAccepte() {
        String token = token("ADMINISTRATEUR");
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/status/live?token=" + token));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }

    @Test
    void statusLive_sansTokenDuTout_retourne401() {
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/status/live"));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void autreRoute_tokenEnParametreDeRequete_nEstPasAccepte() {
        String token = token("ADMINISTRATEUR");
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/admin/config?token=" + token));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void tokenBlackliste_retourne401() {
        when(redisTemplate.hasKey(anyString())).thenReturn(Mono.just(true));
        String token = token("ADMINISTRATEUR");
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/v1/admin/config")
                .header("Authorization", "Bearer " + token));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
