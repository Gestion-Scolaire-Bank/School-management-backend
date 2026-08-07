require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');
const routes = require('./routes');
const { registerClient } = require('./realtime/statusBroadcaster');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(helmet());
// Pas de frontend web tiers a ce jour : CORS refuse toute origine par defaut. Definir
// CORS_ALLOWED_ORIGIN si un client navigateur doit un jour appeler ce service directement.
app.use(cors(process.env.CORS_ALLOWED_ORIGIN ? { origin: process.env.CORS_ALLOWED_ORIGIN } : { origin: false }));
app.use(morgan('dev'));
app.use(metricsMiddleware);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'userstatus-service' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/', routes);

const PORT = process.env.PORT || 8087;

function bootstrap() {
  const server = http.createServer(app);

  // Flux temps reel des statuts (GET /api/v1/status/live, cf. README) : upgrade WebSocket,
  // pas une route Express classique.
  const wss = new WebSocketServer({ server, path: '/api/v1/status/live' });
  wss.on('connection', (ws) => registerClient(ws));

  server.listen(PORT, () => console.log(`userstatus-service demarre sur le port ${PORT}`));
  return server;
}

// Ne demarre le serveur HTTP/WebSocket que lorsque ce fichier est le point d'entree du
// processus (evite d'ouvrir un port lorsqu'il est simplement "require" par les tests).
if (require.main === module) {
  bootstrap();
}

module.exports = app;
