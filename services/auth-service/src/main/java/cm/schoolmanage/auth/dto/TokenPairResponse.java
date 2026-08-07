package cm.schoolmanage.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TokenPairResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
}
