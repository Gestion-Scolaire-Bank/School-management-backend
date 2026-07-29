package cm.schoolmanage.payment.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Squelette de controleur REST pour payment-service - endpoints extraits du document de
 * conception (section 5.2). Chaque methode est un stub 501 Not Implemented a completer
 * par l'equipe en charge de ce service.
 */
@RestController
public class PaymentController {

    /**
     * Roles autorises : Parent
     * TODO : Initier un paiement de frais de scolarite (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/payments/fees")
    public ResponseEntity<?> initierUnPaiementDeFraisDeScolarite() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin
     * TODO : Initier un paiement de salaire (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/payments/salary")
    public ResponseEntity<?> initierUnPaiementDeSalaire() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Parent / Admin
     * TODO : Consulter le statut d'une transaction (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/v1/payments/{id}/status")
    public ResponseEntity<?> consulterLeStatutDUneTransaction(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Parent
     * TODO : Telecharger le recu PDF (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/v1/payments/{id}/receipt")
    public ResponseEntity<?> telechargerLeRecuPdf(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Systeme (MTN)
     * TODO : Notification de paiement MTN (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/payments/webhook/mtn")
    public ResponseEntity<?> notificationDePaiementMtn() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Systeme (Orange)
     * TODO : Notification de paiement Orange (cf. document de conception - section 5.2)
     */
    @PostMapping("/api/v1/payments/webhook/orange")
    public ResponseEntity<?> notificationDePaiementOrange() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Parent / Admin
     * TODO : Historique des paiements d'un eleve (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/v1/payments/student/{id}")
    public ResponseEntity<?> historiqueDesPaiementsDUnEleve(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Roles autorises : Admin / Directeur
     * TODO : Rapport de recettes (cf. document de conception - section 5.2)
     */
    @GetMapping("/api/v1/payments/reports/revenue")
    public ResponseEntity<?> rapportDeRecettes() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

}
