package cm.schoolmanage.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;

/**
 * S1 - sm-config-service : referentiel central de configuration (Externalized Configuration).
 * Doit demarrer en premier (avant sm-registry-service et sm-gateway-service), cf. document de
 * conception section 5.1.
 */
@SpringBootApplication
@EnableConfigServer
public class ConfigServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigServiceApplication.class, args);
    }
}
