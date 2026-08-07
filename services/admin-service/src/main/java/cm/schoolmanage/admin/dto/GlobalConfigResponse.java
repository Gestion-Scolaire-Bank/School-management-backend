package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.GlobalConfig;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Builder
public class GlobalConfigResponse {

    private String currentAcademicYear;
    private LocalDate termStartDate;
    private LocalDate termEndDate;
    private String currency;
    private BigDecimal defaultTuitionFee;
    private Instant updatedAt;

    public static GlobalConfigResponse from(GlobalConfig config) {
        return GlobalConfigResponse.builder()
                .currentAcademicYear(config.getCurrentAcademicYear())
                .termStartDate(config.getTermStartDate())
                .termEndDate(config.getTermEndDate())
                .currency(config.getCurrency())
                .defaultTuitionFee(config.getDefaultTuitionFee())
                .updatedAt(config.getUpdatedAt())
                .build();
    }
}
