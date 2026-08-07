package cm.schoolmanage.registration.dto;

import cm.schoolmanage.registration.domain.Guardian;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class GuardianResponse {

    private UUID id;
    private String fullName;
    private String email;
    private String phone;

    public static GuardianResponse from(Guardian guardian) {
        return GuardianResponse.builder()
                .id(guardian.getId())
                .fullName(guardian.getFullName())
                .email(guardian.getEmail())
                .phone(guardian.getPhone())
                .build();
    }
}
