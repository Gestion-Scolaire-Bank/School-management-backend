package cm.schoolmanage.payment.exception;

public class UpstreamServiceUnavailableException extends RuntimeException {

    public UpstreamServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
