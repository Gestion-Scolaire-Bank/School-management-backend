const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://admin-service:8092';

class AdminServiceUnavailableError extends Error {}

// Verifie qu'une classe existe reellement aupres d'admin-service avant d'accepter un pointage
// qui la reference - jusqu'ici classId etait un texte libre non verifie (un QR code perime ou
// invente pouvait polluer silencieusement les donnees de presence). Retourne null si la classe
// n'existe pas, l'objet classe sinon.
async function getClass(classId) {
  let response;
  try {
    response = await fetch(`${ADMIN_SERVICE_URL}/api/v1/admin/classes/${encodeURIComponent(classId)}`);
  } catch (error) {
    throw new AdminServiceUnavailableError(`admin-service injoignable pour verifier la classe ${classId} : ${error.message}`);
  }
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new AdminServiceUnavailableError(`admin-service a repondu ${response.status} pour la classe ${classId}`);
  }
  return response.json();
}

module.exports = { getClass, AdminServiceUnavailableError };
