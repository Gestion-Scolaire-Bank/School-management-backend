package cm.schoolmanage.admin.dto;

import cm.schoolmanage.admin.domain.SchoolClass;
import cm.schoolmanage.admin.domain.SchoolClassStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class SchoolClassResponse {

    private UUID id;
    private UUID establishmentId;
    private String name;
    private String level;
    private String academicYear;
    private UUID headTeacherId;
    private SchoolClassStatus status;
    private Instant createdAt;

    public static SchoolClassResponse from(SchoolClass schoolClass) {
        return SchoolClassResponse.builder()
                .id(schoolClass.getId())
                .establishmentId(schoolClass.getEstablishmentId())
                .name(schoolClass.getName())
                .level(schoolClass.getLevel())
                .academicYear(schoolClass.getAcademicYear())
                .headTeacherId(schoolClass.getHeadTeacherId())
                .status(schoolClass.getStatus())
                .createdAt(schoolClass.getCreatedAt())
                .build();
    }
}
