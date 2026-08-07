package cm.schoolmanage.registration.repository;

import cm.schoolmanage.registration.domain.Registration;
import cm.schoolmanage.registration.domain.RegistrationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RegistrationRepository extends JpaRepository<Registration, UUID> {
    List<Registration> findByClassIdAndType(UUID classId, RegistrationType type);
}
