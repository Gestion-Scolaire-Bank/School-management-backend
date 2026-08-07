const express = require('express');
const router = express.Router();
const notificationRepository = require('../repositories/notificationRepository');
const notificationService = require('../services/notificationService');

// Routes notification-service - extraites du document de conception (section 5.2)

const VALID_CHANNELS = ['EMAIL', 'SMS', 'PUSH'];

// Roles autorises : Services internes / Admin
router.post('/api/v1/notifications/send', async (req, res, next) => {
  try {
    const { userId, channel, recipient, subject, body, type } = req.body;

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ message: `channel invalide (attendu : ${VALID_CHANNELS.join(', ')})` });
    }
    if (!recipient) {
      return res.status(400).json({ message: 'recipient est requis (email, telephone ou token push)' });
    }
    if (!body) {
      return res.status(400).json({ message: 'body est requis' });
    }

    const notification = await notificationService.createAndSend({
      recipientUserId: userId || null,
      recipientAddress: recipient,
      channel,
      type: type || 'MANUAL',
      subject,
      body,
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Utilisateur
router.get('/api/v1/notifications/user/:id', async (req, res, next) => {
  try {
    const notifications = await notificationRepository.listByUser(req.params.id);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Admin
router.get('/api/v1/notifications/logs', async (req, res, next) => {
  try {
    const { status, channel, limit } = req.query;
    const notifications = await notificationRepository.listAll({
      status,
      channel,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Admin
router.patch('/api/v1/notifications/:id/retry', async (req, res, next) => {
  try {
    const result = await notificationService.retry(req.params.id);
    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Notification introuvable' });
    }
    if (result.error === 'NOT_RETRYABLE') {
      return res.status(400).json({ message: 'Seule une notification en echec peut etre renvoyee' });
    }
    res.json(result.notification);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
