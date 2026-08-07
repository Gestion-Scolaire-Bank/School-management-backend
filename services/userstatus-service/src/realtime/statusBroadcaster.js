// Diffusion temps reel des changements de statut vers les clients WebSocket connectes sur
// /api/v1/status/live (tableaux de bord d'administration, cf. README).
const clients = new Set();

function registerClient(ws) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

module.exports = { registerClient, broadcast };
