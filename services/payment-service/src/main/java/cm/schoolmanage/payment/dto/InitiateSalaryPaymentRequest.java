package cm.schoolmanage.payment.dto;

import cm.schoolmanage.payment.domain.PaymentProvider;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class InitiateSalaryPaymentRequest {

    @NotBlank
    private String staffUserId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    private String currency;

    @NotNull
    private PaymentProvider provider;

    @NotBlank
    private String recipientPhone;

    private String establishmentId;
}
