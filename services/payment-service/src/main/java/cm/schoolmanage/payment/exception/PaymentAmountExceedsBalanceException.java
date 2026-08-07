package cm.schoolmanage.payment.exception;

import java.math.BigDecimal;

public class PaymentAmountExceedsBalanceException extends RuntimeException {

    public PaymentAmountExceedsBalanceException(BigDecimal requested, BigDecimal remaining) {
        super("Le montant demande (" + requested + ") depasse le solde restant du (" + remaining + ")");
    }
}
