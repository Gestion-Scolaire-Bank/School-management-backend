const express = require('express');
const router = express.Router();

// Routes notification-service - extraites du document de conception (section 5.2)

// Roles autorises : Services internes / Admin
// TODO : Envoyer une notification manuelle
router.post('/api/v1/notifications/send', (req, res) => {
  res.status(501).json({ message: "Not implemented - Envoyer une notification manuelle" });
});

// Roles autorises : Utilisateur
// TODO : Historique des notifications recues
router.get('/api/v1/notifications/user/:id', (req, res) => {
  res.status(501).json({ message: "Not implemented - Historique des notifications recues" });
});

// Roles autorises : Admin
// TODO : Consulter les logs d'envoi (statuts, erreurs)
router.get('/api/v1/notifications/logs', (req, res) => {
  res.status(501).json({ message: "Not implemented - Consulter les logs d'envoi (statuts, erreurs)" });
});

// Roles autorises : Admin
// TODO : Forcer le renvoi d'une notification en echec
router.patch('/api/v1/notifications/:id/retry', (req, res) => {
  res.status(501).json({ message: "Not implemented - Forcer le renvoi d'une notification en echec" });
});

module.exports = router;