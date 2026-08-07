package cm.schoolmanage.payment.dto;

import cm.schoolmanage.payment.domain.PaymentProvider;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class InitiateFeesPaymentRequest {

    @NotBlank
    private String studentId;

    /** Montant paye maintenant (peut etre un versement partiel), borne server-side par le solde du. */
    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    @NotNull
    private PaymentProvider provider;

    /** Requis pour MTN/ORANGE (numero a debiter), sans objet pour CASH - laisse au bon vouloir
     * de l'appelant plutot qu'impose ici, pour ne pas dupliquer une regle deja geree cote client. */
    private String payerPhone;

    @NotNull
    private UUID feeScheduleId;
}
