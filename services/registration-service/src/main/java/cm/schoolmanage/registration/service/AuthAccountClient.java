package cm.schoolmanage.registration.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

/**
 * Appelle auth-service pour creer le compte utilisateur associe a une inscription
 * (cf. README - Communications sortantes : REST /api/auth/register, {email, role}).
 * L'appel est best-effort : une panne d'auth-service ne doit pas bloquer l'inscription,
 * coherent avec le pattern Saga (choregraphie, coherence eventuelle) de l'architecture globale.
 *
 * auth-service exige aussi un mot de passe (8+ caracteres) et un nom complet a la creation -
 * un mot de passe aleatoire jamais communique est genere ici. auth-service se charge lui-meme,
 * en interne, de declencher l'email "definissez votre mot de passe" (cf.
 * AuthService#register - un seul appel suffit desormais, la 2e requete separee vers
 * /password-reset/request a ete supprimee : elle creait une fenetre ou le compte pouvait
 * exister sans qu'aucun email n'ait pu partir, si cette 2e requete echouait seule).
 */
@Service
@Slf4j
public class AuthAccountClient {

    private final RestTemplate restTemplate;
    private final String authServiceBaseUrl;

    public AuthAccountClient(RestTemplate restTemplate,
                              @Value("${schoolmanage.services.auth.base-url}") String authServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.authServiceBaseUrl = authServiceBaseUrl;
    }

    public void registerAccount(String email, String fullName, String role) {
        try {
            restTemplate.postForEntity(
                    authServiceBaseUrl + "/api/auth/register",
                    new HttpEntity<>(Map.of(
                            "email", email,
                            "password", UUID.randomUUID().toString(),
                            "fullName", fullName,
                            "role", role)),
                    String.class);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.CONFLICT) {
                // Cas normal, pas une erreur : le meme tuteur inscrit un 2e enfant avec le
                // meme email, ou le compte a deja ete cree via un autre canal - le compte
                // existant reste valable tel quel.
                log.info("Compte deja existant pour {}, rien a faire", email);
            } else {
                log.warn("Impossible de creer le compte aupres d'auth-service pour {} ({})", email, e.getMessage());
            }
        } catch (RestClientException e) {
            log.warn("Impossible de creer le compte aupres d'auth-service pour {} ({})", email, e.getMessage());
        }
    }
}
