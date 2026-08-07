package cm.schoolmanage.gateway.filter;

import cm.schoolmanage.gateway.config.GatewaySecurityProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Filtre global applique a toutes les routes du Gateway.
 *
 * Responsabilites (cf. document de conception, section 5.1 - S3) :
 *   1. Extraire le token JWT de l'en-tete "Authorization: Bearer {token}"
 *   2. Valider le token : signature + expiration (verification locale via le meme secret
 *      partage qu'auth-service, cf. JwtService) puis non-revocation (blacklist Redis, cle
 *      "sm:auth:blacklist:{token}" - meme convention que TokenBlacklistService d'auth-service).
 *      La verification est locale plutot qu'un appel REST a /api/auth/validate-token a chaque
 *      requete : plus rapide, et le Gateway reste fonctionnel meme si auth-service est indisponible.
 *   3. Verifier les droits RBAC (role autorise) pour la route demandee, via les regles
 *      declarees dans schoolmanage.security.rbac-rules (application.yml).
 *   4. Propager l'identite de l'utilisateur en aval via les en-tetes X-User-Id et X-User-Role
 *   5. Laisser passer sans verification les routes publiques (schoolmanage.security.public-routes)
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String BLACKLIST_KEY_PREFIX = "sm:auth:blacklist:";
    private static final String WEBSOCKET_STATUS_LIVE_PATH = "/api/v1/status/live";

    private final GatewaySecurityProperties properties;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final SecretKey key;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthenticationFilter(GatewaySecurityProperties properties, ReactiveStringRedisTemplate redisTemplate) {
        this.properties = properties;
        this.redisTemplate = redisTemplate;
        this.key = Keys.hmacShaKeyFor(normalizeSecret(properties.getJwt().getSecret()));
    }

    private static byte[] normalizeSecret(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        // HS256 exige une cle d'au moins 256 bits (32 octets) ; on complete si besoin (dev
        // uniquement - meme logique que JwtService cote auth-service, secret partage).
        if (bytes.length >= 32) {
            return bytes;
        }
        byte[] padded = new byte[32];
        System.arraycopy(bytes, 0, padded, 0, bytes.length);
        return padded;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        if (matchesAny(properties.getPublicRoutes(), method, path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        String token;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (WEBSOCKET_STATUS_LIVE_PATH.equals(path)) {
            // Un client WebSocket de navigateur ne peut pas envoyer d'en-tete Authorization au
            // handshake - ce flux temps reel (userstatus-service, tableau de bord Admin) accepte
            // donc aussi le jeton en parametre de requete. Reserve a cette seule route (pas a
            // toutes) pour ne pas multiplier les endroits ou un JWT peut fuiter via une URL
            // (historique navigateur, logs d'acces, en-tete Referer).
            token = request.getQueryParams().getFirst("token");
            if (token == null) {
                return respond(exchange, HttpStatus.UNAUTHORIZED);
            }
        } else {
            return respond(exchange, HttpStatus.UNAUTHORIZED);
        }

        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return respond(exchange, HttpStatus.UNAUTHORIZED);
        }

        String userId = claims.getSubject();
        String role = claims.get("role", String.class);
        String email = claims.get("email", String.class);

        return redisTemplate.hasKey(BLACKLIST_KEY_PREFIX + token)
                .defaultIfEmpty(false)
                .flatMap(blacklisted -> {
                    if (Boolean.TRUE.equals(blacklisted)) {
                        return respond(exchange, HttpStatus.UNAUTHORIZED);
                    }
                    if (!isRoleAllowed(method, path, role)) {
                        return respond(exchange, HttpStatus.FORBIDDEN);
                    }

                    ServerHttpRequest.Builder mutatedRequestBuilder = request.mutate()
                            .header("X-User-Id", userId)
                            .header("X-User-Role", role);
                    if (email != null) {
                        mutatedRequestBuilder.header("X-User-Email", email);
                    }
                    ServerHttpRequest mutatedRequest = mutatedRequestBuilder.build();
                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                });
    }

    private boolean isRoleAllowed(HttpMethod method, String path, String role) {
        List<GatewaySecurityProperties.RouteRule> matching = properties.getRbacRules().stream()
                .filter(rule -> matches(rule, method, path))
                .toList();

        if (matching.isEmpty()) {
            // Pas de regle specifique pour cette route : tout utilisateur authentifie est admis
            // (cf. commentaire dans application.yml - roles non couverts par le RBAC a 4 roles).
            return true;
        }

        Set<String> allowedRoles = matching.stream()
                .flatMap(rule -> rule.getRoles().stream())
                .collect(Collectors.toSet());
        return allowedRoles.contains(role);
    }

    private boolean matchesAny(List<GatewaySecurityProperties.RouteRule> rules, HttpMethod method, String path) {
        return rules.stream().anyMatch(rule -> matches(rule, method, path));
    }

    private boolean matches(GatewaySecurityProperties.RouteRule rule, HttpMethod method, String path) {
        boolean methodMatches = rule.getMethod() == null || rule.getMethod().equalsIgnoreCase(method.name());
        return methodMatches && pathMatcher.match(rule.getPath(), path);
    }

    private Mono<Void> respond(ServerWebExchange exchange, HttpStatus status) {
        exchange.getResponse().setStatusCode(status);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
