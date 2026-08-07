package cm.schoolmanage.auth.config;

import cm.schoolmanage.auth.domain.User;
import cm.schoolmanage.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    @Mock
    private UserRepository userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    void baseVide_creeUnCompteAdministrateurDeDemarrage() {
        when(userRepository.count()).thenReturn(0L);

        new DataSeeder(userRepository, passwordEncoder).run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("admin@schoolmanage.local");
        assertThat(saved.getRole()).isEqualTo("ADMINISTRATEUR");
        assertThat(saved.getPasswordHash()).isNotBlank();
    }

    @Test
    void baseNonVide_neCreeAucunCompte() {
        when(userRepository.count()).thenReturn(1L);

        new DataSeeder(userRepository, passwordEncoder).run();

        verify(userRepository, never()).save(any());
    }
}
