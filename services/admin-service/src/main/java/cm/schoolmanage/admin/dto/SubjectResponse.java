package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.Subject;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class SubjectResponse {

    private UUID id;
    private String name;
    private String code;

    public static SubjectResponse from(Subject subject) {
        return SubjectResponse.builder()
                .id(subject.getId())
                .name(subject.getName())
                .code(subject.getCode())
                .build();
    }
}
