const sgMail = require('@sendgrid/mail');

async function sendEmail({ to, subject, body }) {
  const apiKey = process.env.SM_NOTIFICATION_SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SM_NOTIFICATION_SENDGRID_API_KEY non configure');
  }
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: process.env.SM_NOTIFICATION_SENDGRID_FROM_EMAIL || 'no-reply@schoolmanage.example.cm',
    subject: subject || 'Notification SchoolManage',
    text: body,
  });
}

module.exports = { sendEmail };
