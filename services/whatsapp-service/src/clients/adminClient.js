const axios = require('axios');

const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://admin-service:8092';

class AdminServiceUnavailableError extends Error {}

// Verifie qu'une classe existe reellement aupres d'admin-service avant de creer/diffuser un
// groupe qui la reference - jusqu'ici classId etait un texte libre non verifie, saisi
// manuellement par un enseignant. Retourne null si la classe n'existe pas, l'objet classe sinon.
async function getClass(classId) {
  try {
    const response = await axios.get(`${ADMIN_SERVICE_URL}/api/v1/admin/classes/${encodeURIComponent(classId)}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new AdminServiceUnavailableError(`admin-service injoignable pour verifier la classe ${classId} : ${error.message}`);
  }
}

module.exports = { getClass, AdminServiceUnavailableError };
