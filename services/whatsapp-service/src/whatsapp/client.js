const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

// Envoi best-effort vers l'API WhatsApp Cloud - les appelants doivent tolerer un rejet
// (fournisseur externe indisponible, credentials manquants en dev) sans bloquer leur propre logique.
async function sendTextMessage(to, message) {
  const token = process.env.SM_WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.SM_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error('SM_WHATSAPP_CLOUD_API_TOKEN / SM_WHATSAPP_PHONE_NUMBER_ID non configures');
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
  return axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = { sendTextMessage };
