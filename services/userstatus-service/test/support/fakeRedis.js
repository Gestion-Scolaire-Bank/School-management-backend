// Fausse implementation minimaliste d'ioredis (set/get + listes lpush/ltrim/lrange) -
// suffisante pour statusRepository, sans dependance a un vrai serveur Redis pendant les tests.

function createFakeRedis() {
  const strings = new Map();
  const lists = new Map();

  function sliceRange(list, start, stop) {
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  return {
    async set(key, value) {
      strings.set(key, value);
      return 'OK';
    },
    async get(key) {
      return strings.has(key) ? strings.get(key) : null;
    },
    async lpush(key, value) {
      const list = lists.get(key) || [];
      list.unshift(value);
      lists.set(key, list);
      return list.length;
    },
    async ltrim(key, start, stop) {
      const list = lists.get(key) || [];
      lists.set(key, sliceRange(list, start, stop));
      return 'OK';
    },
    async lrange(key, start, stop) {
      const list = lists.get(key) || [];
      return sliceRange(list, start, stop);
    },
    __reset() {
      strings.clear();
      lists.clear();
    },
  };
}

module.exports = { createFakeRedis };
