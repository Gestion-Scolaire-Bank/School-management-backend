package cm.schoolmanage.auth.exception;

public class TooManyLoginAttemptsException extends RuntimeException {

    public TooManyLoginAttemptsException() {
        super("Trop de tentatives de connexion echouees. Reessayez dans quelques minutes.");
    }
}
