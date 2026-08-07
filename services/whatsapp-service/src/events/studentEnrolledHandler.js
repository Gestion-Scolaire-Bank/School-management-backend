const groupRepository = require('../repositories/groupRepository');

// Consumer sm.registration.student.enrolled -> ajout automatique au groupe WhatsApp de classe
// (cf. README). Le groupe est cree a la volee s'il n'existe pas encore. parentEmails est un
// tableau (un eleve peut avoir plusieurs tuteurs, chacun avec son propre compte - cf. point de
// coherence "un seul tuteur par eleve") ; l'ancien champ singulier parentEmail est toujours
// accepte pour ne pas casser un producteur qui n'aurait pas encore ete redeploye.
async function handleStudentEnrolled(payload) {
  const { studentId, classId, establishmentId, parentEmails, parentEmail } = payload || {};

  if (!classId || !studentId) {
    console.warn('Evenement sm.registration.student.enrolled ignore (classId/studentId manquant)', payload);
    return;
  }

  const emails = parentEmails || (parentEmail ? [parentEmail] : []);
  // establishmentId vient directement du payload (registration-service le connait deja au
  // moment de l'inscription) - pas besoin d'un aller-retour vers admin-service ici.
  await groupRepository.addMember(classId, { studentId, parentEmails: emails }, establishmentId);
  console.log(`Eleve ${studentId} ajoute au groupe WhatsApp de la classe ${classId}`);
}

module.exports = { handleStudentEnrolled };
