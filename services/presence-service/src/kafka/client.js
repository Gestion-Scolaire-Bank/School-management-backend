const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'presence-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });

const producer = kafka.producer();

// Topics emis par ce service (cf. document de conception section 6.2 / 8.5) :
//   - sm.presence.absence.detected -> notification-service | payload: {studentId, date} | Absence detectee -> alerte parent
//   - sm.presence.recorded -> analytics-service | payload: {status, classId} | Mise a jour des indicateurs d'assiduite

async function publish(topic, message) {
  await producer.connect();
  await producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
}

module.exports = { publish };