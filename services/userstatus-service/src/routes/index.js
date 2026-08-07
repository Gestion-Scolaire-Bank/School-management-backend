const express = require('express');
const router = express.Router();
const statusRepository = require('../repositories/statusRepository');
const { publish } = require('../kafka/client');
const { broadcast } = require('../realtime/statusBroadcaster');

// Routes userstatus-service - extraites du document de conception (section 5.2)

const VALID_STATUS_TYPES = ['DISPONIBLE', 'MALADE', 'EN_DEPLACEMENT', 'DISTANCIEL', 'INDISPONIBLE'];

// Roles autorises : Tous acteurs
// Publie un statut. L'identifiant utilisateur vient de l'en-tete X-User-Id (propage par le
// Gateway une fois le JWT valide) ou, a defaut, du corps de la requete.
router.post('/api/v1/status', async (req, res, next) => {
  try {
    const userId = req.header('X-User-Id') || req.body.userId;
    const { statusType, message } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId (ou en-tete X-User-Id) est requis' });
    }
    if (!statusType || !VALID_STATUS_TYPES.includes(statusType)) {
      return res.status(400).json({ message: `statusType invalide (attendu : ${VALID_STATUS_TYPES.join(', ')})` });
    }

    const entry = await statusRepository.publishStatus(userId, statusType, message);

    broadcast(entry);

    // Best-effort : une panne Kafka ne doit pas empecher la publication du statut.
    publish('sm.userstatus.changed', { userId, statusType }).catch((error) => {
      console.warn(`Echec de publication Kafka sm.userstatus.changed : ${error.message}`);
    });

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Admin
router.get('/api/v1/status/history/:id', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const history = await statusRepository.getHistory(req.params.id, limit);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Admin
// GET /api/v1/status/live n'est pas gere ici : c'est une upgrade WebSocket (cf. src/index.js /
// src/realtime/statusBroadcaster.js), pas une route REST JSON classique.

module.exports = router;
