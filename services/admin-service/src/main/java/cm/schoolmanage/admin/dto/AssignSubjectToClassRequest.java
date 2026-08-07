package cm.schoolmanage.admin.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AssignSubjectToClassRequest {

    @NotNull
    private UUID subjectId;

    @Positive
    private Double defaultCoefficient;
}
