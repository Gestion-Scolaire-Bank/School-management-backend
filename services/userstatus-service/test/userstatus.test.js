const request = require('supertest');
const { createFakeRedis } = require('./support/fakeRedis');

const mockRedis = createFakeRedis();

jest.mock('../src/redis/client', () => ({
  getClient: () => mockRedis,
}));

jest.mock('../src/kafka/client', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/realtime/statusBroadcaster', () => ({
  broadcast: jest.fn(),
  registerClient: jest.fn(),
}));

const kafkaClient = require('../src/kafka/client');
const broadcaster = require('../src/realtime/statusBroadcaster');
const app = require('../src/index');

beforeEach(() => {
  mockRedis.__reset();
  kafkaClient.publish.mockClear();
  broadcaster.broadcast.mockClear();
});

describe('POST /api/v1/status', () => {
  test('publie un statut valide', async () => {
    const response = await request(app).post('/api/v1/status').set('X-User-Id', 'user-1').send({ statusType: 'MALADE' });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe('user-1');
    expect(response.body.statusType).toBe('MALADE');
    expect(broadcaster.broadcast).toHaveBeenCalledWith(expect.objectContaining({ statusType: 'MALADE' }));
    expect(kafkaClient.publish).toHaveBeenCalledWith('sm.userstatus.changed', {
      userId: 'user-1',
      statusType: 'MALADE',
    });
  });

  test('accepte un userId dans le corps si l en-tete X-User-Id est absent', async () => {
    const response = await request(app).post('/api/v1/status').send({ userId: 'user-2', statusType: 'DISTANCIEL' });
    expect(response.status).toBe(201);
    expect(response.body.userId).toBe('user-2');
  });

  test('rejette un statusType invalide', async () => {
    const response = await request(app)
      .post('/api/v1/status')
      .set('X-User-Id', 'user-1')
      .send({ statusType: 'EN_VACANCES' });
    expect(response.status).toBe(400);
  });

  test('rejette une requete sans identifiant utilisateur', async () => {
    const response = await request(app).post('/api/v1/status').send({ statusType: 'DISPONIBLE' });
    expect(response.status).toBe(400);
  });

  test('ne bloque pas la publication si Kafka echoue', async () => {
    kafkaClient.publish.mockRejectedValueOnce(new Error('kafka indisponible'));
    const response = await request(app)
      .post('/api/v1/status')
      .set('X-User-Id', 'user-1')
      .send({ statusType: 'DISPONIBLE' });
    expect(response.status).toBe(201);
  });
});

describe('GET /api/v1/status/history/:id', () => {
  test('retourne l historique du plus recent au plus ancien', async () => {
    await request(app).post('/api/v1/status').set('X-User-Id', 'user-3').send({ statusType: 'MALADE' });
    await request(app).post('/api/v1/status').set('X-User-Id', 'user-3').send({ statusType: 'DISPONIBLE' });

    const response = await request(app).get('/api/v1/status/history/user-3');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].statusType).toBe('DISPONIBLE');
    expect(response.body[1].statusType).toBe('MALADE');
  });

  test('retourne un tableau vide pour un utilisateur sans historique', async () => {
    const response = await request(app).get('/api/v1/status/history/inconnu');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
