package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.ClassSubject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClassSubjectRepository extends JpaRepository<ClassSubject, UUID> {

    List<ClassSubject> findByClassId(UUID classId);
}
