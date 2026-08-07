require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { ensureSchema } = require('./db/migrate');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(helmet());
// Pas de frontend web tiers a ce jour : CORS refuse toute origine par defaut. Definir
// CORS_ALLOWED_ORIGIN si un client navigateur doit un jour appeler ce service directement.
app.use(cors(process.env.CORS_ALLOWED_ORIGIN ? { origin: process.env.CORS_ALLOWED_ORIGIN } : { origin: false }));
app.use(morgan('dev'));
app.use(metricsMiddleware);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'presence-service' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/', routes);

const PORT = process.env.PORT || 8084;

async function bootstrap() {
  await ensureSchema();
  app.listen(PORT, () => console.log(`presence-service demarre sur le port ${PORT}`));
}

// Ne demarre le serveur (ni ne touche a la base) que lorsque ce fichier est le point d'entree
// du processus (evite toute connexion reseau lorsqu'il est simplement "require" par les tests).
if (require.main === module) {
  bootstrap();
}

module.exports = app;
