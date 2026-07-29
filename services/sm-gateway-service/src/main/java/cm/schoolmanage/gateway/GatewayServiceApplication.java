package cm.schoolmanage.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * S3 - sm-gateway-service : porte d'entree unique de la plateforme (API Gateway).
 * Aucun client (mobile, web) ne communique directement avec les services metier : toutes
 * les requetes transitent obligatoirement par ce service. Responsabilites : routage,
 * validation JWT + RBAC, load balancing entre instances (section 5.1).
 * Doit demarrer en dernier, apres sm-config-service et sm-registry-service.
 */
@SpringBootApplication
@EnableDiscoveryClient
public class GatewayServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayServiceApplication.class, args);
    }
}
