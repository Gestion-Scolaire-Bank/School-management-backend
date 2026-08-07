package cm.schoolmanage.registration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Reponse (partielle) de GET /api/v1/admin/classes/{id} - juste ce dont registration-service
 * a besoin pour valider une reference et connaitre l'etablissement de rattachement.
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class SchoolClassReference {

    private UUID id;
    private UUID establishmentId;
    private String name;
}
