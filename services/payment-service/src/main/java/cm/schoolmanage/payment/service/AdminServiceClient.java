package cm.schoolmanage.payment.service;

import cm.schoolmanage.payment.dto.FeeScheduleReference;
import cm.schoolmanage.payment.exception.FeeScheduleNotFoundException;
import cm.schoolmanage.payment.exception.UpstreamServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/**
 * Recupere le tarif reel (FeeSchedule) aupres d'admin-service avant d'accepter un paiement -
 * empeche un parent de payer un montant/devise/etablissement invente au lieu du tarif fixe
 * par l'etablissement.
 */
@Service
public class AdminServiceClient {

    private final RestTemplate restTemplate;
    private final String adminServiceBaseUrl;

    public AdminServiceClient(RestTemplate restTemplate,
                               @Value("${schoolmanage.services.admin.base-url}") String adminServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.adminServiceBaseUrl = adminServiceBaseUrl;
    }

    public FeeScheduleReference getFeeSchedule(UUID feeScheduleId) {
        try {
            return restTemplate.getForEntity(
                    adminServiceBaseUrl + "/api/v1/admin/fee-schedules/" + feeScheduleId, FeeScheduleReference.class).getBody();
        } catch (HttpClientErrorException.NotFound e) {
            throw new FeeScheduleNotFoundException(feeScheduleId);
        } catch (RestClientException e) {
            throw new UpstreamServiceUnavailableException(
                    "admin-service injoignable pour verifier le tarif " + feeScheduleId, e);
        }
    }
}
