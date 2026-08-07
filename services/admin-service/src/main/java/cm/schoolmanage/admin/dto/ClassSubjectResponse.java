package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.ClassSubject;
import cm.schoolmanage.admin.domain.Subject;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class ClassSubjectResponse {

    private UUID id;
    private UUID classId;
    private UUID subjectId;
    private String subjectName;
    private String subjectCode;
    private Double defaultCoefficient;

    public static ClassSubjectResponse from(ClassSubject classSubject, Subject subject) {
        return ClassSubjectResponse.builder()
                .id(classSubject.getId())
                .classId(classSubject.getClassId())
                .subjectId(classSubject.getSubjectId())
                .subjectName(subject.getName())
                .subjectCode(subject.getCode())
                .defaultCoefficient(classSubject.getDefaultCoefficient())
                .build();
    }
}
