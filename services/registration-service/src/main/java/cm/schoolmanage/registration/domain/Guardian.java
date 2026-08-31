package cm.schoolmanage.registration.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Un tuteur/parent rattache a une inscription d'eleve. Une inscription peut avoir plusieurs
 * tuteurs (ex. pere et mere, chacun avec son propre compte) - remplace l'ancien champ unique
 * Registration.guardianName/email qui ne permettait qu'un seul parent de voir l'enfant dans
 * son espace (cf. point de coherence - un seul tuteur par eleve).
 */
@Entity
@Table(name = "guardians")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guardian {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "registration_id", nullable = false)
    private UUID registrationId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Utilise pour creer le compte PARENT aupres d'auth-service et pour retrouver ses enfants. */
    @Column(nullable = false)
    private String email;

    private String phone;

    private String profession;

    private String relationship;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
