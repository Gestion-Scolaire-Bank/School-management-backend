package cm.schoolmanage.payment.domain;

public enum PaymentProvider {
    MTN,
    ORANGE,
    /** Espece recue en personne (etablissement) - enregistree par un Administrateur, jamais
     * declaree par le parent lui-meme (cf. PaymentService - completion immediate, pas d'appel
     * fournisseur externe). */
    CASH
}
