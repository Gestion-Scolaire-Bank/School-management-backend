package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.Establishment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EstablishmentRepository extends JpaRepository<Establishment, UUID> {
}
