package cm.schoolmanage.auth.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException() {
        super("Utilisateur introuvable");
    }
}
