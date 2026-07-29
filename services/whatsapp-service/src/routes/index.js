const express = require('express');
const router = express.Router();

// Routes whatsapp-service - extraites du document de conception (section 5.2)

// Roles autorises : Systeme (interne)
// TODO : Creer un groupe de classe
router.post('/api/v1/whatsapp/groups', (req, res) => {
  res.status(501).json({ message: "Not implemented - Creer un groupe de classe" });
});

// Roles autorises : Enseignant / Admin
// TODO : Diffuser une annonce
router.post('/api/v1/whatsapp/broadcast', (req, res) => {
  res.status(501).json({ message: "Not implemented - Diffuser une annonce" });
});

// Roles autorises : Enseignant
// TODO : Consulter un groupe de classe
router.get('/api/v1/whatsapp/groups/:classId', (req, res) => {
  res.status(501).json({ message: "Not implemented - Consulter un groupe de classe" });
});

module.exports = router;