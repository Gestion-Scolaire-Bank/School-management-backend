package cm.schoolmanage.admin.repository;

import cm.schoolmanage.admin.domain.GlobalConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalConfigRepository extends JpaRepository<GlobalConfig, Long> {
}
