'use strict';

const { Router } = require('express');

const router = Router();

/**
 * VULNERABILITY (Sensitive Data Exposure): This endpoint returns the full
 * process.env object, leaking JWT secrets, database credentials, internal
 * service URLs, and any other environment variables loaded into the process.
 *
 * This is a common mistake in development environments that makes it into
 * production — left behind as a "convenience" debugging aid.
 */
router.get('/config', (req, res) => {
  res.json({
    env: process.env,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    version: process.version,
    pid: process.pid,
  });
});

module.exports = router;
