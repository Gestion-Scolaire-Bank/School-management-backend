package cm.schoolmanage.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ValidateTokenResponse {

    private boolean valid;
    private String userId;
    private String email;
    private String role;

    public static ValidateTokenResponse invalid() {
        return ValidateTokenResponse.builder().valid(false).build();
    }

    public static ValidateTokenResponse valid(String userId, String email, String role) {
        return ValidateTokenResponse.builder().valid(true).userId(userId).email(email).role(role).build();
    }
}
