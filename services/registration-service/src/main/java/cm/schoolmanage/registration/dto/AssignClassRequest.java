package cm.schoolmanage.registration.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AssignClassRequest {

    @NotNull
    private UUID classId;
}
