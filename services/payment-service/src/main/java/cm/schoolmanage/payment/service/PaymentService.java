package cm.schoolmanage.payment.service;

import cm.schoolmanage.payment.client.MtnMomoClient;
import cm.schoolmanage.payment.client.OrangeMoneyClient;
import cm.schoolmanage.payment.domain.PaymentProvider;
import cm.schoolmanage.payment.domain.PaymentStatus;
import cm.schoolmanage.payment.domain.PaymentType;
import cm.schoolmanage.payment.domain.Transaction;
import cm.schoolmanage.payment.dto.FeeScheduleReference;
import cm.schoolmanage.payment.dto.InitiateFeesPaymentRequest;
import cm.schoolmanage.payment.dto.InitiateSalaryPaymentRequest;
import cm.schoolmanage.payment.dto.PaymentWebhookRequest;
import cm.schoolmanage.payment.dto.RevenueReportResponse;
import cm.schoolmanage.payment.exception.FeeAlreadySettledException;
import cm.schoolmanage.payment.exception.PaymentAmountExceedsBalanceException;
import cm.schoolmanage.payment.exception.PaymentProviderException;
import cm.schoolmanage.payment.exception.ReceiptNotAvailableException;
import cm.schoolmanage.payment.exception.TransactionNotFoundException;
import cm.schoolmanage.payment.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Set<String> SUCCESS_STATUSES = Set.of("SUCCESSFUL", "SUCCESS");

    private final TransactionRepository transactionRepository;
    private final IdempotencyService idempotencyService;
    private final MtnMomoClient mtnMomoClient;
    private final OrangeMoneyClient orangeMoneyClient;
    private final ReceiptPdfGenerator receiptPdfGenerator;
    private final PaymentEventPublisher eventPublisher;
    private final AdminServiceClient adminServiceClient;
    private final String gatewayUrl;

    public PaymentService(TransactionRepository transactionRepository,
                           IdempotencyService idempotencyService,
                           MtnMomoClient mtnMomoClient,
                           OrangeMoneyClient orangeMoneyClient,
                           ReceiptPdfGenerator receiptPdfGenerator,
                           PaymentEventPublisher eventPublisher,
                           AdminServiceClient adminServiceClient,
                           @Value("${schoolmanage.gateway.url}") String gatewayUrl) {
        this.transactionRepository = transactionRepository;
        this.idempotencyService = idempotencyService;
        this.mtnMomoClient = mtnMomoClient;
        this.orangeMoneyClient = orangeMoneyClient;
        this.receiptPdfGenerator = receiptPdfGenerator;
        this.eventPublisher = eventPublisher;
        this.adminServiceClient = adminServiceClient;
        this.gatewayUrl = gatewayUrl;
    }

    public InitiationResult initiateFeesPayment(InitiateFeesPaymentRequest request, String userId, String idempotencyKey) {
        if (idempotencyKey != null) {
            var existing = idempotencyService.findExistingTransaction(idempotencyKey);
            if (existing.isPresent()) {
                return new InitiationResult(get(existing.get()), true);
            }
        }

        FeeScheduleReference feeSchedule = adminServiceClient.getFeeSchedule(request.getFeeScheduleId());
        BigDecimal alreadyPaid = transactionRepository
                .findByStudentIdAndFeeScheduleIdAndStatus(request.getStudentId(), feeSchedule.getId(), PaymentStatus.COMPLETED)
                .stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = feeSchedule.getAmount().subtract(alreadyPaid);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            throw new FeeAlreadySettledException(feeSchedule.getId());
        }
        if (request.getAmount().compareTo(remaining) > 0) {
            throw new PaymentAmountExceedsBalanceException(request.getAmount(), remaining);
        }

        Transaction transaction = Transaction.builder()
                .type(PaymentType.FEES)
                .provider(request.getProvider())
                .userId(userId)
                .studentId(request.getStudentId())
                .feeScheduleId(feeSchedule.getId())
                .amount(request.getAmount())
                .currency(feeSchedule.getCurrency())
                .establishmentId(feeSchedule.getEstablishmentId().toString())
                .status(PaymentStatus.PENDING)
                .build();
        transaction = transactionRepository.save(transaction);

        if (idempotencyKey != null) {
            idempotencyService.remember(idempotencyKey, transaction.getId());
        }

        // Espece recue en personne : l'argent est deja entre les mains de l'etablissement au
        // moment ou l'Administrateur enregistre le paiement (contrairement a MTN/Orange, ou la
        // transaction reste PENDING jusqu'au webhook du fournisseur) - completion immediate,
        // pas d'appel fournisseur externe.
        if (transaction.getProvider() == PaymentProvider.CASH) {
            completePayment(transaction);
        } else {
            requestProviderPayment(transaction, request.getPayerPhone());
        }
        return new InitiationResult(transaction, false);
    }

    public InitiationResult initiateSalaryPayment(InitiateSalaryPaymentRequest request, String idempotencyKey) {
        if (idempotencyKey != null) {
            var existing = idempotencyService.findExistingTransaction(idempotencyKey);
            if (existing.isPresent()) {
                return new InitiationResult(get(existing.get()), true);
            }
        }

        Transaction transaction = Transaction.builder()
                .type(PaymentType.SALARY)
                .provider(request.getProvider())
                .userId(request.getStaffUserId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .establishmentId(request.getEstablishmentId())
                .status(PaymentStatus.PENDING)
                .build();
        transaction = transactionRepository.save(transaction);

        if (idempotencyKey != null) {
            idempotencyService.remember(idempotencyKey, transaction.getId());
        }

        requestProviderPayment(transaction, request.getRecipientPhone());
        return new InitiationResult(transaction, false);
    }

    private void requestProviderPayment(Transaction transaction, String phone) {
        try {
            String reference = switch (transaction.getProvider()) {
                case MTN -> mtnMomoClient.initiateTransaction(
                        transaction.getAmount(), transaction.getCurrency(), phone, transaction.getId().toString());
                case ORANGE -> orangeMoneyClient.initiateTransaction(
                        transaction.getAmount(), transaction.getCurrency(), phone, transaction.getId().toString());
                // CASH ne passe jamais par ici : initiateFeesPayment() appelle completePayment()
                // directement pour ce provider (pas de fournisseur externe a contacter).
                case CASH -> throw new IllegalStateException("CASH ne doit pas appeler de fournisseur externe");
            };
            transaction.setProviderReference(reference);
            transactionRepository.save(transaction);
        } catch (PaymentProviderException e) {
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureReason("Echec d'initiation aupres du fournisseur : " + e.getMessage());
            transactionRepository.save(transaction);
            eventPublisher.publishFailed(transaction, transaction.getFailureReason());
        }
    }

    public Transaction get(UUID id) {
        return transactionRepository.findById(id).orElseThrow(() -> new TransactionNotFoundException(id));
    }

    public byte[] getReceipt(UUID id) {
        Transaction transaction = get(id);
        if (transaction.getReceiptPdf() == null) {
            throw new ReceiptNotAvailableException(id);
        }
        return transaction.getReceiptPdf();
    }

    /** Idempotent : un webhook rejoue pour une transaction deja traitee (COMPLETED/FAILED) est ignore. */
    public void handleWebhook(PaymentWebhookRequest request) {
        Transaction transaction = transactionRepository.findByProviderReference(request.getReferenceId())
                .orElseThrow(() -> new TransactionNotFoundException(request.getReferenceId()));

        if (transaction.getStatus() != PaymentStatus.PENDING) {
            return;
        }

        boolean success = SUCCESS_STATUSES.contains(request.getStatus() == null ? "" : request.getStatus().toUpperCase());
        if (success) {
            completePayment(transaction);
        } else {
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureReason(request.getReason());
            transactionRepository.save(transaction);
            eventPublisher.publishFailed(transaction, request.getReason());
        }
    }

    /** Marque une transaction reglee, genere son recu et publie l'evenement "completed" - point
     * commun entre un webhook fournisseur reussi (MTN/Orange) et un paiement CASH, complete
     * immediatement des sa creation. */
    private void completePayment(Transaction transaction) {
        transaction.setStatus(PaymentStatus.COMPLETED);
        transaction.setReceiptPdf(receiptPdfGenerator.generate(transaction));
        transactionRepository.save(transaction);
        eventPublisher.publishCompleted(transaction, gatewayUrl + "/api/v1/payments/" + transaction.getId() + "/receipt");
    }

    public List<Transaction> getStudentHistory(String studentId) {
        return transactionRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }

    public RevenueReportResponse getRevenueReport(String establishmentId) {
        List<Transaction> completed = establishmentId != null
                ? transactionRepository.findByStatusAndEstablishmentId(PaymentStatus.COMPLETED, establishmentId)
                : transactionRepository.findByStatus(PaymentStatus.COMPLETED);

        BigDecimal total = completed.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return RevenueReportResponse.builder()
                .establishmentId(establishmentId)
                .totalRevenue(total)
                .transactionCount(completed.size())
                .build();
    }
}
