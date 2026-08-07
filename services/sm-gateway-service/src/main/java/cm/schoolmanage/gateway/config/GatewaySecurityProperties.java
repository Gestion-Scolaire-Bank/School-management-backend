package cm.schoolmanage.gateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Regles de securite du Gateway, pilotees par configuration (application.yml) plutot que codees
 * en dur : routes publiques (pas de JWT requis) et regles RBAC (methode + motif de chemin ->
 * roles autorises). Une route sans regle RBAC correspondante reste accessible a tout utilisateur
 * authentifie - voir le commentaire dans application.yml pour la justification.
 */
@Component
@ConfigurationProperties(prefix = "schoolmanage.security")
@Getter
@Setter
public class GatewaySecurityProperties {

    private Jwt jwt = new Jwt();
    private List<RouteRule> publicRoutes = List.of();
    private List<RouteRule> rbacRules = List.of();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
    }

    @Getter
    @Setter
    public static class RouteRule {
        /** null = toutes les methodes HTTP. */
        private String method;
        private String path;
        private List<String> roles = List.of();
    }
}
