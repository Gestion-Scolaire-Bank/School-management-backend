package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.FeeSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FeeScheduleRepository extends JpaRepository<FeeSchedule, UUID> {

    List<FeeSchedule> findByEstablishmentIdAndAcademicYear(UUID establishmentId, String academicYear);
}
