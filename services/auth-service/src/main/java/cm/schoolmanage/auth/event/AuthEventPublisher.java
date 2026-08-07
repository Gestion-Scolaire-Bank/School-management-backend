package cm.schoolmanage.auth.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/** Publie les evenements sortants d'auth-service (cf. README - Communications sortantes). */
@Service
@Slf4j
public class AuthEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String accountCreatedTopic;
    private final String userCreatedTopic;
    private final String passwordResetRequestedTopic;

    public AuthEventPublisher(KafkaTemplate<String, String> kafkaTemplate,
                               ObjectMapper objectMapper,
                               @Value("${schoolmanage.kafka.topic.account-created}") String accountCreatedTopic,
                               @Value("${schoolmanage.kafka.topic.user-created}") String userCreatedTopic,
                               @Value("${schoolmanage.kafka.topic.password-reset-requested}")
                               String passwordResetRequestedTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.accountCreatedTopic = accountCreatedTopic;
        this.userCreatedTopic = userCreatedTopic;
        this.passwordResetRequestedTopic = passwordResetRequestedTopic;
    }

    /**
     * Compte nouvellement cree : un seul email "bienvenue, definissez votre mot de passe" avec
     * le lien de definition (meme mecanisme que password-reset, mais un texte different de
     * "reinitialisation" - avant cette fusion, register() publiait un WELCOME sans lien puis
     * l'appelant (registration-service) declenchait un 2e email de "reinitialisation" separe,
     * ce qui n'avait pas de sens pour quelqu'un qui n'avait encore jamais eu de mot de passe.
     */
    public void publishAccountCreated(String email, String fullName, String setPasswordUrl) {
        publish(accountCreatedTopic, Map.of("email", email, "nom", fullName, "setPasswordUrl", setPasswordUrl));
    }

    public void publishUserCreated(UUID userId, String email, String role) {
        publish(userCreatedTopic, Map.of("userId", userId.toString(), "email", email, "role", role));
    }

    public void publishPasswordResetRequested(String email, String fullName, String resetUrl) {
        publish(passwordResetRequestedTopic, Map.of("email", email, "nom", fullName, "resetUrl", resetUrl));
    }

    private void publish(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("Echec de publication de l'evenement {} : {}", topic, e.getMessage());
        }
    }
}
