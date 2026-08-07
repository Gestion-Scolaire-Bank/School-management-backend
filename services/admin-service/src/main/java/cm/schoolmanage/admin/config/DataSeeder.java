package cm.schoolmanage.admin.config;

import cm.schoolmanage.admin.domain.GlobalConfig;
import cm.schoolmanage.admin.repository.GlobalConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;

/**
 * Initialise la configuration globale par defaut au premier demarrage. Il n'existe pas
 * (encore) d'endpoint de creation/modification de la configuration - seulement sa lecture
 * (cf. document de conception - section 5.2) - donc une valeur par defaut est necessaire.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final GlobalConfigRepository globalConfigRepository;

    @Override
    public void run(String... args) {
        if (globalConfigRepository.existsById(GlobalConfig.SINGLETON_ID)) {
            return;
        }
        globalConfigRepository.save(GlobalConfig.builder()
                .id(GlobalConfig.SINGLETON_ID)
                .currentAcademicYear("2025-2026")
                .termStartDate(LocalDate.of(2025, Month.SEPTEMBER, 1))
                .termEndDate(LocalDate.of(2026, Month.JUNE, 30))
                .currency("XAF")
                .defaultTuitionFee(BigDecimal.valueOf(150000))
                .updatedAt(Instant.now())
                .build());
    }
}
