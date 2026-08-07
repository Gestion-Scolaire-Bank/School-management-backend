package cm.schoolmanage.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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
 * Une classe d'un etablissement (ex. "6eme A", CM2...). Remplace le champ texte libre
 * "className"/"classId" jusqu'ici ressaisi independamment dans chaque service - c'est
 * desormais admin-service la source de verite, les autres services ne stockent que cet id
 * (cf. proposition de schema - coherence inter-services).
 */
@Entity
@Table(name = "school_classes", uniqueConstraints = @UniqueConstraint(
        columnNames = {"establishment_id", "name", "academic_year"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchoolClass {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String level;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(name = "head_teacher_id")
    private UUID headTeacherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SchoolClassStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = SchoolClassStatus.ACTIVE;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
