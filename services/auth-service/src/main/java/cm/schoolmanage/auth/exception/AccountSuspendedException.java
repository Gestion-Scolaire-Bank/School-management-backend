package cm.schoolmanage.auth.exception;

import cm.schoolmanage.auth.domain.UserStatus;

public class AccountSuspendedException extends RuntimeException {

    public AccountSuspendedException(UserStatus status) {
        super("Compte non actif (statut : " + status + ")");
    }
}
