package cm.schoolmanage.registration.exception;

public class DocumentUploadException extends RuntimeException {

    public DocumentUploadException(String documentType, Throwable cause) {
        super("Echec de l'upload du document : " + documentType, cause);
    }
}
