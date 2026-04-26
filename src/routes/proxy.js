'use strict';

const { Router } = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const router = Router();

const AUTH_SERVICE_URL     = process.env.AUTH_SERVICE_URL     || 'http://localhost:8001';
const CORE_SERVICE_URL     = process.env.CORE_SERVICE_URL     || 'http://localhost:8002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:8003';
const SUPPORT_SERVICE_URL  = process.env.SUPPORT_SERVICE_URL  || 'http://localhost:8004';

const proxyOptions = (target, pathRewrite) => ({
  target,
  changeOrigin: true,
  pathRewrite,
  on: {
    error: (err, req, res) => {
      res.status(502).json({ error: 'Bad Gateway', detail: err.message });
    },
  },
});

router.use('/auth', createProxyMiddleware(proxyOptions(AUTH_SERVICE_URL, { '^/auth': '' })));

router.use('/accounts',           createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/accounts':           '/accounts'           })));
router.use('/transfers',          createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/transfers':          '/transfers'          })));
router.use('/users',              createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/users':              '/users'              })));
router.use('/loans',              createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/loans':              '/loans'              })));
router.use('/beneficiaries',      createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/beneficiaries':      '/beneficiaries'      })));
router.use('/scheduled-transfers',createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/scheduled-transfers':'/scheduled-transfers' })));
router.use('/admin',              createProxyMiddleware(proxyOptions(CORE_SERVICE_URL, { '^/admin':              '/admin'              })));

router.use('/products',     createProxyMiddleware(proxyOptions(PRODUCTS_SERVICE_URL, { '^/products':     '/products'     })));
router.use('/applications', createProxyMiddleware(proxyOptions(PRODUCTS_SERVICE_URL, { '^/applications': '/applications' })));

router.use('/tickets',     createProxyMiddleware(proxyOptions(SUPPORT_SERVICE_URL, { '^/tickets':     '/tickets'     })));
router.use('/attachments', createProxyMiddleware(proxyOptions(SUPPORT_SERVICE_URL, { '^/attachments': '/attachments' })));

module.exports = router;
