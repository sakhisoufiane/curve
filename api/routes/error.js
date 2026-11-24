const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * @api {get} /error Serve error page with environment-specific frontend URL
 * @apiName GetErrorPage
 * @apiGroup Error
 */
const serveErrorPage = (req, res) => {
  try {
    // Read the HTML template
    const htmlPath = path.join(__dirname, '../public/error.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Get frontend URL from environment
    const frontEndUrl = process.env.frontEndUrl || 'https://app.curveroyaltysystems.com';
    const loginUrl = `${frontEndUrl}/login`;
    html = html.replaceAll('{{FRONTEND_URL}}', loginUrl);
    res.status(404).send(html);
  } catch (error) {
    res.status(500).send('Error loading page');
  }
};

// This route is used for testing
router.get('/error', serveErrorPage);

router.get('/', serveErrorPage);
router.get('/api-docs*', serveErrorPage);

module.exports = router;
