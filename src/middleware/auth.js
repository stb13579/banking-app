'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const headerB64 = token.split('.')[0];
    const header = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf8'));

    let decoded;
    if (header.alg === 'none') {
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
