package cm.schoolmanage.registration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Un seul topic ("sm.registration.student.enrolled"), plusieurs consommateurs
 * (schoolid-service, notification-service, whatsapp-service) qui piochent chacun les
 * champs qui les interessent dans le payload - cf. README - Communications sortantes.
 */
@Service
@Slf4j
public class RegistrationEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String studentEnrolledTopic;

    public RegistrationEventPublisher(KafkaTemplate<String, String> kafkaTemplate,
                                       ObjectMapper objectMapper,
                                       @Value("${schoolmanage.kafka.topic.student-enrolled}") String studentEnrolledTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.studentEnrolledTopic = studentEnrolledTopic;
    }

    public void publishStudentEnrolled(Map<String, Object> payload) {
        try {
            kafkaTemplate.send(studentEnrolledTopic, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("Echec de publication de l'evenement {} : {}", studentEnrolledTopic, e.getMessage());
        }
    }
}
