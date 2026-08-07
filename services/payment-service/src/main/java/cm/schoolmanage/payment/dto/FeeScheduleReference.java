package cm.schoolmanage.payment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Reponse (partielle) de GET /api/v1/admin/fee-schedules/{id} - juste ce dont
 * payment-service a besoin pour valider un montant et deriver devise/etablissement
 * plutot que de faire confiance aux valeurs envoyees par le client.
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class FeeScheduleReference {

    private UUID id;
    private UUID establishmentId;
    private UUID classId;
    private String academicYear;
    private String label;
    private BigDecimal amount;
    private String currency;
}
