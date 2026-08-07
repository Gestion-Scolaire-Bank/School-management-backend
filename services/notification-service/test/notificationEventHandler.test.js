jest.mock('../src/services/notificationService');
jest.mock('../src/directory/directoryClient');

const notificationService = require('../src/services/notificationService');
const directoryClient = require('../src/directory/directoryClient');
const { handleIncomingEvent } = require('../src/events/notificationEventHandler');

beforeEach(() => {
  jest.clearAllMocks();
  notificationService.createAndSend.mockResolvedValue({ id: 'notif-1' });
});

test('cree et envoie une notification pour un evenement avec adresse directe (pas de resolution)', async () => {
  const result = await handleIncomingEvent('sm.auth.account.created', {
    email: 'a@b.cm',
    nom: 'Jean',
    setPasswordUrl: 'http://localhost:5173/reset-password?token=abc',
  });

  expect(notificationService.createAndSend).toHaveBeenCalledWith(
    expect.objectContaining({ recipientAddress: 'a@b.cm', sourceTopic: 'sm.auth.account.created' })
  );
  expect(directoryClient.resolveStudentContact).not.toHaveBeenCalled();
  expect(directoryClient.resolveUserContact).not.toHaveBeenCalled();
  expect(result).toEqual({ id: 'notif-1' });
});

test('resout l adresse via registration-service pour un evenement lie a un eleve', async () => {
  directoryClient.resolveStudentContact.mockResolvedValue({ email: 'parent@example.cm', phone: '+237600000000' });

  await handleIncomingEvent('sm.schoolid.generated', { studentId: 'STU-1', idCardUrl: 'http://x' });

  expect(directoryClient.resolveStudentContact).toHaveBeenCalledWith('STU-1');
  expect(notificationService.createAndSend).toHaveBeenCalledWith(
    expect.objectContaining({ recipientAddress: 'parent@example.cm' })
  );
});

test('resout le telephone (pas l email) pour un canal SMS', async () => {
  directoryClient.resolveStudentContact.mockResolvedValue({ email: 'parent@example.cm', phone: '+237600000000' });

  await handleIncomingEvent('sm.presence.absence.detected', { studentId: 'STU-1', date: '2026-08-04' });

  expect(notificationService.createAndSend).toHaveBeenCalledWith(
    expect.objectContaining({ recipientAddress: '+237600000000' })
  );
});

test('resout l adresse via auth-service pour un evenement lie a un compte utilisateur', async () => {
  directoryClient.resolveUserContact.mockResolvedValue({ email: 'parent@example.cm', phone: null });

  await handleIncomingEvent('sm.payment.completed', { userId: 'user-1', montant: 5000 });

  expect(directoryClient.resolveUserContact).toHaveBeenCalledWith('user-1');
  expect(notificationService.createAndSend).toHaveBeenCalledWith(
    expect.objectContaining({ recipientAddress: 'parent@example.cm' })
  );
});

test('ne bloque pas si la resolution de l annuaire echoue - laisse createAndSend gerer l adresse manquante', async () => {
  directoryClient.resolveStudentContact.mockRejectedValue(new Error('registration-service indisponible'));

  await handleIncomingEvent('sm.schoolid.generated', { studentId: 'STU-1', idCardUrl: 'http://x' });

  expect(notificationService.createAndSend).toHaveBeenCalledWith(
    expect.objectContaining({ recipientAddress: null })
  );
});

test('ignore un evenement non mappe sans appeler le service ni l annuaire', async () => {
  const result = await handleIncomingEvent('sm.payment.completed', {});
  expect(result).toBeNull();
  expect(notificationService.createAndSend).not.toHaveBeenCalled();
  expect(directoryClient.resolveUserContact).not.toHaveBeenCalled();
});
