package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.Subject;
import cm.schoolmanage.admin.dto.CreateSubjectRequest;
import cm.schoolmanage.admin.exception.DuplicateResourceException;
import cm.schoolmanage.admin.exception.ResourceNotFoundException;
import cm.schoolmanage.admin.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;

    public Subject create(CreateSubjectRequest request) {
        Subject subject = Subject.builder()
                .name(request.getName())
                .code(request.getCode().toUpperCase())
                .build();
        try {
            return subjectRepository.save(subject);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Une matiere avec le code \"%s\" existe deja".formatted(subject.getCode()));
        }
    }

    public List<Subject> findAll() {
        return subjectRepository.findAll();
    }

    public Subject getById(UUID id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Matiere introuvable : " + id));
    }
}
