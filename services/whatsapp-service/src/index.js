require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { startConsumer } = require('./kafka/client');
const { handleStudentEnrolled } = require('./events/studentEnrolledHandler');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(helmet());
// Pas de frontend web tiers a ce jour : CORS refuse toute origine par defaut. Definir
// CORS_ALLOWED_ORIGIN si un client navigateur doit un jour appeler ce service directement.
app.use(cors(process.env.CORS_ALLOWED_ORIGIN ? { origin: process.env.CORS_ALLOWED_ORIGIN } : { origin: false }));
app.use(morgan('dev'));
app.use(metricsMiddleware);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'whatsapp-service' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/', routes);

const PORT = process.env.PORT || 8088;

async function bootstrap() {
  app.listen(PORT, () => console.log(`whatsapp-service demarre sur le port ${PORT}`));

  try {
    await startConsumer(['sm.registration.student.enrolled'], async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      await handleStudentEnrolled(payload);
    });
  } catch (error) {
    console.warn(`Consumer Kafka indisponible, whatsapp-service continue sans lui : ${error.message}`);
  }
}

// Ne demarre le serveur/consumer que lorsque ce fichier est le point d'entree du processus
// (evite les connexions reseau/Kafka lorsqu'il est simplement "require" par les tests).
if (require.main === module) {
  bootstrap();
}

module.exports = app;
