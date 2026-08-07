package cm.schoolmanage.auth.dto;

import cm.schoolmanage.auth.domain.User;
import cm.schoolmanage.auth.domain.UserStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class UserProfileResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String role;
    private UserStatus status;
    private Instant createdAt;

    public static UserProfileResponse from(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
