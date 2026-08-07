package cm.schoolmanage.registration.exception;

import java.util.UUID;

public class RegistrationNotFoundException extends RuntimeException {

    public RegistrationNotFoundException(UUID id) {
        super("Dossier d'inscription introuvable : " + id);
    }
}
