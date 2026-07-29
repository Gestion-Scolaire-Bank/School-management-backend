package cm.schoolmanage.registry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/**
 * S2 - sm-registry-service : registre de decouverte de services (Eureka Server).
 * Chaque service metier s'enregistre aupres de ce registre au demarrage. Le Gateway
 * l'interroge pour connaitre les instances disponibles (load balancing cote client).
 * Doit demarrer apres sm-config-service et avant sm-gateway-service (section 5.1).
 */
@SpringBootApplication
@EnableEurekaServer
public class RegistryServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RegistryServiceApplication.class, args);
    }
}
