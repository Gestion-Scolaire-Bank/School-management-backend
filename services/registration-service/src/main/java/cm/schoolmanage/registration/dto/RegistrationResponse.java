package cm.schoolmanage.registration.dto;

import cm.schoolmanage.registration.domain.Registration;
import cm.schoolmanage.registration.domain.RegistrationStatus;
import cm.schoolmanage.registration.domain.RegistrationType;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class RegistrationResponse {

    private UUID id;
    private RegistrationType type;
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String email;
    private String phone;
    private String role;
    private String gender;
    private String birthPlace;
    private String address;
    private String nationalNumber;
    private String photoUrl;
    private String registrationNumber;
    private String observation;
    private List<GuardianResponse> guardians;
    private UUID establishmentId;
    private UUID classId;
    private RegistrationStatus status;
    private Map<String, String> documents;
    private Instant createdAt;

    public static RegistrationResponse from(Registration registration) {
        return RegistrationResponse.builder()
                .id(registration.getId())
                .type(registration.getType())
                .firstName(registration.getFirstName())
                .lastName(registration.getLastName())
                .dateOfBirth(registration.getDateOfBirth())
                .email(registration.getEmail())
                .phone(registration.getPhone())
                .role(registration.getRole())
                .gender(registration.getGender())
                .birthPlace(registration.getBirthPlace())
                .address(registration.getAddress())
                .nationalNumber(registration.getNationalNumber())
                .photoUrl(registration.getPhotoUrl())
                .registrationNumber(registration.getRegistrationNumber())
                .observation(registration.getObservation())
                .guardians(registration.getGuardians() == null
                        ? List.of()
                        : registration.getGuardians().stream().map(GuardianResponse::from).toList())
                .establishmentId(registration.getEstablishmentId())
                .classId(registration.getClassId())
                .status(registration.getStatus())
                .documents(registration.getDocuments())
                .createdAt(registration.getCreatedAt())
                .build();
    }
}
