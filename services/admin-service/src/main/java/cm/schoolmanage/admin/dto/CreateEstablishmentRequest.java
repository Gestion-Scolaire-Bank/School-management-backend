package cm.schoolmanage.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateEstablishmentRequest {

    @NotBlank
    private String name;

    private String address;

    private String city;

    private String phone;

    @Email
    private String email;
}
