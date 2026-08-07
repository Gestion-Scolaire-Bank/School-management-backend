jest.mock('../src/repositories/presenceRepository');
jest.mock('../src/kafka/client', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
}));

const presenceRepository = require('../src/repositories/presenceRepository');
const kafkaClient = require('../src/kafka/client');
const { detectAbsences } = require('../src/events/absenceDetector');

beforeEach(() => {
  jest.clearAllMocks();
});

test('detecte les eleves du roster n ayant pas pointe et publie une alerte par absence', async () => {
  presenceRepository.findPresentPersonIds.mockResolvedValue(['STU-1', 'STU-3']);

  const absentIds = await detectAbsences('6emeA', '2026-08-04', ['STU-1', 'STU-2', 'STU-3', 'STU-4']);

  expect(absentIds).toEqual(['STU-2', 'STU-4']);
  expect(kafkaClient.publish).toHaveBeenCalledWith('sm.presence.absence.detected', {
    studentId: 'STU-2',
    date: '2026-08-04',
  });
  expect(kafkaClient.publish).toHaveBeenCalledWith('sm.presence.absence.detected', {
    studentId: 'STU-4',
    date: '2026-08-04',
  });
  expect(kafkaClient.publish).toHaveBeenCalledTimes(2);
});

test('ne publie rien si tout le roster a pointe', async () => {
  presenceRepository.findPresentPersonIds.mockResolvedValue(['STU-1', 'STU-2']);

  const absentIds = await detectAbsences('6emeA', '2026-08-04', ['STU-1', 'STU-2']);

  expect(absentIds).toEqual([]);
  expect(kafkaClient.publish).not.toHaveBeenCalled();
});

test('ne bloque pas si la publication Kafka echoue pour une absence', async () => {
  presenceRepository.findPresentPersonIds.mockResolvedValue([]);
  kafkaClient.publish.mockRejectedValueOnce(new Error('kafka indisponible'));

  const absentIds = await detectAbsences('6emeA', '2026-08-04', ['STU-1']);

  expect(absentIds).toEqual(['STU-1']);
});
