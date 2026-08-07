package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.TeacherAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeacherAssignmentRepository extends JpaRepository<TeacherAssignment, UUID> {

    List<TeacherAssignment> findByTeacherIdAndAcademicYear(UUID teacherId, String academicYear);

    List<TeacherAssignment> findByClassId(UUID classId);

    boolean existsByTeacherIdAndClassIdAndSubjectIdAndAcademicYear(
            UUID teacherId, UUID classId, UUID subjectId, String academicYear);
}
