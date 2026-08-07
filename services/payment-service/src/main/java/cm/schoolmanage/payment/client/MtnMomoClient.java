package cm.schoolmanage.payment.client;

import cm.schoolmanage.payment.exception.PaymentProviderException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Appel illustratif/best-effort vers le sandbox MTN MoMo (Collections - "requesttopay").
 * Sans identifiants reels (SM_PAYMENT_MTN_API_KEY), cet appel echoue en dev - c'est le
 * comportement attendu : PaymentService bascule alors la transaction en FAILED plutot que de
 * la laisser bloquee, cf. PaymentService.requestProviderPayment.
 */
@Component
public class MtnMomoClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;

    public MtnMomoClient(RestTemplate restTemplate,
                          @Value("${schoolmanage.payment.mtn.base-url}") String baseUrl,
                          @Value("${schoolmanage.payment.mtn.api-key}") String apiKey) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    public String initiateTransaction(BigDecimal amount, String currency, String payerPhone, String reference) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("X-Reference-Id", reference);

            Map<String, Object> body = Map.of(
                    "amount", amount.toPlainString(),
                    "currency", currency,
                    "externalId", reference,
                    "payer", Map.of("partyIdType", "MSISDN", "partyId", payerPhone));

            restTemplate.postForEntity(
                    baseUrl + "/collection/v1_0/requesttopay", new HttpEntity<>(body, headers), String.class);
            return reference;
        } catch (RestClientException e) {
            throw new PaymentProviderException("MTN MoMo", e);
        }
    }
}
