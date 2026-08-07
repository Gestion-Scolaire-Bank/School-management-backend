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
 * Appel illustratif/best-effort vers le sandbox Orange Money Web Payment. Sans identifiants
 * reels (SM_PAYMENT_ORANGE_API_KEY), cet appel echoue en dev - la transaction bascule alors en
 * FAILED, cf. PaymentService.requestProviderPayment.
 */
@Component
public class OrangeMoneyClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;

    public OrangeMoneyClient(RestTemplate restTemplate,
                              @Value("${schoolmanage.payment.orange.base-url}") String baseUrl,
                              @Value("${schoolmanage.payment.orange.api-key}") String apiKey) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    public String initiateTransaction(BigDecimal amount, String currency, String payerPhone, String reference) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            Map<String, Object> body = Map.of(
                    "merchant_key", reference,
                    "currency", currency,
                    "amount", amount.toPlainString(),
                    "customer_msisdn", payerPhone);

            restTemplate.postForEntity(
                    baseUrl + "/dev/v1/webpayment", new HttpEntity<>(body, headers), String.class);
            return reference;
        } catch (RestClientException e) {
            throw new PaymentProviderException("Orange Money", e);
        }
    }
}
