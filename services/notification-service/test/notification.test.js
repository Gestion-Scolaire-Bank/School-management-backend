const request = require('supertest');

jest.mock('../src/repositories/notificationRepository');
jest.mock('../src/channels/dispatcher', () => ({
  dispatch: jest.fn().mockResolvedValue(undefined),
}));

const notificationRepository = require('../src/repositories/notificationRepository');
const { dispatch } = require('../src/channels/dispatcher');
const app = require('../src/index');

beforeEach(() => {
  jest.clearAllMocks();
});

function fakeNotification(overrides = {}) {
  return {
    id: 'notif-1',
    recipient_user_id: null,
    recipient_address: 'parent@example.cm',
    channel: 'EMAIL',
    type: 'MANUAL',
    subject: 'Sujet',
    body: 'Contenu',
    status: 'PENDING',
    attempts: 0,
    ...overrides,
  };
}

describe('POST /api/v1/notifications/send', () => {
  test('envoie une notification et retourne 201 avec le statut SENT', async () => {
    notificationRepository.create.mockResolvedValue(fakeNotification());
    notificationRepository.markSent.mockResolvedValue(fakeNotification({ status: 'SENT', attempts: 1 }));

    const response = await request(app).post('/api/v1/notifications/send').send({
      channel: 'EMAIL',
      recipient: 'parent@example.cm',
      subject: 'Sujet',
      body: 'Contenu',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('SENT');
    expect(dispatch).toHaveBeenCalledWith('EMAIL', { to: 'parent@example.cm', subject: 'Sujet', body: 'Contenu' });
  });

  test('marque la notification en echec si le canal externe echoue', async () => {
    notificationRepository.create.mockResolvedValue(fakeNotification());
    notificationRepository.markFailed.mockResolvedValue(
      fakeNotification({ status: 'FAILED', attempts: 1, error_message: 'panne' })
    );
    dispatch.mockRejectedValueOnce(new Error('panne'));

    const response = await request(app).post('/api/v1/notifications/send').send({
      channel: 'EMAIL',
      recipient: 'parent@example.cm',
      body: 'Contenu',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('FAILED');
  });

  test('rejette un channel invalide', async () => {
    const response = await request(app).post('/api/v1/notifications/send').send({
      channel: 'FAX',
      recipient: 'x',
      body: 'y',
    });
    expect(response.status).toBe(400);
  });

  test('rejette une requete sans destinataire', async () => {
    const response = await request(app).post('/api/v1/notifications/send').send({ channel: 'EMAIL', body: 'y' });
    expect(response.status).toBe(400);
  });
});

describe('GET /api/v1/notifications/user/:id', () => {
  test('retourne l historique de l utilisateur', async () => {
    notificationRepository.listByUser.mockResolvedValue([fakeNotification()]);
    const response = await request(app).get('/api/v1/notifications/user/user-1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(notificationRepository.listByUser).toHaveBeenCalledWith('user-1');
  });
});

describe('GET /api/v1/notifications/logs', () => {
  test('retourne les logs avec filtres optionnels', async () => {
    notificationRepository.listAll.mockResolvedValue([fakeNotification({ status: 'FAILED' })]);
    const response = await request(app).get('/api/v1/notifications/logs').query({ status: 'FAILED' });
    expect(response.status).toBe(200);
    expect(notificationRepository.listAll).toHaveBeenCalledWith({
      status: 'FAILED',
      channel: undefined,
      limit: undefined,
    });
  });
});

describe('PATCH /api/v1/notifications/:id/retry', () => {
  test('retente l envoi d une notification en echec', async () => {
    notificationRepository.findById.mockResolvedValue(fakeNotification({ status: 'FAILED' }));
    notificationRepository.markSent.mockResolvedValue(fakeNotification({ status: 'SENT', attempts: 2 }));

    const response = await request(app).patch('/api/v1/notifications/notif-1/retry');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('SENT');
  });

  test('refuse de retenter une notification qui n est pas en echec', async () => {
    notificationRepository.findById.mockResolvedValue(fakeNotification({ status: 'SENT' }));

    const response = await request(app).patch('/api/v1/notifications/notif-1/retry');

    expect(response.status).toBe(400);
  });

  test('retourne 404 si la notification est introuvable', async () => {
    notificationRepository.findById.mockResolvedValue(null);

    const response = await request(app).patch('/api/v1/notifications/inconnu/retry');

    expect(response.status).toBe(404);
  });
});
