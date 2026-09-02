package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.Establishment;
import cm.schoolmanage.admin.dto.CreateEstablishmentRequest;
import cm.schoolmanage.admin.exception.ResourceNotFoundException;
import cm.schoolmanage.admin.repository.EstablishmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EstablishmentService {

    private final EstablishmentRepository establishmentRepository;

    public Establishment create(CreateEstablishmentRequest request) {
        Establishment establishment = Establishment.builder()
                .name(request.getName())
                .address(request.getAddress())
                .city(request.getCity())
                .phone(request.getPhone())
                .email(request.getEmail())
                .timeFormat(request.getTimeFormat())
                .timeZone(request.getTimeZone())
                .currency(request.getCurrency())
                .slogan(request.getSlogan())
                .description(request.getDescription())
                .build();
        return establishmentRepository.save(establishment);
    }

    public List<Establishment> findAll() {
        return establishmentRepository.findAll();
    }

    // New paginated method
    public org.springframework.data.domain.Page<Establishment> findAll(org.springframework.data.domain.Pageable pageable) {
        return establishmentRepository.findAll(pageable);
    }
    public Establishment getById(UUID id) {
        return establishmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable : " + id));
    }
}
