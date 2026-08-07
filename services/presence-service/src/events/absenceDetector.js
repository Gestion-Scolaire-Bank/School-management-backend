const presenceRepository = require('../repositories/presenceRepository');
const { publish } = require('../kafka/client');

// Compare le roster attendu (fourni par l'appelant) aux eleves ayant effectivement pointe pour
// une classe/date donnee, et publie une alerte pour chaque absence.
//
// Aucune source de roster n'existe encore dans la plateforme (registration-service n'expose pas
// de liste d'eleves par classe) : cette fonction implemente la logique de detection et est prete
// a etre reliee des qu'une source de roster existera (appel REST a registration-service ou job
// planifie alimente autrement) - elle n'est pas cablee a un cron pour l'instant.
async function detectAbsences(classId, date, enrolledStudentIds) {
  const presentIds = new Set(await presenceRepository.findPresentPersonIds(classId, date));
  const absentIds = enrolledStudentIds.filter((studentId) => !presentIds.has(studentId));

  await Promise.all(
    absentIds.map((studentId) =>
      publish('sm.presence.absence.detected', { studentId, date }).catch((error) => {
        console.warn(`Echec de publication sm.presence.absence.detected pour ${studentId} : ${error.message}`);
      })
    )
  );

  return absentIds;
}

module.exports = { detectAbsences };
