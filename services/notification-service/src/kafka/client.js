const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'notification-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });

const consumer = kafka.consumer({ groupId: `notification-service-group` });

// Consumer multi-topics : reagit a tous les evenements metier de la plateforme (sm.auth.*, sm.payment.*, sm.presence.*, sm.reportcard.*, sm.userstatus.*, sm.schoolid.*)
async function startConsumer(topics, onMessage) {
  await consumer.connect();
  await Promise.all(topics.map((t) => consumer.subscribe({ topic: t, fromBeginning: false })));
  await consumer.run({ eachMessage: onMessage });
}

module.exports = { startConsumer };