package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.TeacherAssignment;
import cm.schoolmanage.admin.dto.CreateTeacherAssignmentRequest;
import cm.schoolmanage.admin.event.AdminEventPublisher;
import cm.schoolmanage.admin.exception.DuplicateResourceException;
import cm.schoolmanage.admin.repository.TeacherAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Source de verite pour "quel enseignant a le droit de noter/publier des ressources pour
 * quelle classe/matiere" - reportcard-service et pedagogic-service consommeront
 * sm.admin.teacher_assignment.created pour construire un cache local d'autorisation
 * (prochaine etape : brancher la verification cote saisie de note).
 */
@Service
@RequiredArgsConstructor
public class TeacherAssignmentService {

    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final SchoolClassService schoolClassService;
    private final SubjectService subjectService;
    private final AdminEventPublisher eventPublisher;

    public TeacherAssignment create(CreateTeacherAssignmentRequest request) {
        schoolClassService.getById(request.getClassId());
        subjectService.getById(request.getSubjectId());

        boolean alreadyAssigned = teacherAssignmentRepository.existsByTeacherIdAndClassIdAndSubjectIdAndAcademicYear(
                request.getTeacherId(), request.getClassId(), request.getSubjectId(), request.getAcademicYear());
        if (alreadyAssigned) {
            throw new DuplicateResourceException("Cet enseignant est deja affecte a cette classe/matiere pour cette annee");
        }

        TeacherAssignment assignment = TeacherAssignment.builder()
                .establishmentId(request.getEstablishmentId())
                .teacherId(request.getTeacherId())
                .classId(request.getClassId())
                .subjectId(request.getSubjectId())
                .academicYear(request.getAcademicYear())
                .build();
        TeacherAssignment saved = teacherAssignmentRepository.save(assignment);

        eventPublisher.publishTeacherAssignmentCreated(Map.of(
                "teacherId", saved.getTeacherId().toString(),
                "classId", saved.getClassId().toString(),
                "subjectId", saved.getSubjectId().toString(),
                "establishmentId", saved.getEstablishmentId().toString(),
                "academicYear", saved.getAcademicYear()));

        return saved;
    }

    public List<TeacherAssignment> findByTeacher(UUID teacherId, String academicYear) {
        return teacherAssignmentRepository.findByTeacherIdAndAcademicYear(teacherId, academicYear);
    }

    public List<TeacherAssignment> findByClass(UUID classId) {
        return teacherAssignmentRepository.findByClassId(classId);
    }
}
