package cm.schoolmanage.payment.controller;

import cm.schoolmanage.payment.dto.InitiateFeesPaymentRequest;
import cm.schoolmanage.payment.dto.InitiateSalaryPaymentRequest;
import cm.schoolmanage.payment.dto.PaymentWebhookRequest;
import cm.schoolmanage.payment.dto.RevenueReportResponse;
import cm.schoolmanage.payment.dto.TransactionResponse;
import cm.schoolmanage.payment.service.InitiationResult;
import cm.schoolmanage.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Controleur REST pour payment-service - endpoints extraits du document de conception
 * (section 5.2, UC9-UC12).
 */
@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Roles autorises : Parent / Admin (Admin pour un paiement en especes recu en personne -
     * provider CASH, complete immediatement, cf. PaymentService).
     */
    @PostMapping("/api/v1/payments/fees")
    public ResponseEntity<TransactionResponse> initierUnPaiementDeFraisDeScolarite(
            @Valid @RequestBody InitiateFeesPaymentRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        InitiationResult result = paymentService.initiateFeesPayment(request, userId, idempotencyKey);
        HttpStatus status = result.alreadyExisted() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(TransactionResponse.from(result.transaction()));
    }

    /**
     * Roles autorises : Admin
     */
    @PostMapping("/api/v1/payments/salary")
    public ResponseEntity<TransactionResponse> initierUnPaiementDeSalaire(
            @Valid @RequestBody InitiateSalaryPaymentRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        InitiationResult result = paymentService.initiateSalaryPayment(request, idempotencyKey);
        HttpStatus status = result.alreadyExisted() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(TransactionResponse.from(result.transaction()));
    }

    /**
     * Roles autorises : Parent / Admin
     */
    @GetMapping("/api/v1/payments/{id}/status")
    public ResponseEntity<TransactionResponse> consulterLeStatutDUneTransaction(@PathVariable UUID id) {
        return ResponseEntity.ok(TransactionResponse.from(paymentService.get(id)));
    }

    /**
     * Roles autorises : Parent
     */
    @GetMapping("/api/v1/payments/{id}/receipt")
    public ResponseEntity<byte[]> telechargerLeRecuPdf(@PathVariable UUID id) {
        byte[] pdf = paymentService.getReceipt(id);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(pdf);
    }

    /**
     * Roles autorises : Systeme (MTN)
     */
    @PostMapping("/api/v1/payments/webhook/mtn")
    public ResponseEntity<Void> notificationDePaiementMtn(@Valid @RequestBody PaymentWebhookRequest request) {
        paymentService.handleWebhook(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Roles autorises : Systeme (Orange)
     */
    @PostMapping("/api/v1/payments/webhook/orange")
    public ResponseEntity<Void> notificationDePaiementOrange(@Valid @RequestBody PaymentWebhookRequest request) {
        paymentService.handleWebhook(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Roles autorises : Parent / Admin
     */
    @GetMapping("/api/v1/payments/student/{id}")
    public ResponseEntity<List<TransactionResponse>> historiqueDesPaiementsDUnEleve(@PathVariable String id) {
        List<TransactionResponse> history = paymentService.getStudentHistory(id).stream()
                .map(TransactionResponse::from)
                .toList();
        return ResponseEntity.ok(history);
    }

    /**
     * Roles autorises : Admin / Directeur
     */
    @GetMapping("/api/v1/payments/reports/revenue")
    public ResponseEntity<RevenueReportResponse> rapportDeRecettes(
            @RequestParam(value = "establishmentId", required = false) String establishmentId) {
        return ResponseEntity.ok(paymentService.getRevenueReport(establishmentId));
    }
}
