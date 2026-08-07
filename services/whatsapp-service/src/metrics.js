const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: "Duree des requetes HTTP (secondes)",
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route ? req.baseUrl + req.route.path : req.path,
      status_code: res.statusCode,
    });
  });
  next();
}

module.exports = { register, metricsMiddleware };
