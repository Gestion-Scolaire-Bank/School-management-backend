package cm.schoolmanage.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateSubjectRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String code;
}
