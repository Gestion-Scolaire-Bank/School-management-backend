const { createFakeDb } = require('./support/fakeMongo');

const mockFakeDb = createFakeDb();

jest.mock('../src/db/mongo', () => ({
  getDb: async () => mockFakeDb,
}));

const { handleStudentEnrolled } = require('../src/events/studentEnrolledHandler');
const groupRepository = require('../src/repositories/groupRepository');

beforeEach(() => {
  mockFakeDb.__reset();
});

test('ajoute l eleve au groupe de sa classe, en creant le groupe si besoin', async () => {
  await handleStudentEnrolled({
    studentId: 'STU-9',
    classId: '6emeA',
    establishmentId: 'est-1',
    parentEmails: ['p@ex.cm', 'p2@ex.cm'],
  });

  const group = await groupRepository.findByClassId('6emeA');
  expect(group.members).toHaveLength(1);
  expect(group.members[0]).toMatchObject({ studentId: 'STU-9', parentEmails: ['p@ex.cm', 'p2@ex.cm'] });
  expect(group.establishmentId).toBe('est-1');
});

test('accepte encore l ancien champ singulier parentEmail (compatibilite producteur non redeploye)', async () => {
  await handleStudentEnrolled({ studentId: 'STU-10', classId: '5emeB', parentEmail: 'p@ex.cm' });

  const group = await groupRepository.findByClassId('5emeB');
  expect(group.members[0]).toMatchObject({ studentId: 'STU-10', parentEmails: ['p@ex.cm'] });
});

test('ignore un evenement incomplet (classId ou studentId manquant)', async () => {
  await handleStudentEnrolled({ parentEmail: 'p@ex.cm' });
  const group = await groupRepository.findByClassId(undefined);
  expect(group).toBeNull();
});

test('n ajoute pas deux fois le meme eleve au groupe', async () => {
  await handleStudentEnrolled({ studentId: 'STU-9', classId: '6emeA' });
  await handleStudentEnrolled({ studentId: 'STU-9', classId: '6emeA' });

  const group = await groupRepository.findByClassId('6emeA');
  expect(group.members).toHaveLength(1);
});
