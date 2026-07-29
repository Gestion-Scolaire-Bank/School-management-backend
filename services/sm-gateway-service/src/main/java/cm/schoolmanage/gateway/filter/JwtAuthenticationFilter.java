package cm.schoolmanage.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Filtre global applique a toutes les routes du Gateway.
 *
 * Responsabilites a implementer (cf. document de conception, section 5.1 - S3) :
 *   1. Extraire le token JWT de l'en-tete "Authorization: Bearer {token}"
 *   2. Valider le token (signature, expiration, blacklist Redis) - via auth-service
 *      (POST /api/auth/validate-token) ou verification locale de la signature
 *   3. Verifier les droits RBAC (role autorise) pour la route demandee
 *   4. Propager l'identite de l'utilisateur en aval via les en-tetes X-User-Id et X-User-Role
 *   5. Laisser passer sans verification les routes publiques (register, login, webhooks)
 *
 * TODO : completer l'implementation ci-dessous (actuellement laisse-passer inconditionnel).
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String[] PUBLIC_ROUTES = {
            "/api/auth/register",
            "/api/auth/login",
            "/api/v1/payments/webhook/mtn",
            "/api/v1/payments/webhook/orange",
    };

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isPublicRoute(path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // TODO : valider le JWT (signature + blacklist Redis) et extraire userId / role,
        // puis propager via mutate().header("X-User-Id", userId).header("X-User-Role", role)

        return chain.filter(exchange);
    }

    private boolean isPublicRoute(String path) {
        for (String publicRoute : PUBLIC_ROUTES) {
            if (path.startsWith(publicRoute)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
