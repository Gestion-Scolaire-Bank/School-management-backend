const express = require('express');
const router = express.Router();
const presenceRepository = require('../repositories/presenceRepository');
const { acquireLock, releaseLock } = require('../redis/lock');
const { publish } = require('../kafka/client');
const adminClient = require('../clients/adminClient');

// Routes presence-service - extraites du document de conception (section 5.2)

const VALID_PERSON_TYPES = ['ELEVE', 'STAFF'];

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

// Roles autorises : Eleve / Staff
// L'identifiant vient de l'en-tete X-User-Id (propage par le Gateway) ou, a defaut, du corps.
router.post('/api/v1/presence/check-in', async (req, res, next) => {
  const personId = req.header('X-User-Id') || req.body.personId;
  const { personType, classId } = req.body;

  if (!personId) {
    return res.status(400).json({ message: 'personId (ou en-tete X-User-Id) est requis' });
  }
  if (!personType || !VALID_PERSON_TYPES.includes(personType)) {
    return res.status(400).json({ message: `personType invalide (attendu : ${VALID_PERSON_TYPES.join(', ')})` });
  }

  // classId reste optionnel (un pointage de personnel n'est pas toujours rattache a une
  // classe), mais quand fourni il doit referencer une classe reelle d'admin-service.
  // establishmentId est derive de la classe (jamais fourni par le client) et stocke pour
  // permettre plus tard un filtrage/agregat par etablissement, sans risque de le confondre
  // avec celui d'une autre ecole - classId est deja un UUID global unique.
  let establishmentId = null;
  if (classId) {
    try {
      const schoolClass = await adminClient.getClass(classId);
      if (!schoolClass) {
        return res.status(400).json({ message: `Classe introuvable : ${classId}` });
      }
      establishmentId = schoolClass.establishmentId || null;
    } catch (error) {
      if (error instanceof adminClient.AdminServiceUnavailableError) {
        return res.status(502).json({ message: error.message });
      }
      return next(error);
    }
  }

  const locked = await acquireLock(personId);
  if (!locked) {
    return res.status(409).json({ message: 'Requete de pointage deja en cours, reessayez' });
  }

  try {
    const openRecord = await presenceRepository.findOpenRecord(personId);
    if (openRecord) {
      return res.status(409).json({ message: 'Une entree est deja enregistree sans sortie associee' });
    }

    const record = await presenceRepository.createCheckIn({ personId, personType, classId, establishmentId });

    // Best-effort : une panne Kafka ne doit pas empecher le pointage.
    publish('sm.presence.recorded', { status: 'PRESENT', classId: classId || null }).catch((error) => {
      console.warn(`Echec de publication sm.presence.recorded : ${error.message}`);
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  } finally {
    await releaseLock(personId);
  }
});

// Roles autorises : Eleve / Staff
router.post('/api/v1/presence/check-out', async (req, res, next) => {
  const personId = req.header('X-User-Id') || req.body.personId;

  if (!personId) {
    return res.status(400).json({ message: 'personId (ou en-tete X-User-Id) est requis' });
  }

  const locked = await acquireLock(personId);
  if (!locked) {
    return res.status(409).json({ message: 'Requete de pointage deja en cours, reessayez' });
  }

  try {
    const openRecord = await presenceRepository.findOpenRecord(personId);
    if (!openRecord) {
      return res.status(409).json({ message: 'Aucune entree en cours pour cet utilisateur' });
    }

    const record = await presenceRepository.closeCheckOut(openRecord.id);
    res.status(200).json(record);
  } catch (error) {
    next(error);
  } finally {
    await releaseLock(personId);
  }
});

// Roles autorises : Enseignant / Admin
router.get('/api/v1/presence/class/:id', async (req, res, next) => {
  try {
    const date = req.query.date || todayDateOnly();
    const records = await presenceRepository.listByClass(req.params.id, date);
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// Roles autorises : Parent / Admin
router.get('/api/v1/presence/student/:id', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const records = await presenceRepository.listByPerson(req.params.id, { from, to });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
