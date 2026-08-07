const notificationRepository = require('../repositories/notificationRepository');
const { dispatch } = require('../channels/dispatcher');

async function createAndSend({ recipientUserId, recipientAddress, channel, type, subject, body, sourceTopic }) {
  const notification = await notificationRepository.create({
    recipientUserId,
    recipientAddress,
    channel,
    type,
    subject,
    body,
    sourceTopic,
  });

  try {
    await dispatch(channel, { to: recipientAddress, subject, body });
    return notificationRepository.markSent(notification.id);
  } catch (error) {
    return notificationRepository.markFailed(notification.id, error.message);
  }
}

async function retry(id) {
  const notification = await notificationRepository.findById(id);
  if (!notification) {
    return { error: 'NOT_FOUND' };
  }
  if (notification.status !== 'FAILED') {
    return { error: 'NOT_RETRYABLE' };
  }

  try {
    await dispatch(notification.channel, {
      to: notification.recipient_address,
      subject: notification.subject,
      body: notification.body,
    });
    return { notification: await notificationRepository.markSent(notification.id) };
  } catch (error) {
    return { notification: await notificationRepository.markFailed(notification.id, error.message) };
  }
}

module.exports = { createAndSend, retry };
