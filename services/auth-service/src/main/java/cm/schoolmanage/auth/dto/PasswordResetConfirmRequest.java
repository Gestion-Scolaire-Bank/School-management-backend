package cm.schoolmanage.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetConfirmRequest {

    @NotBlank
    private String token;

    @NotBlank
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caracteres")
    private String newPassword;
}
