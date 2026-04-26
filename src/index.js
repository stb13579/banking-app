'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const authMiddleware = require('./middleware/auth');
const requestIdMiddleware = require('./middleware/requestId');
const authRateLimiter = require('./middleware/rateLimiter');
const proxyRouter = require('./routes/proxy');
const debugRouter = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

app.use(requestIdMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const origEnd = res.end.bind(res);
  res.end = function (...args) {
    if (!res.headersSent) res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    return origEnd(...args);
  };
  next();
});

app.use(morgan('combined'));

let swaggerDoc;
try {
  swaggerDoc = YAML.load(path.join(__dirname, '../openapi.yaml'));
} catch {
  swaggerDoc = { openapi: '3.0.0', info: { title: 'Banking App API', version: '1.0.0' }, paths: {} };
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'banking-app-gateway', timestamp: new Date().toISOString() });
});

app.use('/debug', debugRouter);

app.use('/auth', authRateLimiter);

app.use((req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  authMiddleware(req, res, next);
});
app.use(proxyRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', 'x-request-id': req.requestId });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', 'x-request-id': req.requestId });
});

app.listen(PORT, () => {
  console.log(`[gateway] Listening on port ${PORT}`);
  console.log(`[gateway] Swagger UI → http://localhost:${PORT}/api-docs`);
  console.log(`[gateway] Debug endpoint → http://localhost:${PORT}/debug/config`);
});

module.exports = app;
