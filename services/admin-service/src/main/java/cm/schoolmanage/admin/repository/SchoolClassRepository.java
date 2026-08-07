package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, UUID> {

    List<SchoolClass> findByEstablishmentId(UUID establishmentId);
}
