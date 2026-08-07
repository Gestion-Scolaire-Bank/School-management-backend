package cm.schoolmanage.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentWebhookRequest {

    @NotBlank
    private String referenceId;

    /** SUCCESSFUL / SUCCESS ou FAILED, selon le fournisseur. */
    @NotBlank
    private String status;

    private String reason;
}
