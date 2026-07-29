const express = require('express');
const router = express.Router();

// Routes presence-service - extraites du document de conception (section 5.2)

// Roles autorises : Eleve / Staff
// TODO : Enregistrer une entree
router.post('/api/v1/presence/check-in', (req, res) => {
  res.status(501).json({ message: "Not implemented - Enregistrer une entree" });
});

// Roles autorises : Eleve / Staff
// TODO : Enregistrer une sortie
router.post('/api/v1/presence/check-out', (req, res) => {
  res.status(501).json({ message: "Not implemented - Enregistrer une sortie" });
});

// Roles autorises : Enseignant / Admin
// TODO : Tableau de presence d'une classe
router.get('/api/v1/presence/class/:id', (req, res) => {
  res.status(501).json({ message: "Not implemented - Tableau de presence d'une classe" });
});

// Roles autorises : Parent / Admin
// TODO : Historique de presence d'un eleve
router.get('/api/v1/presence/student/:id', (req, res) => {
  res.status(501).json({ message: "Not implemented - Historique de presence d'un eleve" });
});

module.exports = router;