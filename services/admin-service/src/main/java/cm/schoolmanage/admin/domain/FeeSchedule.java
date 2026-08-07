package cm.schoolmanage.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Un tarif attendu (frais de scolarite, inscription, cantine...) pour une annee scolaire,
 * rattache a un etablissement et optionnellement a une classe precise (null = s'applique a
 * toutes les classes de l'etablissement). Remplace le "defaultTuitionFee" unique de
 * GlobalConfig, jamais utilise par payment-service pour valider un paiement.
 *
 * La contrainte d'unicite empeche la double-saisie accidentelle du meme tarif (constate en
 * test manuel : deux clics sur "Creer" produisant deux tarifs identiques). Limitation connue :
 * Postgres traite deux valeurs NULL comme distinctes dans une contrainte UNIQUE, donc deux
 * tarifs avec class_id NULL (s'appliquant a toute la classe) et le meme libelle ne seraient
 * pas bloques - cas juge acceptable pour l'instant, le doublon reel rencontre avait un class_id
 * renseigne.
 */
@Entity
@Table(name = "fee_schedules", uniqueConstraints = @UniqueConstraint(
        columnNames = {"establishment_id", "class_id", "academic_year", "label"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "class_id")
    private UUID classId;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (currency == null) {
            currency = "XAF";
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
