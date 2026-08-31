package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.Establishment;
import cm.schoolmanage.admin.domain.EstablishmentStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class EstablishmentResponse {

    private UUID id;
    private String name;
    private String address;
    private String city;
    private String phone;
    private String email;
    private String timeFormat;
    private String timeZone;
    private String currency;
    private String slogan;
    private String description;
    private EstablishmentStatus status;
    private Instant createdAt;

    public static EstablishmentResponse from(Establishment establishment) {
        return EstablishmentResponse.builder()
                .id(establishment.getId())
                .name(establishment.getName())
                .address(establishment.getAddress())
                .city(establishment.getCity())
                .phone(establishment.getPhone())
                .email(establishment.getEmail())
                .timeFormat(establishment.getTimeFormat())
                .timeZone(establishment.getTimeZone())
                .currency(establishment.getCurrency())
                .slogan(establishment.getSlogan())
                .description(establishment.getDescription())
                .status(establishment.getStatus())
                .createdAt(establishment.getCreatedAt())
                .build();
    }
}
