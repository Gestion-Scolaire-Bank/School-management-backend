const { sendEmail } = require('./email');
const { sendSms } = require('./sms');
const { sendPush } = require('./push');

async function dispatch(channel, { to, subject, body }) {
  if (!to) {
    throw new Error('Adresse destinataire inconnue');
  }
  switch (channel) {
    case 'EMAIL':
      return sendEmail({ to, subject, body });
    case 'SMS':
      return sendSms({ to, body });
    case 'PUSH':
      return sendPush({ to, body });
    default:
      throw new Error(`Canal non supporte : ${channel}`);
  }
}

module.exports = { dispatch };
