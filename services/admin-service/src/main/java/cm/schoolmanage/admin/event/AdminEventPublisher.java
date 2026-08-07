package cm.schoolmanage.admin.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Publie les evenements de reference scolaire (classe/affectation enseignant/tarif) pour
 * que reportcard-service, pedagogic-service, presence-service, whatsapp-service et
 * payment-service puissent maintenir un cache local en lecture seule (pattern deja utilise
 * par RegistrationEventPublisher) plutot que d'appeler admin-service en synchrone a chaque
 * ecriture.
 */
@Service
@Slf4j
public class AdminEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String classCreatedTopic;
    private final String teacherAssignmentCreatedTopic;
    private final String feeScheduleCreatedTopic;

    public AdminEventPublisher(KafkaTemplate<String, String> kafkaTemplate,
                                ObjectMapper objectMapper,
                                @Value("${schoolmanage.kafka.topic.class-created}") String classCreatedTopic,
                                @Value("${schoolmanage.kafka.topic.teacher-assignment-created}")
                                String teacherAssignmentCreatedTopic,
                                @Value("${schoolmanage.kafka.topic.fee-schedule-created}")
                                String feeScheduleCreatedTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.classCreatedTopic = classCreatedTopic;
        this.teacherAssignmentCreatedTopic = teacherAssignmentCreatedTopic;
        this.feeScheduleCreatedTopic = feeScheduleCreatedTopic;
    }

    public void publishClassCreated(Map<String, Object> payload) {
        publish(classCreatedTopic, payload);
    }

    public void publishTeacherAssignmentCreated(Map<String, Object> payload) {
        publish(teacherAssignmentCreatedTopic, payload);
    }

    public void publishFeeScheduleCreated(Map<String, Object> payload) {
        publish(feeScheduleCreatedTopic, payload);
    }

    private void publish(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("Echec de publication de l'evenement {} : {}", topic, e.getMessage());
        }
    }
}
