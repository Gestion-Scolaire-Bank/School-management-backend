package cm.schoolmanage.auth.config;

import cm.schoolmanage.auth.domain.User;
import cm.schoolmanage.auth.domain.UserStatus;
import cm.schoolmanage.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Cree un compte Administrateur de demarrage si la base est vide - sans lui, une installation
 * neuve (base vide) n'a aucun moyen de creer le tout premier compte : POST /api/auth/register
 * exige desormais un JWT Administrateur (cf. faille corrigee ou n'importe qui pouvait
 * s'auto-inscrire ADMINISTRATEUR sans authentification), et il n'existe pas d'auto-inscription
 * cote frontend. Le mot de passe genere est affiche UNE SEULE FOIS dans les logs au demarrage -
 * a utiliser immediatement pour se connecter, puis a changer via "mot de passe oublie".
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private static final String BOOTSTRAP_EMAIL = "admin@schoolmanage.local";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        String temporaryPassword = UUID.randomUUID().toString().substring(0, 12);
        User admin = User.builder()
                .email(BOOTSTRAP_EMAIL)
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .fullName("Administrateur")
                .role("ADMINISTRATEUR")
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(admin);

        log.warn("======================================================================");
        log.warn("Aucun compte n'existait : creation d'un compte Administrateur de demarrage.");
        log.warn("Email    : {}", BOOTSTRAP_EMAIL);
        log.warn("Mot de passe temporaire : {}", temporaryPassword);
        log.warn("Connectez-vous immediatement avec ces identifiants puis changez le mot de");
        log.warn("passe via \"Mot de passe oublie\" - ce message ne sera plus jamais affiche.");
        log.warn("======================================================================");
    }
}
