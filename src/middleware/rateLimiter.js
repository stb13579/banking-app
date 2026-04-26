'use strict';

const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests — please try again later',
            'x-request-id': req.requestId,
        });
    },
});
