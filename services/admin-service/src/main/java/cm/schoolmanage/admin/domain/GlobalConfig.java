package cm.schoolmanage.admin.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "global_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalConfig {

    /** Identifiant fixe : cette table ne contient qu'une seule ligne (parametrage global). */
    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id;

    private String currentAcademicYear;

    private LocalDate termStartDate;

    private LocalDate termEndDate;

    private String currency;

    private BigDecimal defaultTuitionFee;

    private Instant updatedAt;
}
