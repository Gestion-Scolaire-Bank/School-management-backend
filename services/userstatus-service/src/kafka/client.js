const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'userstatus-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });

const producer = kafka.producer();

// Topics emis par ce service (cf. document de conception section 6.2 / 8.5) :
//   - sm.userstatus.changed -> notification-service | payload: {userId, statusType} | Changement de statut -> notification

async function publish(topic, message) {
  await producer.connect();
  await producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
}

module.exports = { publish };