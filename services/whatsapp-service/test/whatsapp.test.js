const request = require('supertest');
const { createFakeDb } = require('./support/fakeMongo');

const mockFakeDb = createFakeDb();

jest.mock('../src/db/mongo', () => ({
  getDb: async () => mockFakeDb,
}));

jest.mock('../src/whatsapp/client', () => ({
  sendTextMessage: jest.fn().mockResolvedValue({ status: 200 }),
}));
jest.mock('../src/clients/adminClient', () => ({
  getClass: jest.fn(),
  AdminServiceUnavailableError: class AdminServiceUnavailableError extends Error {},
}));

const whatsappClient = require('../src/whatsapp/client');
const adminClient = require('../src/clients/adminClient');
const app = require('../src/index');

beforeEach(() => {
  mockFakeDb.__reset();
  whatsappClient.sendTextMessage.mockClear();
  adminClient.getClass.mockReset();
  adminClient.getClass.mockResolvedValue({ id: 'classe', establishmentId: 'est-1' });
});

describe('POST /api/v1/whatsapp/groups', () => {
  test('cree un nouveau groupe de classe', async () => {
    const response = await request(app)
      .post('/api/v1/whatsapp/groups')
      .send({ classId: '6emeA', name: '6eme A' });

    expect(response.status).toBe(201);
    expect(response.body.classId).toBe('6emeA');
    expect(response.body.members).toEqual([]);
    expect(response.body.establishmentId).toBe('est-1');
  });

  test('rejette une requete sans classId', async () => {
    const response = await request(app).post('/api/v1/whatsapp/groups').send({});
    expect(response.status).toBe(400);
  });

  test('rejette une classe inconnue aupres d admin-service', async () => {
    adminClient.getClass.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/whatsapp/groups')
      .send({ classId: 'ClasseInconnue', name: 'Inconnue' });

    expect(response.status).toBe(400);
  });

  test('retourne 502 si admin-service est injoignable', async () => {
    adminClient.getClass.mockRejectedValue(new adminClient.AdminServiceUnavailableError('injoignable'));

    const response = await request(app)
      .post('/api/v1/whatsapp/groups')
      .send({ classId: '6emeA', name: '6eme A' });

    expect(response.status).toBe(502);
  });

  test('est idempotent : ne duplique pas un groupe existant', async () => {
    await request(app).post('/api/v1/whatsapp/groups').send({ classId: '6emeA' });
    const second = await request(app).post('/api/v1/whatsapp/groups').send({ classId: '6emeA' });
    expect(second.status).toBe(201);

    const listing = await request(app).get('/api/v1/whatsapp/groups/6emeA');
    expect(listing.status).toBe(200);
  });
});

describe('GET /api/v1/whatsapp/groups/:classId', () => {
  test('retourne 404 si le groupe n a pas encore ete cree', async () => {
    const response = await request(app).get('/api/v1/whatsapp/groups/inconnu');
    expect(response.status).toBe(404);
  });

  test('retourne le groupe existant', async () => {
    await request(app).post('/api/v1/whatsapp/groups').send({ classId: '6emeA', name: '6eme A' });
    const response = await request(app).get('/api/v1/whatsapp/groups/6emeA');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('6eme A');
  });
});

describe('POST /api/v1/whatsapp/broadcast', () => {
  test('rejette une diffusion vers une classe sans groupe', async () => {
    const response = await request(app)
      .post('/api/v1/whatsapp/broadcast')
      .send({ classId: 'inconnue', message: 'Reunion demain' });
    expect(response.status).toBe(404);
  });

  test('enregistre la diffusion et notifie les membres ayant un numero', async () => {
    await request(app).post('/api/v1/whatsapp/groups').send({ classId: '6emeA' });
    const db = await require('../src/db/mongo').getDb();
    await db
      .collection('groups')
      .updateOne({ classId: '6emeA' }, { $set: { members: [{ studentId: 'STU-1', phone: '+237600000000' }] } });

    const response = await request(app)
      .post('/api/v1/whatsapp/broadcast')
      .send({ classId: '6emeA', message: 'Reunion demain' });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Reunion demain');
    expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith('+237600000000', 'Reunion demain');
  });

  test('n echoue pas si l envoi WhatsApp echoue pour un membre', async () => {
    await request(app).post('/api/v1/whatsapp/groups').send({ classId: '5emeB' });
    const db = await require('../src/db/mongo').getDb();
    await db
      .collection('groups')
      .updateOne({ classId: '5emeB' }, { $set: { members: [{ studentId: 'STU-2', phone: '+237611111111' }] } });
    whatsappClient.sendTextMessage.mockRejectedValueOnce(new Error('timeout fournisseur'));

    const response = await request(app)
      .post('/api/v1/whatsapp/broadcast')
      .send({ classId: '5emeB', message: 'Sortie scolaire' });

    expect(response.status).toBe(201);
  });
});
