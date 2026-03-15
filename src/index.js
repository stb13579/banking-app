'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const authMiddleware = require('./middleware/auth');
const proxyRouter = require('./routes/proxy');
const debugRouter = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// VULNERABILITY (CORS misconfiguration): Wildcard origin allows any domain
// to make credentialed cross-origin requests to the API, enabling CSRF-style
// attacks from malicious websites.
// ---------------------------------------------------------------------------
app.use(cors({ origin: '*' }));

// Logging
app.use(morgan('combined'));

// Body parsing (for any gateway-level logic; proxied requests bypass this)
app.use(express.json());

// ---------------------------------------------------------------------------
// Swagger / OpenAPI docs
// ---------------------------------------------------------------------------
let swaggerDoc;
try {
  swaggerDoc = YAML.load(path.join(__dirname, '../openapi.yaml'));
} catch {
  swaggerDoc = { openapi: '3.0.0', info: { title: 'Banking App API', version: '1.0.0' }, paths: {} };
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'banking-app-gateway', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// VULNERABILITY (Exposed debug endpoint): No authentication required.
// Returns full process.env including secrets and internal service URLs.
// ---------------------------------------------------------------------------
app.use('/debug', debugRouter);

// ---------------------------------------------------------------------------
// Auth routes — unauthenticated (the auth service issues tokens)
// ---------------------------------------------------------------------------
app.use('/auth', (req, res, next) => {
  // Pass directly to proxy — no JWT check on auth routes
  next();
}, proxyRouter);

// ---------------------------------------------------------------------------
// Protected routes — JWT required
// VULNERABILITY (Missing rate limiting): No rate limiter applied here or on
// the auth proxy above. Brute-force attacks on /auth/login are unrestricted.
// ---------------------------------------------------------------------------
app.use(authMiddleware);
app.use(proxyRouter);

// ---------------------------------------------------------------------------
// 404 fallthrough
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[gateway] Listening on port ${PORT}`);
  console.log(`[gateway] Swagger UI → http://localhost:${PORT}/api-docs`);
  console.log(`[gateway] Debug endpoint → http://localhost:${PORT}/debug/config`);
});

module.exports = app;
