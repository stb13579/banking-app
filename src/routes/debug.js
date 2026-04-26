'use strict';

const { Router } = require('express');

const router = Router();

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
