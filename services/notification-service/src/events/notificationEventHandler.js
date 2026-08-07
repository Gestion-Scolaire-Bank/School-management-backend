const { mapEventToNotification } = require('./eventMapper');
const notificationService = require('../services/notificationService');
const { resolveStudentContact, resolveUserContact } = require('../directory/directoryClient');

// Resout recipientUserId en adresse reelle via l'annuaire adapte (STUDENT -> registration-
// service, USER -> auth-service), selon le canal cible (email ou telephone). Retourne null
// (sans lever) si la resolution echoue ou n'est pas necessaire : createAndSend gere deja
// proprement l'absence d'adresse (statut FAILED, "Adresse destinataire inconnue").
async function resolveRecipientAddress(mapped) {
  if (mapped.recipientAddress) {
    return mapped.recipientAddress;
  }
  if (!mapped.recipientUserId || !mapped.recipientKind) {
    return null;
  }

  const resolver = mapped.recipientKind === 'STUDENT' ? resolveStudentContact : resolveUserContact;
  try {
    const contact = await resolver(mapped.recipientUserId);
    return mapped.channel === 'SMS' ? contact.phone : contact.email;
  } catch (error) {
    console.warn(
      `Echec de resolution de l'annuaire (${mapped.recipientKind} ${mapped.recipientUserId}) : ${error.message}`
    );
    return null;
  }
}

async function handleIncomingEvent(topic, payload) {
  const mapped = mapEventToNotification(topic, payload);
  if (!mapped) {
    return null;
  }

  const recipientAddress = await resolveRecipientAddress(mapped);

  return notificationService.createAndSend({ ...mapped, recipientAddress, sourceTopic: topic });
}

module.exports = { handleIncomingEvent };
