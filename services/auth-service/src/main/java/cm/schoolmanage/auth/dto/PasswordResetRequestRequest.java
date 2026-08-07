package cm.schoolmanage.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetRequestRequest {

    @NotBlank
    @Email
    private String email;
}
