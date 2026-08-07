package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.domain.ClassSubject;
import cm.schoolmanage.admin.dto.AssignSubjectToClassRequest;
import cm.schoolmanage.admin.exception.DuplicateResourceException;
import cm.schoolmanage.admin.repository.ClassSubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Le "programme" d'une classe : quelles matieres y sont enseignees. Repond au besoin
 * exprime - pouvoir associer une liste de matieres a une classe des sa creation.
 */
@Service
@RequiredArgsConstructor
public class ClassSubjectService {

    private final ClassSubjectRepository classSubjectRepository;
    private final SchoolClassService schoolClassService;
    private final SubjectService subjectService;

    public ClassSubject assign(UUID classId, AssignSubjectToClassRequest request) {
        schoolClassService.getById(classId);
        subjectService.getById(request.getSubjectId());

        ClassSubject classSubject = ClassSubject.builder()
                .classId(classId)
                .subjectId(request.getSubjectId())
                .defaultCoefficient(request.getDefaultCoefficient())
                .build();
        try {
            return classSubjectRepository.save(classSubject);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Cette matiere est deja associee a cette classe");
        }
    }

    public List<ClassSubject> listForClass(UUID classId) {
        schoolClassService.getById(classId);
        return classSubjectRepository.findByClassId(classId);
    }
}
