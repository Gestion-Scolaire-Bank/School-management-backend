jest.mock('../src/repositories/notificationRepository');
jest.mock('../src/channels/dispatcher', () => ({ dispatch: jest.fn() }));

const notificationRepository = require('../src/repositories/notificationRepository');
const { dispatch } = require('../src/channels/dispatcher');
const notificationService = require('../src/services/notificationService');

beforeEach(() => {
  jest.clearAllMocks();
});

test('createAndSend marque SENT quand le dispatch reussit', async () => {
  notificationRepository.create.mockResolvedValue({ id: 'notif-1' });
  dispatch.mockResolvedValue(undefined);
  notificationRepository.markSent.mockResolvedValue({ id: 'notif-1', status: 'SENT' });

  const result = await notificationService.createAndSend({
    recipientAddress: 'a@b.cm',
    channel: 'EMAIL',
    body: 'Contenu',
  });

  expect(result.status).toBe('SENT');
  expect(notificationRepository.markFailed).not.toHaveBeenCalled();
});

test('createAndSend marque FAILED quand le dispatch echoue', async () => {
  notificationRepository.create.mockResolvedValue({ id: 'notif-1' });
  dispatch.mockRejectedValue(new Error('SMTP down'));
  notificationRepository.markFailed.mockResolvedValue({ id: 'notif-1', status: 'FAILED' });

  const result = await notificationService.createAndSend({
    recipientAddress: 'a@b.cm',
    channel: 'EMAIL',
    body: 'Contenu',
  });

  expect(result.status).toBe('FAILED');
  expect(notificationRepository.markFailed).toHaveBeenCalledWith('notif-1', 'SMTP down');
});

test('retry refuse si la notification n est pas FAILED', async () => {
  notificationRepository.findById.mockResolvedValue({ id: 'notif-1', status: 'SENT' });

  const result = await notificationService.retry('notif-1');

  expect(result).toEqual({ error: 'NOT_RETRYABLE' });
  expect(dispatch).not.toHaveBeenCalled();
});

test('retry renvoie et marque SENT si le dispatch reussit cette fois', async () => {
  notificationRepository.findById.mockResolvedValue({
    id: 'notif-1',
    status: 'FAILED',
    channel: 'EMAIL',
    recipient_address: 'a@b.cm',
    subject: 'Sujet',
    body: 'Contenu',
  });
  dispatch.mockResolvedValue(undefined);
  notificationRepository.markSent.mockResolvedValue({ id: 'notif-1', status: 'SENT' });

  const result = await notificationService.retry('notif-1');

  expect(result.notification.status).toBe('SENT');
});

test('retry retourne NOT_FOUND si la notification n existe pas', async () => {
  notificationRepository.findById.mockResolvedValue(null);
  const result = await notificationService.retry('inconnu');
  expect(result).toEqual({ error: 'NOT_FOUND' });
});
