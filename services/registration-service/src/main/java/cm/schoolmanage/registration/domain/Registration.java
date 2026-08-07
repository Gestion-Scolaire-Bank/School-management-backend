package cm.schoolmanage.registration.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationType type;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private LocalDate dateOfBirth;

    /** Email utilise pour la creation du compte aupres d'auth-service (parent pour un eleve, personnel pour un staff). */
    private String email;

    private String phone;

    /** Role RBAC transmis a auth-service (ENSEIGNANT / ADMINISTRATEUR / DIRECTEUR pour le personnel). Non utilise pour un eleve : le role PARENT est desormais attache a chaque Guardian, pas a l'eleve lui-meme. */
    private String role;

    /**
     * Non persiste : rattache par le service au moment de la lecture (cf.
     * RegistrationService#attachGuardians). Un eleve peut avoir plusieurs tuteurs, chacun avec
     * son propre compte - remplace l'ancien champ unique guardianName/email qui limitait le
     * suivi de l'enfant a un seul parent.
     */
    @Transient
    @Builder.Default
    private List<Guardian> guardians = new ArrayList<>();

    /** Etablissement de rattachement - obligatoire, valide aupres d'admin-service a l'inscription. */
    @Column(nullable = false)
    private UUID establishmentId;

    /** Classe de l'eleve - uniquement pour type=STUDENT (cf. RegistrationService#assignClass). */
    private UUID classId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationStatus status;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "registration_documents", joinColumns = @JoinColumn(name = "registration_id"))
    @MapKeyColumn(name = "document_type")
    @Column(name = "document_url", length = 1000)
    private Map<String, String> documents = new HashMap<>();

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
            status = RegistrationStatus.VALIDATED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
