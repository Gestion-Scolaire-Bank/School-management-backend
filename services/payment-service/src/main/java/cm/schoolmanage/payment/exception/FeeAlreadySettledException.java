package cm.schoolmanage.payment.exception;

import java.util.UUID;

public class FeeAlreadySettledException extends RuntimeException {

    public FeeAlreadySettledException(UUID feeScheduleId) {
        super("Ce tarif est deja entierement regle : " + feeScheduleId);
    }
}
