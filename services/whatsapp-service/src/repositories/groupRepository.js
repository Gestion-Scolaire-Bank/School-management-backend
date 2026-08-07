const { getDb } = require('../db/mongo');

const COLLECTION = 'groups';

async function findByClassId(classId) {
  const db = await getDb();
  return db.collection(COLLECTION).findOne({ classId });
}

// Idempotent : reutilise le groupe existant s'il y en a deja un pour cette classe.
// establishmentId est derive de la classe aupres d'admin-service (jamais fourni par le
// client) - stocke pour permettre plus tard un filtrage/agregat par etablissement, meme si
// classId etant deja un UUID global unique, aucun risque de melange n'existe aujourd'hui.
async function upsertGroup(classId, name, establishmentId) {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const existing = await collection.findOne({ classId });
  if (existing) {
    return existing;
  }

  const now = new Date();
  const group = {
    classId,
    name: name || `Classe ${classId}`,
    establishmentId: establishmentId || null,
    members: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(group);
  return { ...group, _id: result.insertedId };
}

async function addMember(classId, member, establishmentId) {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const group = await upsertGroup(classId, undefined, establishmentId);

  const alreadyMember = (group.members || []).some((m) => m.studentId === member.studentId);
  if (alreadyMember) {
    return group;
  }

  const updatedMembers = [...(group.members || []), member];
  await collection.updateOne({ classId }, { $set: { members: updatedMembers, updatedAt: new Date() } });
  return findByClassId(classId);
}

module.exports = { findByClassId, upsertGroup, addMember };
