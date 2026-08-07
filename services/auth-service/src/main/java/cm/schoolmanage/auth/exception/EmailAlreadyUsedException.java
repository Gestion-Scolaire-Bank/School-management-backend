package cm.schoolmanage.auth.exception;

public class EmailAlreadyUsedException extends RuntimeException {

    public EmailAlreadyUsedException(String email) {
        super("Email deja utilise : " + email);
    }
}
