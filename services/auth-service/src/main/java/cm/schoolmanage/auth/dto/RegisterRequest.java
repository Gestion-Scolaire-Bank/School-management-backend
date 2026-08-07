package cm.schoolmanage.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caracteres")
    private String password;

    @NotBlank
    private String fullName;

    @NotBlank
    @Pattern(regexp = "PARENT|ENSEIGNANT|ADMINISTRATEUR|DIRECTEUR", message = "Role invalide")
    private String role;
}
