package cm.schoolmanage.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Le programme d'une classe : quelles matieres y sont enseignees, et avec quel coefficient
 * par defaut. Cree l'ecran "creer une classe -> lui associer ses matieres" demande.
 */
@Entity
@Table(name = "class_subjects", uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "subject_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassSubject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "class_id", nullable = false)
    private UUID classId;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "default_coefficient", nullable = false)
    private Double defaultCoefficient;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (defaultCoefficient == null) {
            defaultCoefficient = 1.0;
        }
    }
}
