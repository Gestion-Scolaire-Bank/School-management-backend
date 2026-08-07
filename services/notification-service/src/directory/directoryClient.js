// Annuaire utilisateur -> contact (email/telephone). notification-service ne possede aucune
// de ces donnees (pattern Database per Service) : il interroge directement les services qui
// les possedent, via un appel reseau interne (pas de duplication de donnees).
//
// Deux espaces d'identifiants distincts selon le type d'evenement :
//   - "studentId" = identifiant d'un dossier d'inscription (registration-service) -> on resout
//     le contact du PARENT associe.
//   - "userId" = identifiant d'un compte reel (auth-service) -> on resout son propre email.

const REGISTRATION_SERVICE_URL = process.env.REGISTRATION_SERVICE_URL || 'http://registration-service:8082';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8081';

async function resolveStudentContact(studentId) {
  const response = await fetch(`${REGISTRATION_SERVICE_URL}/api/v1/registrations/${studentId}`);
  if (!response.ok) {
    throw new Error(`registration-service a repondu ${response.status} pour ${studentId}`);
  }
  const data = await response.json();
  return { email: data.email || null, phone: data.phone || null };
}

async function resolveUserContact(userId) {
  const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/users/${userId}`);
  if (!response.ok) {
    throw new Error(`auth-service a repondu ${response.status} pour ${userId}`);
  }
  const data = await response.json();
  return { email: data.email || null, phone: null };
}

module.exports = { resolveStudentContact, resolveUserContact };
