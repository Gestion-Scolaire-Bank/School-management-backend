package cm.schoolmanage.registration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Getter
@Setter
public class RegisterStaffRequest {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    private String phone;

    private String gender;

    private String birthPlace;

    private String address;

    private String nationalNumber;

    @NotBlank
    private String role;

    @NotNull
    private UUID establishmentId;

    private MultipartFile cv;

    private MultipartFile diploma;
}
