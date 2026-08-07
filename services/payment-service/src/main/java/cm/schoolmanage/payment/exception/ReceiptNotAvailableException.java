package cm.schoolmanage.payment.exception;

import java.util.UUID;

public class ReceiptNotAvailableException extends RuntimeException {

    public ReceiptNotAvailableException(UUID id) {
        super("Recu non disponible pour la transaction " + id + " (paiement non complete)");
    }
}
