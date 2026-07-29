const express = require('express');
const router = express.Router();

// Routes userstatus-service - extraites du document de conception (section 5.2)

// Roles autorises : Tous acteurs
// TODO : Publier un statut
router.post('/api/v1/status', (req, res) => {
  res.status(501).json({ message: "Not implemented - Publier un statut" });
});

// Roles autorises : Admin
// TODO : Consulter l'historique de statut
router.get('/api/v1/status/history/:id', (req, res) => {
  res.status(501).json({ message: "Not implemented - Consulter l'historique de statut" });
});

// Roles autorises : Admin
// TODO : Flux temps reel des statuts (WebSocket)
router.get('/api/v1/status/live', (req, res) => {
  res.status(501).json({ message: "Not implemented - Flux temps reel des statuts (WebSocket)" });
});

module.exports = router;