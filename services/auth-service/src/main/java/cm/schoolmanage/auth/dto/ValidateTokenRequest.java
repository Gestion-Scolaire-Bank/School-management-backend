package cm.schoolmanage.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ValidateTokenRequest {

    @NotBlank
    private String token;
}
