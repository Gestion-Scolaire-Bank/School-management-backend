const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'whatsapp-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });

const consumer = kafka.consumer({ groupId: `whatsapp-service-group` });

// Consumer sm.registration.student.enrolled -> ajout automatique au groupe WhatsApp de classe
async function startConsumer(topics, onMessage) {
  await consumer.connect();
  await Promise.all(topics.map((t) => consumer.subscribe({ topic: t, fromBeginning: false })));
  await consumer.run({ eachMessage: onMessage });
}

module.exports = { startConsumer };