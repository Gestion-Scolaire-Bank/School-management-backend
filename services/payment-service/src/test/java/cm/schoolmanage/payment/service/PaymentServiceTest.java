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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private MtnMomoClient mtnMomoClient;

    @Mock
    private OrangeMoneyClient orangeMoneyClient;

    @Mock
    private ReceiptPdfGenerator receiptPdfGenerator;

    @Mock
    private PaymentEventPublisher eventPublisher;

    @Mock
    private AdminServiceClient adminServiceClient;

    private PaymentService service() {
        return new PaymentService(
                transactionRepository, idempotencyService, mtnMomoClient, orangeMoneyClient,
                receiptPdfGenerator, eventPublisher, adminServiceClient, "http://sm-gateway-service:8888");
    }

    private void mockSaveReturnsArgument() {
        when(transactionRepository.save(any())).thenAnswer(invocation -> {
            Transaction t = invocation.getArgument(0);
            if (t.getId() == null) {
                t.setId(UUID.randomUUID());
            }
            return t;
        });
    }

    private FeeScheduleReference feeSchedule(UUID id, BigDecimal amount) {
        FeeScheduleReference reference = new FeeScheduleReference();
        reference.setId(id);
        reference.setEstablishmentId(UUID.randomUUID());
        reference.setAcademicYear("2025-2026");
        reference.setLabel("Frais de scolarite");
        reference.setAmount(amount);
        reference.setCurrency("XAF");
        return reference;
    }

    private InitiateFeesPaymentRequest feesRequest(UUID feeScheduleId) {
        InitiateFeesPaymentRequest request = new InitiateFeesPaymentRequest();
        request.setStudentId("STU-1");
        request.setAmount(BigDecimal.valueOf(50000));
        request.setProvider(PaymentProvider.MTN);
        request.setPayerPhone("+237600000000");
        request.setFeeScheduleId(feeScheduleId);
        return request;
    }

    private void mockNoPriorPayments() {
        lenient().when(transactionRepository.findByStudentIdAndFeeScheduleIdAndStatus(any(), any(), eq(PaymentStatus.COMPLETED)))
                .thenReturn(List.of());
    }

    @Test
    void initiateFeesPayment_succes_appelleLeFournisseurEtEnregistreLaReference() {
        mockSaveReturnsArgument();
        mockNoPriorPayments();
        UUID feeScheduleId = UUID.randomUUID();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(50000)));
        when(mtnMomoClient.initiateTransaction(any(), any(), any(), any())).thenReturn("ref-123");

        InitiationResult result = service().initiateFeesPayment(feesRequest(feeScheduleId), "parent-1", null);

        assertThat(result.alreadyExisted()).isFalse();
        assertThat(result.transaction().getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(result.transaction().getProviderReference()).isEqualTo("ref-123");
        assertThat(result.transaction().getUserId()).isEqualTo("parent-1");
        assertThat(result.transaction().getType()).isEqualTo(PaymentType.FEES);
        assertThat(result.transaction().getFeeScheduleId()).isEqualTo(feeScheduleId);
        assertThat(result.transaction().getCurrency()).isEqualTo("XAF");
    }

    @Test
    void initiateFeesPayment_montantDepasseLeSoldeRestant_leveUneException() {
        UUID feeScheduleId = UUID.randomUUID();
        mockNoPriorPayments();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(30000)));

        assertThatThrownBy(() -> service().initiateFeesPayment(feesRequest(feeScheduleId), "parent-1", null))
                .isInstanceOf(PaymentAmountExceedsBalanceException.class);
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void initiateFeesPayment_tarifDejaEntierementRegle_leveUneException() {
        UUID feeScheduleId = UUID.randomUUID();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(50000)));
        Transaction alreadyPaid = Transaction.builder().amount(BigDecimal.valueOf(50000)).status(PaymentStatus.COMPLETED).build();
        when(transactionRepository.findByStudentIdAndFeeScheduleIdAndStatus("STU-1", feeScheduleId, PaymentStatus.COMPLETED))
                .thenReturn(List.of(alreadyPaid));

        assertThatThrownBy(() -> service().initiateFeesPayment(feesRequest(feeScheduleId), "parent-1", null))
                .isInstanceOf(FeeAlreadySettledException.class);
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void initiateFeesPayment_paiementPartielAutorise_soldeRestantCalculeCorrectement() {
        mockSaveReturnsArgument();
        UUID feeScheduleId = UUID.randomUUID();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(100000)));
        Transaction priorPayment = Transaction.builder().amount(BigDecimal.valueOf(40000)).status(PaymentStatus.COMPLETED).build();
        when(transactionRepository.findByStudentIdAndFeeScheduleIdAndStatus("STU-1", feeScheduleId, PaymentStatus.COMPLETED))
                .thenReturn(List.of(priorPayment));
        when(mtnMomoClient.initiateTransaction(any(), any(), any(), any())).thenReturn("ref-123");

        InitiationResult result = service().initiateFeesPayment(feesRequest(feeScheduleId), "parent-1", null);

        assertThat(result.transaction().getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void initiateFeesPayment_avecCleIdempotenceNouvelle_memoriseLaTransaction() {
        mockSaveReturnsArgument();
        mockNoPriorPayments();
        UUID feeScheduleId = UUID.randomUUID();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(50000)));
        when(idempotencyService.findExistingTransaction("key-1")).thenReturn(Optional.empty());
        when(mtnMomoClient.initiateTransaction(any(), any(), any(), any())).thenReturn("ref-123");

        InitiationResult result = service().initiateFeesPayment(feesRequest(feeScheduleId), "parent-1", "key-1");

        verify(idempotencyService).remember(eq("key-1"), eq(result.transaction().getId()));
    }

    @Test
    void initiateFeesPayment_avecCleIdempotenceExistante_neCreePasDeNouvelleTransaction() {
        UUID existingId = UUID.randomUUID();
        Transaction existing = Transaction.builder()
                .id(existingId)
                .type(PaymentType.FEES)
                .provider(PaymentProvider.MTN)
                .userId("parent-1")
                .amount(BigDecimal.valueOf(50000))
                .currency("XAF")
                .status(PaymentStatus.PENDING)
                .build();
        when(idempotencyService.findExistingTransaction("key-1")).thenReturn(Optional.of(existingId));
        when(transactionRepository.findById(existingId)).thenReturn(Optional.of(existing));

        InitiationResult result = service().initiateFeesPayment(feesRequest(UUID.randomUUID()), "parent-1", "key-1");

        assertThat(result.alreadyExisted()).isTrue();
        assertThat(result.transaction()).isSameAs(existing);
        verify(transactionRepository, never()).save(any());
        verify(mtnMomoClient, never()).initiateTransaction(any(), any(), any(), any());
        verify(adminServiceClient, never()).getFeeSchedule(any());
    }

    @Test
    void initiateFeesPayment_echecFournisseur_marqueFailedEtPublieLEvenement() {
        mockSaveReturnsArgument();
        mockNoPriorPayments();
        UUID feeScheduleId = UUID.randomUUID();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(50000)));
        when(mtnMomoClient.initiateTransaction(any(), any(), any(), any()))
                .thenThrow(new PaymentProviderException("MTN MoMo", new RuntimeException("timeout")));

        InitiationResult result = service().initiateFeesPayment(feesRequest(feeScheduleId), "parent-1", null);

        assertThat(result.transaction().getStatus()).isEqualTo(PaymentStatus.FAILED);
        verify(eventPublisher).publishFailed(eq(result.transaction()), anyString());
    }

    @Test
    void initiateFeesPayment_especes_completeImmediatementSansAppelFournisseur() {
        mockSaveReturnsArgument();
        mockNoPriorPayments();
        UUID feeScheduleId = UUID.randomUUID();
        when(adminServiceClient.getFeeSchedule(feeScheduleId)).thenReturn(feeSchedule(feeScheduleId, BigDecimal.valueOf(50000)));
        when(receiptPdfGenerator.generate(any())).thenReturn("fake-pdf".getBytes());

        InitiateFeesPaymentRequest request = feesRequest(feeScheduleId);
        request.setProvider(PaymentProvider.CASH);
        request.setPayerPhone(null);

        InitiationResult result = service().initiateFeesPayment(request, "admin-1", null);

        assertThat(result.transaction().getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(result.transaction().getReceiptPdf()).isNotNull();
        verify(eventPublisher).publishCompleted(eq(result.transaction()), anyString());
        verify(mtnMomoClient, never()).initiateTransaction(any(), any(), any(), any());
        verify(orangeMoneyClient, never()).initiateTransaction(any(), any(), any(), any());
    }

    @Test
    void initiateSalaryPayment_succes_utiliseLeStaffUserIdCommeUserId() {
        mockSaveReturnsArgument();
        InitiateSalaryPaymentRequest request = new InitiateSalaryPaymentRequest();
        request.setStaffUserId("staff-1");
        request.setAmount(BigDecimal.valueOf(150000));
        request.setCurrency("XAF");
        request.setProvider(PaymentProvider.ORANGE);
        request.setRecipientPhone("+237699999999");
        when(orangeMoneyClient.initiateTransaction(any(), any(), any(), any())).thenReturn("ref-456");

        InitiationResult result = service().initiateSalaryPayment(request, null);

        assertThat(result.transaction().getUserId()).isEqualTo("staff-1");
        assertThat(result.transaction().getType()).isEqualTo(PaymentType.SALARY);
        assertThat(result.transaction().getProviderReference()).isEqualTo("ref-456");
    }

    @Test
    void handleWebhook_succes_marqueCompletedGenereLeRecuEtPublie() {
        Transaction transaction = Transaction.builder()
                .id(UUID.randomUUID())
                .type(PaymentType.FEES)
                .provider(PaymentProvider.MTN)
                .userId("parent-1")
                .amount(BigDecimal.valueOf(50000))
                .currency("XAF")
                .status(PaymentStatus.PENDING)
                .providerReference("ref-123")
                .build();
        when(transactionRepository.findByProviderReference("ref-123")).thenReturn(Optional.of(transaction));
        when(transactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(receiptPdfGenerator.generate(transaction)).thenReturn("fake-pdf".getBytes());

        PaymentWebhookRequest webhook = new PaymentWebhookRequest();
        webhook.setReferenceId("ref-123");
        webhook.setStatus("SUCCESSFUL");

        service().handleWebhook(webhook);

        assertThat(transaction.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(transaction.getReceiptPdf()).isNotNull();
        verify(eventPublisher).publishCompleted(eq(transaction), anyString());
    }

    @Test
    void handleWebhook_echec_marqueFailedEtPublieLaRaison() {
        Transaction transaction = Transaction.builder()
                .id(UUID.randomUUID())
                .type(PaymentType.FEES)
                .provider(PaymentProvider.MTN)
                .userId("parent-1")
                .amount(BigDecimal.valueOf(50000))
                .currency("XAF")
                .status(PaymentStatus.PENDING)
                .providerReference("ref-123")
                .build();
        when(transactionRepository.findByProviderReference("ref-123")).thenReturn(Optional.of(transaction));
        when(transactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentWebhookRequest webhook = new PaymentWebhookRequest();
        webhook.setReferenceId("ref-123");
        webhook.setStatus("FAILED");
        webhook.setReason("Solde insuffisant");

        service().handleWebhook(webhook);

        assertThat(transaction.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(transaction.getFailureReason()).isEqualTo("Solde insuffisant");
        verify(eventPublisher).publishFailed(transaction, "Solde insuffisant");
    }

    @Test
    void handleWebhook_transactionDejaTraitee_neFaitRien() {
        Transaction transaction = Transaction.builder()
                .id(UUID.randomUUID())
                .status(PaymentStatus.COMPLETED)
                .providerReference("ref-123")
                .build();
        when(transactionRepository.findByProviderReference("ref-123")).thenReturn(Optional.of(transaction));

        PaymentWebhookRequest webhook = new PaymentWebhookRequest();
        webhook.setReferenceId("ref-123");
        webhook.setStatus("SUCCESSFUL");

        service().handleWebhook(webhook);

        verify(transactionRepository, never()).save(any());
        verify(eventPublisher, never()).publishCompleted(any(), anyString());
    }

    @Test
    void handleWebhook_referenceInconnue_leveUneException() {
        when(transactionRepository.findByProviderReference("inconnue")).thenReturn(Optional.empty());

        PaymentWebhookRequest webhook = new PaymentWebhookRequest();
        webhook.setReferenceId("inconnue");
        webhook.setStatus("SUCCESSFUL");

        assertThatThrownBy(() -> service().handleWebhook(webhook)).isInstanceOf(TransactionNotFoundException.class);
    }

    @Test
    void getReceipt_nonDisponible_leveUneException() {
        UUID id = UUID.randomUUID();
        Transaction transaction = Transaction.builder().id(id).status(PaymentStatus.PENDING).build();
        when(transactionRepository.findById(id)).thenReturn(Optional.of(transaction));

        assertThatThrownBy(() -> service().getReceipt(id)).isInstanceOf(ReceiptNotAvailableException.class);
    }

    @Test
    void getRevenueReport_sommeUniquementLesTransactionsCompletees() {
        Transaction t1 = Transaction.builder().amount(BigDecimal.valueOf(1000)).status(PaymentStatus.COMPLETED).build();
        Transaction t2 = Transaction.builder().amount(BigDecimal.valueOf(2000)).status(PaymentStatus.COMPLETED).build();
        when(transactionRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(t1, t2));

        RevenueReportResponse report = service().getRevenueReport(null);

        assertThat(report.getTotalRevenue()).isEqualByComparingTo(BigDecimal.valueOf(3000));
        assertThat(report.getTransactionCount()).isEqualTo(2);
    }
}
