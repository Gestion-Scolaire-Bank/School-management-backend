const { mapEventToNotification } = require('../src/events/eventMapper');

test('mappe sm.auth.account.created vers un email de bienvenue avec le lien de definition de mot de passe', () => {
  const result = mapEventToNotification('sm.auth.account.created', {
    email: 'a@b.cm',
    nom: 'Jean',
    setPasswordUrl: 'http://localhost:5173/reset-password?token=abc',
  });
  expect(result).toMatchObject({ channel: 'EMAIL', recipientAddress: 'a@b.cm', type: 'WELCOME' });
  expect(result.body).toContain('http://localhost:5173/reset-password?token=abc');
});

test('ignore sm.auth.account.created sans email ou sans lien', () => {
  expect(mapEventToNotification('sm.auth.account.created', {})).toBeNull();
  expect(mapEventToNotification('sm.auth.account.created', { email: 'a@b.cm' })).toBeNull();
});

test('mappe sm.auth.password.reset.requested vers un email contenant le lien', () => {
  const result = mapEventToNotification('sm.auth.password.reset.requested', {
    email: 'a@b.cm',
    nom: 'Jean',
    resetUrl: 'http://localhost:5173/reset-password?token=abc',
  });
  expect(result).toMatchObject({ channel: 'EMAIL', recipientAddress: 'a@b.cm', type: 'PASSWORD_RESET' });
  expect(result.body).toContain('http://localhost:5173/reset-password?token=abc');
});

test('ignore sm.auth.password.reset.requested sans resetUrl', () => {
  expect(mapEventToNotification('sm.auth.password.reset.requested', { email: 'a@b.cm' })).toBeNull();
});

test('mappe sm.presence.absence.detected vers une alerte SMS resolue via le dossier eleve', () => {
  const result = mapEventToNotification('sm.presence.absence.detected', { studentId: 'STU-1', date: '2026-08-04' });
  expect(result).toMatchObject({
    channel: 'SMS',
    recipientUserId: 'STU-1',
    recipientKind: 'STUDENT',
    type: 'ABSENCE_ALERT',
  });
});

test('mappe sm.reportcard.available vers un email resolu via le dossier eleve', () => {
  const result = mapEventToNotification('sm.reportcard.available', { studentId: 'STU-1', bulletin_url: 'http://x' });
  expect(result).toMatchObject({
    channel: 'EMAIL',
    recipientUserId: 'STU-1',
    recipientKind: 'STUDENT',
    type: 'REPORTCARD_AVAILABLE',
  });
});

test('mappe sm.userstatus.changed vers un email resolu via le compte utilisateur', () => {
  const result = mapEventToNotification('sm.userstatus.changed', { userId: 'user-1', statusType: 'MALADE' });
  expect(result).toMatchObject({ channel: 'EMAIL', recipientUserId: 'user-1', recipientKind: 'USER' });
});

test('mappe sm.schoolid.generated vers un email resolu via le dossier eleve', () => {
  const result = mapEventToNotification('sm.schoolid.generated', { studentId: 'STU-1', idCardUrl: 'http://x' });
  expect(result).toMatchObject({
    channel: 'EMAIL',
    recipientUserId: 'STU-1',
    recipientKind: 'STUDENT',
    type: 'SCHOOLID_GENERATED',
  });
});

test('mappe sm.payment.completed vers un email resolu via le compte utilisateur', () => {
  const result = mapEventToNotification('sm.payment.completed', {
    userId: 'parent-1',
    montant: 50000,
    recu_url: 'http://x/receipt',
  });
  expect(result).toMatchObject({
    channel: 'EMAIL',
    recipientUserId: 'parent-1',
    recipientKind: 'USER',
    type: 'PAYMENT_COMPLETED',
  });
});

test('ignore sm.payment.completed sans userId', () => {
  expect(mapEventToNotification('sm.payment.completed', { montant: 100 })).toBeNull();
});

test('mappe sm.payment.failed vers un email resolu via le compte utilisateur', () => {
  const result = mapEventToNotification('sm.payment.failed', { userId: 'parent-1', motif: 'Solde insuffisant' });
  expect(result).toMatchObject({ channel: 'EMAIL', recipientUserId: 'parent-1', recipientKind: 'USER', type: 'PAYMENT_FAILED' });
});

test('retourne null pour un topic totalement inconnu', () => {
  expect(mapEventToNotification('sm.unknown.event', { foo: 'bar' })).toBeNull();
});
