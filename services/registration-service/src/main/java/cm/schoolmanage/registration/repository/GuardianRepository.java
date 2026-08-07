package cm.schoolmanage.registration.repository;

import cm.schoolmanage.registration.domain.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GuardianRepository extends JpaRepository<Guardian, UUID> {
    List<Guardian> findByRegistrationId(UUID registrationId);

    List<Guardian> findByEmail(String email);
}
