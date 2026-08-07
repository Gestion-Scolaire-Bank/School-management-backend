package cm.schoolmanage.registration.service;

import cm.schoolmanage.registration.dto.SchoolClassReference;
import cm.schoolmanage.registration.exception.UpstreamServiceUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/**
 * Valide les references vers les donnees de reference d'admin-service (etablissement,
 * classe) avant de rattacher une inscription. Contrairement a AuthAccountClient (best-effort :
 * la creation de compte peut etre reconciliee plus tard), cette validation est bloquante -
 * une inscription sans etablissement/classe valide reintroduirait exactement le probleme que
 * ce chantier corrige (className en texte libre, incoherent entre services).
 */
@Service
@Slf4j
public class AdminServiceClient {

    private final RestTemplate restTemplate;
    private final String adminServiceBaseUrl;

    public AdminServiceClient(RestTemplate restTemplate,
                               @Value("${schoolmanage.services.admin.base-url}") String adminServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.adminServiceBaseUrl = adminServiceBaseUrl;
    }

    public void verifyEstablishmentExists(UUID establishmentId) {
        try {
            restTemplate.getForEntity(adminServiceBaseUrl + "/api/v1/admin/establishments/" + establishmentId, Object.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new IllegalArgumentException("Etablissement introuvable : " + establishmentId);
        } catch (RestClientException e) {
            throw new UpstreamServiceUnavailableException(
                    "admin-service injoignable pour verifier l'etablissement " + establishmentId, e);
        }
    }

    public SchoolClassReference getSchoolClass(UUID classId) {
        try {
            return restTemplate.getForEntity(
                    adminServiceBaseUrl + "/api/v1/admin/classes/" + classId, SchoolClassReference.class).getBody();
        } catch (HttpClientErrorException.NotFound e) {
            throw new IllegalArgumentException("Classe introuvable : " + classId);
        } catch (RestClientException e) {
            throw new UpstreamServiceUnavailableException(
                    "admin-service injoignable pour verifier la classe " + classId, e);
        }
    }
}
