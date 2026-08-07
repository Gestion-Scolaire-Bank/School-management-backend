package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.TeacherAssignment;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class TeacherAssignmentResponse {

    private UUID id;
    private UUID establishmentId;
    private UUID teacherId;
    private UUID classId;
    private UUID subjectId;
    private String academicYear;
    private Instant createdAt;

    public static TeacherAssignmentResponse from(TeacherAssignment assignment) {
        return TeacherAssignmentResponse.builder()
                .id(assignment.getId())
                .establishmentId(assignment.getEstablishmentId())
                .teacherId(assignment.getTeacherId())
                .classId(assignment.getClassId())
                .subjectId(assignment.getSubjectId())
                .academicYear(assignment.getAcademicYear())
                .createdAt(assignment.getCreatedAt())
                .build();
    }
}
