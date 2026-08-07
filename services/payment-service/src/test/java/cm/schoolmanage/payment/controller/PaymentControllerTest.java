package cm.schoolmanage.payment.controller;

import cm.schoolmanage.payment.domain.PaymentProvider;
import cm.schoolmanage.payment.domain.PaymentStatus;
import cm.schoolmanage.payment.domain.PaymentType;
import cm.schoolmanage.payment.domain.Transaction;
import cm.schoolmanage.payment.exception.ReceiptNotAvailableException;
import cm.schoolmanage.payment.exception.TransactionNotFoundException;
import cm.schoolmanage.payment.service.InitiationResult;
import cm.schoolmanage.payment.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentService paymentService;

    private Transaction sampleTransaction(PaymentStatus status) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .type(PaymentType.FEES)
                .provider(PaymentProvider.MTN)
                .userId("parent-1")
                .studentId("STU-1")
                .amount(BigDecimal.valueOf(50000))
                .currency("XAF")
                .status(status)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void initierUnPaiementDeFraisDeScolarite_nouvelleTransaction_retourne201() throws Exception {
        Transaction transaction = sampleTransaction(PaymentStatus.PENDING);
        when(paymentService.initiateFeesPayment(any(), any(), any()))
                .thenReturn(new InitiationResult(transaction, false));

        mockMvc.perform(post("/api/v1/payments/fees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "parent-1")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "studentId", "STU-1",
                                "amount", 50000,
                                "provider", "MTN",
                                "payerPhone", "+237600000000",
                                "feeScheduleId", UUID.randomUUID().toString()))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void initierUnPaiementDeFraisDeScolarite_cleIdempotenceDejaVue_retourne200() throws Exception {
        Transaction transaction = sampleTransaction(PaymentStatus.PENDING);
        when(paymentService.initiateFeesPayment(any(), any(), eq("key-1")))
                .thenReturn(new InitiationResult(transaction, true));

        mockMvc.perform(post("/api/v1/payments/fees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "key-1")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "studentId", "STU-1",
                                "amount", 50000,
                                "provider", "MTN",
                                "payerPhone", "+237600000000",
                                "feeScheduleId", UUID.randomUUID().toString()))))
                .andExpect(status().isOk());
    }

    @Test
    void initierUnPaiementDeFraisDeScolarite_montantInvalide_retourne400() throws Exception {
        mockMvc.perform(post("/api/v1/payments/fees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "studentId", "STU-1",
                                "amount", 0,
                                "provider", "MTN",
                                "payerPhone", "+237600000000",
                                "feeScheduleId", UUID.randomUUID().toString()))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void consulterLeStatutDUneTransaction_retourne200() throws Exception {
        Transaction transaction = sampleTransaction(PaymentStatus.COMPLETED);
        when(paymentService.get(transaction.getId())).thenReturn(transaction);

        mockMvc.perform(get("/api/v1/payments/{id}/status", transaction.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void consulterLeStatutDUneTransaction_introuvable_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(paymentService.get(id)).thenThrow(new TransactionNotFoundException(id));

        mockMvc.perform(get("/api/v1/payments/{id}/status", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void telechargerLeRecuPdf_disponible_retourneLePdf() throws Exception {
        UUID id = UUID.randomUUID();
        when(paymentService.getReceipt(id)).thenReturn("fake-pdf".getBytes());

        mockMvc.perform(get("/api/v1/payments/{id}/receipt", id))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
    }

    @Test
    void telechargerLeRecuPdf_nonDisponible_retourne404() throws Exception {
        UUID id = UUID.randomUUID();
        when(paymentService.getReceipt(id)).thenThrow(new ReceiptNotAvailableException(id));

        mockMvc.perform(get("/api/v1/payments/{id}/receipt", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void notificationDePaiementMtn_retourne200() throws Exception {
        mockMvc.perform(post("/api/v1/payments/webhook/mtn")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "referenceId", "ref-123",
                                "status", "SUCCESSFUL"))))
                .andExpect(status().isOk());
    }

    @Test
    void historiqueDesPaiementsDUnEleve_retourneLaListe() throws Exception {
        when(paymentService.getStudentHistory("STU-1")).thenReturn(List.of(sampleTransaction(PaymentStatus.COMPLETED)));

        mockMvc.perform(get("/api/v1/payments/student/STU-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
