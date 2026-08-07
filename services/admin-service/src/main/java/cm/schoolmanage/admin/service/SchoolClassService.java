package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.SchoolClass;
import cm.schoolmanage.admin.dto.CreateSchoolClassRequest;
import cm.schoolmanage.admin.event.AdminEventPublisher;
import cm.schoolmanage.admin.exception.DuplicateResourceException;
import cm.schoolmanage.admin.exception.ResourceNotFoundException;
import cm.schoolmanage.admin.repository.EstablishmentRepository;
import cm.schoolmanage.admin.repository.SchoolClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SchoolClassService {

    private final SchoolClassRepository schoolClassRepository;
    private final EstablishmentRepository establishmentRepository;
    private final AdminEventPublisher eventPublisher;

    public SchoolClass create(CreateSchoolClassRequest request) {
        if (!establishmentRepository.existsById(request.getEstablishmentId())) {
            throw new ResourceNotFoundException("Etablissement introuvable : " + request.getEstablishmentId());
        }

        SchoolClass schoolClass = SchoolClass.builder()
                .establishmentId(request.getEstablishmentId())
                .name(request.getName())
                .level(request.getLevel())
                .academicYear(request.getAcademicYear())
                .headTeacherId(request.getHeadTeacherId())
                .build();

        SchoolClass saved;
        try {
            saved = schoolClassRepository.save(schoolClass);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException(
                    "La classe \"%s\" existe deja pour cet etablissement en %s"
                            .formatted(request.getName(), request.getAcademicYear()));
        }

        eventPublisher.publishClassCreated(Map.of(
                "classId", saved.getId().toString(),
                "establishmentId", saved.getEstablishmentId().toString(),
                "name", saved.getName(),
                "level", saved.getLevel(),
                "academicYear", saved.getAcademicYear()));

        return saved;
    }

    public List<SchoolClass> findAll(UUID establishmentId) {
        if (establishmentId != null) {
            return schoolClassRepository.findByEstablishmentId(establishmentId);
        }
        return schoolClassRepository.findAll();
    }

    public SchoolClass getById(UUID id) {
        return schoolClassRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classe introuvable : " + id));
    }
}
