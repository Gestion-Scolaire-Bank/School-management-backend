package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {
}
