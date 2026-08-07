package cm.schoolmanage.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class CreateFeeScheduleRequest {

    @NotNull
    private UUID establishmentId;

    /** Null = s'applique a toutes les classes de l'etablissement pour cette annee. */
    private UUID classId;

    @NotBlank
    private String academicYear;

    @NotBlank
    private String label;

    @NotNull
    @Positive
    private BigDecimal amount;

    private String currency;
}
