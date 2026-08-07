package cm.schoolmanage.payment.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class RevenueReportResponse {

    private String establishmentId;
    private BigDecimal totalRevenue;
    private int transactionCount;
}
