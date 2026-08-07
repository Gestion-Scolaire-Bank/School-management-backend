package cm.schoolmanage.registration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class RegisterStudentRequest {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotNull
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateOfBirth;

    @NotBlank
    private String guardianName;

    @NotBlank
    @Email
    private String parentEmail;

    private String parentPhone;

    /**
     * Deuxieme tuteur/parent optionnel (ex. pere et mere separes, chacun avec son propre
     * compte) - cf. point de coherence "un seul tuteur par eleve". Le nom et l'email doivent
     * etre fournis ensemble, ou aucun des deux (verifie par RegistrationService).
     */
    private String secondGuardianName;

    @Email
    private String secondGuardianEmail;

    private String secondGuardianPhone;

    /**
     * L'etablissement de rattachement est deduit de la classe (une classe appartient a un
     * seul etablissement) - pas besoin de le redemander separement.
     */
    @NotNull
    private UUID classId;

    private MultipartFile photo;

    private MultipartFile birthCertificate;
}
