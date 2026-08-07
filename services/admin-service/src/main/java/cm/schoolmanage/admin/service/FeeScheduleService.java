package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.FeeSchedule;
import cm.schoolmanage.admin.dto.CreateFeeScheduleRequest;
import cm.schoolmanage.admin.event.AdminEventPublisher;
import cm.schoolmanage.admin.exception.DuplicateResourceException;
import cm.schoolmanage.admin.exception.ResourceNotFoundException;
import cm.schoolmanage.admin.repository.EstablishmentRepository;
import cm.schoolmanage.admin.repository.FeeScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Remplace le "defaultTuitionFee" unique et jamais utilise de GlobalConfig : un tarif reel
 * par etablissement/classe/annee, que payment-service pourra consommer (evenement
 * sm.admin.fee_schedule.created) pour afficher le montant attendu et calculer un solde -
 * au lieu de laisser le parent taper n'importe quel montant.
 */
@Service
@RequiredArgsConstructor
public class FeeScheduleService {

    private final FeeScheduleRepository feeScheduleRepository;
    private final EstablishmentRepository establishmentRepository;
    private final SchoolClassService schoolClassService;
    private final AdminEventPublisher eventPublisher;

    public FeeSchedule create(CreateFeeScheduleRequest request) {
        if (!establishmentRepository.existsById(request.getEstablishmentId())) {
            throw new ResourceNotFoundException("Etablissement introuvable : " + request.getEstablishmentId());
        }
        if (request.getClassId() != null) {
            schoolClassService.getById(request.getClassId());
        }

        FeeSchedule feeSchedule = FeeSchedule.builder()
                .establishmentId(request.getEstablishmentId())
                .classId(request.getClassId())
                .academicYear(request.getAcademicYear())
                .label(request.getLabel())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .build();

        FeeSchedule saved;
        try {
            saved = feeScheduleRepository.save(feeSchedule);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException(
                    "Un tarif \"%s\" existe deja pour cet etablissement/classe en %s"
                            .formatted(request.getLabel(), request.getAcademicYear()));
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("feeScheduleId", saved.getId().toString());
        payload.put("establishmentId", saved.getEstablishmentId().toString());
        payload.put("classId", saved.getClassId() == null ? null : saved.getClassId().toString());
        payload.put("academicYear", saved.getAcademicYear());
        payload.put("label", saved.getLabel());
        payload.put("amount", saved.getAmount());
        payload.put("currency", saved.getCurrency());
        eventPublisher.publishFeeScheduleCreated(payload);

        return saved;
    }

    public List<FeeSchedule> findAll(UUID establishmentId, String academicYear) {
        return feeScheduleRepository.findByEstablishmentIdAndAcademicYear(establishmentId, academicYear);
    }

    public FeeSchedule getById(UUID id) {
        return feeScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarif introuvable : " + id));
    }
}
