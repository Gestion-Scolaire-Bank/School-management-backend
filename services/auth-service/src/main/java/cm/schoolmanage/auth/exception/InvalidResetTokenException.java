package cm.schoolmanage.auth.exception;

public class InvalidResetTokenException extends RuntimeException {

    public InvalidResetTokenException() {
        super("Lien de reinitialisation invalide ou expire - demandez-en un nouveau");
    }
}
