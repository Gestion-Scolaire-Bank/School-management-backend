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
 * Affectation d'un enseignant a une classe/matiere pour une annee scolaire. Source de
 * verite pour autoriser (ou non) un enseignant a saisir des notes / publier des ressources
 * pour une classe donnee (cf. reportcard-service / pedagogic-service, prochaine etape).
 */
@Entity
@Table(name = "teacher_assignments", uniqueConstraints = @UniqueConstraint(
        columnNames = {"teacher_id", "class_id", "subject_id", "academic_year"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "class_id", nullable = false)
    private UUID classId;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
