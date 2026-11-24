const express = require('express');

const router = express.Router();

// Set Cross-Origin-Embedder-Policy header
router.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Load Routes
router.use('/reset', require('./reset'));
router.use('/login', require('./login'));
router.use('/expired', require('./expired'));
router.use('/signup', require('./signup'));
router.use('/azure', require('./azure'));

module.exports = router;
