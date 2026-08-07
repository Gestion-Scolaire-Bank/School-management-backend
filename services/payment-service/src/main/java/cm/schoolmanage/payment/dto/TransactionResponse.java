package cm.schoolmanage.payment.dto;

import cm.schoolmanage.payment.domain.Transaction;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class TransactionResponse {

    private UUID id;
    private String type;
    private String provider;
    private String userId;
    private String studentId;
    private UUID feeScheduleId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String providerReference;
    private String failureReason;
    private Instant createdAt;
    private Instant updatedAt;

    public static TransactionResponse from(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .type(transaction.getType().name())
                .provider(transaction.getProvider().name())
                .userId(transaction.getUserId())
                .studentId(transaction.getStudentId())
                .feeScheduleId(transaction.getFeeScheduleId())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .status(transaction.getStatus().name())
                .providerReference(transaction.getProviderReference())
                .failureReason(transaction.getFailureReason())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }
}
