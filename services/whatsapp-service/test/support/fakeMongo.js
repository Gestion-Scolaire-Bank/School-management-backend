// Fausse implementation minimaliste du driver MongoDB (findOne / insertOne / updateOne avec
// $set) - suffisante pour les repositories de ce service, sans dependance a un vrai serveur
// Mongo ni a mongodb-memory-server pendant les tests.

function createFakeCollection() {
  let docs = [];
  let idCounter = 1;

  function matches(doc, filter) {
    return Object.entries(filter).every(([key, value]) => doc[key] === value);
  }

  return {
    async findOne(filter) {
      return docs.find((doc) => matches(doc, filter)) || null;
    },
    async insertOne(doc) {
      const insertedId = `fake-id-${idCounter++}`;
      docs.push({ ...doc, _id: insertedId });
      return { insertedId };
    },
    async updateOne(filter, update) {
      const index = docs.findIndex((doc) => matches(doc, filter));
      if (index === -1) {
        return { matchedCount: 0 };
      }
      if (update.$set) {
        docs[index] = { ...docs[index], ...update.$set };
      }
      return { matchedCount: 1 };
    },
  };
}

function createFakeDb() {
  const collections = new Map();
  return {
    collection(name) {
      if (!collections.has(name)) {
        collections.set(name, createFakeCollection());
      }
      return collections.get(name);
    },
    __reset() {
      collections.clear();
    },
  };
}

module.exports = { createFakeDb };
