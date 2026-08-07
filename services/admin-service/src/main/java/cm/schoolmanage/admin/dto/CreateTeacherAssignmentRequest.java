package cm.schoolmanage.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateTeacherAssignmentRequest {

    @NotNull
    private UUID establishmentId;

    @NotNull
    private UUID teacherId;

    @NotNull
    private UUID classId;

    @NotNull
    private UUID subjectId;

    @NotBlank
    private String academicYear;
}
