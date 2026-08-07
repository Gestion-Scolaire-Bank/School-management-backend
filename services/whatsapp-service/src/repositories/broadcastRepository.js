const { getDb } = require('../db/mongo');

const COLLECTION = 'broadcasts';

async function record(classId, message, sentBy) {
  const db = await getDb();
  const doc = { classId, message, sentBy: sentBy || null, sentAt: new Date() };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

module.exports = { record };
