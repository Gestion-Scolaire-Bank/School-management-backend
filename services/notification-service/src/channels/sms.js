const twilio = require('twilio');

async function sendSms({ to, body }) {
  const sid = process.env.SM_NOTIFICATION_TWILIO_SID;
  const token = process.env.SM_NOTIFICATION_TWILIO_TOKEN;
  const fromNumber = process.env.SM_NOTIFICATION_TWILIO_FROM_NUMBER;
  if (!sid || !token || !fromNumber) {
    throw new Error('Configuration Twilio incomplete (SID / TOKEN / FROM_NUMBER)');
  }
  const client = twilio(sid, token);
  await client.messages.create({ to, from: fromNumber, body });
}

module.exports = { sendSms };
