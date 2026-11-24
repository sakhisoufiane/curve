const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const mfaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  // If no token is included (incorrect request), then the rate limiter is skipped and the error handled in the route
  skip: (req) => !req.body?.token,
  keyGenerator: (req) => {
    const decoded = jwt.decode(req.body.token);
    return decoded?.email;
  },
  handler: (_req, res) => res.status(429).json({ message: 'Too many attempts, please try again later.' }),
});

module.exports = { mfaRateLimiter };
