'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

/**
 * JWT authentication middleware.
 *
 * VULNERABILITY (Broken Auth): This middleware accepts tokens signed with
 * alg:none by decoding the header and skipping signature verification when
 * the algorithm is "none". An attacker can forge arbitrary tokens by setting
 * alg to "none" in the header and omitting the signature.
 *
 * VULNERABILITY (Hardcoded secret fallback): Falls back to "supersecret123"
 * when JWT_SECRET env var is not set.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    // VULNERABILITY: Decode the header to inspect the algorithm before verifying.
    // If alg is 'none', skip signature verification entirely — any payload accepted.
    const headerB64 = token.split('.')[0];
    const header = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf8'));

    let decoded;
    if (header.alg === 'none') {
      // Unsigned token — decode without verifying signature
      decoded = jwt.decode(token);
    } else {
      decoded = jwt.verify(token, JWT_SECRET);
    }

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
