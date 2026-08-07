// API HTTP (legacy) Firebase Cloud Messaging - aucun SDK dedie dans les dependances du service,
// on utilise fetch (natif depuis Node 18+, cf. Dockerfile - node:20).
async function sendPush({ to, body }) {
  const serverKey = process.env.SM_NOTIFICATION_FCM_SERVER_KEY;
  if (!serverKey) {
    throw new Error('SM_NOTIFICATION_FCM_SERVER_KEY non configure');
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, notification: { body } }),
  });

  if (!response.ok) {
    throw new Error(`FCM a repondu ${response.status}`);
  }
}

module.exports = { sendPush };
