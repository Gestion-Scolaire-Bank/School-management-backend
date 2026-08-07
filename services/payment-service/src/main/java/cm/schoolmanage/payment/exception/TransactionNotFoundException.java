package cm.schoolmanage.payment.exception;

import java.util.UUID;

public class TransactionNotFoundException extends RuntimeException {

    public TransactionNotFoundException(UUID id) {
        super("Transaction introuvable : " + id);
    }

    public TransactionNotFoundException(String reference) {
        super("Transaction introuvable pour la reference : " + reference);
    }
}
