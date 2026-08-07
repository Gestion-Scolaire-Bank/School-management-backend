package cm.schoolmanage.payment.service;

import cm.schoolmanage.payment.domain.Transaction;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Un seul topic "sm.payment.completed", deux consommateurs (notification-service pour
 * {userId, montant, recu_url}, analytics-service pour {montant, etablissementId}) - meme
 * payload, chacun y pioche les champs qui l'interesse (cf. README - Communications sortantes,
 * meme pattern que registration-service).
 */
@Service
@Slf4j
public class PaymentEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public PaymentEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishCompleted(Transaction transaction, String receiptUrl) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", transaction.getUserId());
        payload.put("montant", transaction.getAmount());
        payload.put("recu_url", receiptUrl);
        payload.put("etablissementId", transaction.getEstablishmentId());
        publish("sm.payment.completed", payload);
    }

    public void publishFailed(Transaction transaction, String motif) {
        publish("sm.payment.failed", Map.of("userId", transaction.getUserId(), "motif", motif == null ? "" : motif));
    }

    private void publish(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("Echec de publication de l'evenement {} : {}", topic, e.getMessage());
        }
    }
}
