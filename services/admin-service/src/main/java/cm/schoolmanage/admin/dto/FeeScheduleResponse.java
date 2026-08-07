package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.FeeSchedule;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class FeeScheduleResponse {

    private UUID id;
    private UUID establishmentId;
    private UUID classId;
    private String academicYear;
    private String label;
    private BigDecimal amount;
    private String currency;
    private Instant createdAt;

    public static FeeScheduleResponse from(FeeSchedule feeSchedule) {
        return FeeScheduleResponse.builder()
                .id(feeSchedule.getId())
                .establishmentId(feeSchedule.getEstablishmentId())
                .classId(feeSchedule.getClassId())
                .academicYear(feeSchedule.getAcademicYear())
                .label(feeSchedule.getLabel())
                .amount(feeSchedule.getAmount())
                .currency(feeSchedule.getCurrency())
                .createdAt(feeSchedule.getCreatedAt())
                .build();
    }
}
