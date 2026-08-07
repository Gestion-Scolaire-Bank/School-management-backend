package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.GlobalConfig;
import cm.schoolmanage.admin.repository.GlobalConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GlobalConfigService {

    private final GlobalConfigRepository globalConfigRepository;

    public GlobalConfig getConfig() {
        return globalConfigRepository.findById(GlobalConfig.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Configuration globale non initialisee"));
    }
}
