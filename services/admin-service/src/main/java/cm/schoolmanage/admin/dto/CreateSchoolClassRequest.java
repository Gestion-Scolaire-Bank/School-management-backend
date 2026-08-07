package cm.schoolmanage.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateSchoolClassRequest {

    @NotNull
    private UUID establishmentId;

    @NotBlank
    private String name;

    @NotBlank
    private String level;

    @NotBlank
    private String academicYear;

    private UUID headTeacherId;
}
