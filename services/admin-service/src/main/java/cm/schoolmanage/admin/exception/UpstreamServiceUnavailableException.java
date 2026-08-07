package cm.schoolmanage.admin.exception;

public class UpstreamServiceUnavailableException extends RuntimeException {

    public UpstreamServiceUnavailableException(String serviceName, Throwable cause) {
        super("Service indisponible : " + serviceName, cause);
    }
}
