const express = require('express');
const router = express.Router();
const groupRepository = require('../repositories/groupRepository');
const broadcastRepository = require('../repositories/broadcastRepository');
const whatsappClient = require('../whatsapp/client');
const adminClient = require('../clients/adminClient');

// Routes whatsapp-service - extraites du document de conception (section 5.2)

// Roles autorises : Systeme (interne) / Enseignant
// Cree (ou reutilise, operation idempotente) un groupe de classe. classId doit referencer une
// classe reelle d'admin-service - jusqu'ici saisi en texte libre sans verification.
router.post('/api/v1/whatsapp/groups', async (req, res, next) => {
  try {
    const { classId, name } = req.body;
    if (!classId) {
      return res.status(400).json({ message: 'classId est requis' });
    }

    let schoolClass;
    try {
      schoolClass = await adminClient.getClass(classId);
    } catch (error) {
      if (error instanceof adminClient.AdminServiceUnavailableError) {
        return res.status(502).json({ message: error.message });
      }
      throw error;
    }
    if (!schoolClass) {
      return res.status(400).json({ message: `Classe introuvable : ${classId}` });
    }

    const group = await groupRepository.upsertGroup(classId, name, schoolClass.establishmentId);
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Enseignant / Admin
// Diffuse une annonce vers le groupe de classe et l'archive.
router.post('/api/v1/whatsapp/broadcast', async (req, res, next) => {
  try {
    const { classId, message } = req.body;
    if (!classId || !message) {
      return res.status(400).json({ message: 'classId et message sont requis' });
    }

    const group = await groupRepository.findByClassId(classId);
    if (!group) {
      return res.status(404).json({ message: `Aucun groupe pour la classe ${classId}` });
    }

    const sentBy = req.header('X-User-Id') || null;
    const broadcast = await broadcastRepository.record(classId, message, sentBy);

    // Envoi best-effort : une panne du fournisseur WhatsApp ne doit pas empecher l'annonce
    // d'etre enregistree et consultable dans l'historique.
    await Promise.all(
      (group.members || [])
        .filter((member) => member.phone)
        .map((member) =>
          whatsappClient.sendTextMessage(member.phone, message).catch((error) => {
            console.warn(`Echec envoi WhatsApp a ${member.phone} : ${error.message}`);
          })
        )
    );

    res.status(201).json(broadcast);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Enseignant
// Consulte un groupe de classe.
router.get('/api/v1/whatsapp/groups/:classId', async (req, res, next) => {
  try {
    const group = await groupRepository.findByClassId(req.params.classId);
    if (!group) {
      return res.status(404).json({ message: `Aucun groupe pour la classe ${req.params.classId}` });
    }
    res.json(group);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
