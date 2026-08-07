package cm.schoolmanage.auth.dto;

import cm.schoolmanage.auth.domain.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateStatusRequest {

    @NotNull
    private UserStatus status;
}
