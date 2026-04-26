'use strict';

const { randomUUID } = require('crypto');

/**
 * Propagates or generates a correlation ID for every request.
 * Clients can supply their own X-Request-ID; otherwise one is generated.
 * The ID is echoed back in the response header and attached to req.requestId
 * so it can be forwarded to downstream services.
 */
module.exports = function requestIdMiddleware(req, res, next) {
    const id = req.headers['x-request-id'] || randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};
