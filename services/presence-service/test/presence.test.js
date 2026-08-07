const request = require('supertest');

jest.mock('../src/repositories/presenceRepository');
jest.mock('../src/redis/lock', () => ({
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/kafka/client', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/clients/adminClient', () => ({
  getClass: jest.fn(),
  AdminServiceUnavailableError: class AdminServiceUnavailableError extends Error {},
}));

const presenceRepository = require('../src/repositories/presenceRepository');
const lock = require('../src/redis/lock');
const kafkaClient = require('../src/kafka/client');
const adminClient = require('../src/clients/adminClient');
const app = require('../src/index');

beforeEach(() => {
  jest.clearAllMocks();
  lock.acquireLock.mockResolvedValue(true);
  adminClient.getClass.mockResolvedValue({ id: '6emeA', establishmentId: 'est-1' });
});

describe('POST /api/v1/presence/check-in', () => {
  test('enregistre une entree quand aucune n est en cours', async () => {
    presenceRepository.findOpenRecord.mockResolvedValue(null);
    presenceRepository.createCheckIn.mockResolvedValue({
      id: 'rec-1',
      person_id: 'STU-1',
      person_type: 'ELEVE',
      class_id: '6emeA',
      check_in_at: new Date().toISOString(),
      check_out_at: null,
      status: 'PRESENT',
    });

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'ELEVE', classId: '6emeA' });

    expect(response.status).toBe(201);
    expect(presenceRepository.createCheckIn).toHaveBeenCalledWith({
      personId: 'STU-1',
      personType: 'ELEVE',
      classId: '6emeA',
      establishmentId: 'est-1',
    });
    expect(kafkaClient.publish).toHaveBeenCalledWith('sm.presence.recorded', {
      status: 'PRESENT',
      classId: '6emeA',
    });
  });

  test('rejette un personType invalide', async () => {
    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'PARENT' });

    expect(response.status).toBe(400);
    expect(presenceRepository.createCheckIn).not.toHaveBeenCalled();
  });

  test('rejette une classe inconnue', async () => {
    adminClient.getClass.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'ELEVE', classId: 'ClasseInconnue' });

    expect(response.status).toBe(400);
    expect(presenceRepository.createCheckIn).not.toHaveBeenCalled();
  });

  test('retourne 502 si admin-service est injoignable', async () => {
    adminClient.getClass.mockRejectedValue(new adminClient.AdminServiceUnavailableError('injoignable'));

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'ELEVE', classId: '6emeA' });

    expect(response.status).toBe(502);
    expect(presenceRepository.createCheckIn).not.toHaveBeenCalled();
  });

  test('accepte un pointage sans classId (personnel non rattache a une classe)', async () => {
    presenceRepository.findOpenRecord.mockResolvedValue(null);
    presenceRepository.createCheckIn.mockResolvedValue({ id: 'rec-2', person_id: 'STAFF-1', status: 'PRESENT' });

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STAFF-1')
      .send({ personType: 'STAFF' });

    expect(response.status).toBe(201);
    expect(adminClient.getClass).not.toHaveBeenCalled();
  });

  test('rejette une deuxieme entree sans sortie prealable', async () => {
    presenceRepository.findOpenRecord.mockResolvedValue({ id: 'rec-existing' });

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'ELEVE', classId: '6emeA' });

    expect(response.status).toBe(409);
    expect(presenceRepository.createCheckIn).not.toHaveBeenCalled();
  });

  test('retourne 409 si le verrou anti-doublon est deja pris', async () => {
    lock.acquireLock.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'ELEVE', classId: '6emeA' });

    expect(response.status).toBe(409);
    expect(presenceRepository.findOpenRecord).not.toHaveBeenCalled();
  });

  test('libere le verrou meme en cas d erreur', async () => {
    presenceRepository.findOpenRecord.mockRejectedValue(new Error('boom'));

    const response = await request(app)
      .post('/api/v1/presence/check-in')
      .set('X-User-Id', 'STU-1')
      .send({ personType: 'ELEVE' });

    expect(response.status).toBe(500);
    expect(lock.releaseLock).toHaveBeenCalledWith('STU-1');
  });
});

describe('POST /api/v1/presence/check-out', () => {
  test('cloture l entree en cours', async () => {
    presenceRepository.findOpenRecord.mockResolvedValue({ id: 'rec-1', person_id: 'STU-1' });
    presenceRepository.closeCheckOut.mockResolvedValue({
      id: 'rec-1',
      person_id: 'STU-1',
      check_out_at: new Date().toISOString(),
    });

    const response = await request(app).post('/api/v1/presence/check-out').set('X-User-Id', 'STU-1').send({});

    expect(response.status).toBe(200);
    expect(presenceRepository.closeCheckOut).toHaveBeenCalledWith('rec-1');
  });

  test('rejette une sortie sans entree en cours', async () => {
    presenceRepository.findOpenRecord.mockResolvedValue(null);

    const response = await request(app).post('/api/v1/presence/check-out').set('X-User-Id', 'STU-1').send({});

    expect(response.status).toBe(409);
  });
});

describe('GET /api/v1/presence/class/:id', () => {
  test('retourne les pointages du jour pour une classe', async () => {
    presenceRepository.listByClass.mockResolvedValue([{ id: 'rec-1', person_id: 'STU-1' }]);

    const response = await request(app).get('/api/v1/presence/class/6emeA');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(presenceRepository.listByClass).toHaveBeenCalledWith('6emeA', expect.any(String));
  });
});

describe('GET /api/v1/presence/student/:id', () => {
  test('retourne l historique d un eleve', async () => {
    presenceRepository.listByPerson.mockResolvedValue([{ id: 'rec-1' }, { id: 'rec-2' }]);

    const response = await request(app).get('/api/v1/presence/student/STU-1');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });
});
