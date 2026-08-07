package cm.schoolmanage.payment.exception;

import java.util.UUID;

public class FeeScheduleNotFoundException extends RuntimeException {

    public FeeScheduleNotFoundException(UUID feeScheduleId) {
        super("Tarif introuvable : " + feeScheduleId);
    }
}
