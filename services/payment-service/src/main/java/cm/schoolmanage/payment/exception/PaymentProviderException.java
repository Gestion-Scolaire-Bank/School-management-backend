package cm.schoolmanage.payment.exception;

public class PaymentProviderException extends RuntimeException {

    public PaymentProviderException(String provider, Throwable cause) {
        super("Erreur fournisseur " + provider + " : " + cause.getMessage(), cause);
    }
}
