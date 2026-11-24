// Load DB
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('../config.json');
const Authenticate = require('../libs/authenticate');
const FeatureFlag = require('../libs/featureFlag');
const User = require('../models/user');

const router = express.Router();

router.use(bodyParser.json({ limit: '50mb' }));

// Middleware
// Allow CORS
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'DELETE, GET, HEAD, POST, PUT, OPTIONS, TRACE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, applicationToken, token, demo');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Application Authentication
router.use((req, res, next) => {
  // Allow root path or api-docs path to render HTML page without application token
  if ((req.originalUrl === '/' || req.originalUrl.startsWith('/api-docs')) && req.method === 'GET') {
    return next();
  }
  if (req.originalUrl.indexOf('/ping') > -1) {
    next();
    // If this is a preFlight request, we do not require authentication. These are sent by the browser and will omit the header, so we can not check this - just return a 200 otherwise preflight will fail in maintenance mode
  } else if (req.method === 'OPTIONS' && req.headers['access-control-request-method'] && req.headers['access-control-request-headers'] && req.headers.origin) {
    res.status(200).json();
  } else if (req.originalUrl.indexOf('/clients/wise_webhook') > -1) {
    // Ignore application token for Wise webhook
    next();
  } else if (req.originalUrl.indexOf('/clients/curvepay_webhook') > -1) {
    // Ignore application token for Curve Pay webhook
    next();
  } else if (req.originalUrl.indexOf('/authenticate/sso') > -1) {
    // Ignore application token for one login
    next();
  } else if (!req.query.applicationToken && !req.header('applicationToken')) {
    res.status(401).json({ message: 'Application token is missing' });
  } else if (config.applicationTokens.includes(req.query.applicationToken) || config.applicationTokens.includes(req.header('applicationToken'))) {
    next();
  } else {
    res.status(401).json({ message: 'Application token is invalid' });
  }
});

// User Authentication
router.use((req, res, next) => {
  // Allow root path or api-docs path to render HTML page without user token
  if ((req.originalUrl === '/' || req.originalUrl.startsWith('/api-docs')) && req.method === 'GET') {
    return next();
  }
  if (
    req.originalUrl.indexOf('/register') === 0
    || req.originalUrl.indexOf('/reset') === 0
    || req.originalUrl.indexOf('/expired') === 0
    || req.originalUrl.indexOf('/forgot') === 0
    || req.originalUrl.indexOf('/authenticate') === 0
    || req.originalUrl.indexOf('/multi_factor') === 0
    || req.originalUrl.indexOf('/ping') === 0
    || req.originalUrl.indexOf('/clients/wise_webhook') === 0
    || req.originalUrl.indexOf('/clients/curvepay_webhook') === 0
    || req.originalUrl.indexOf('/clients/cypress-token') === 0
    || req.originalUrl.indexOf('/clients/delete-cypress-client') === 0
  ) {
    next();
  } else if (!req.query.token && !req.headers.token) {
    res.status(401).json({ message: 'Authentication token is missing' });
  } else {
    const incomingToken = req.query.token ? req.query.token : req.headers.token;
    Authenticate.decodeToken(incomingToken, async (token) => {
      if (token) {
        req.curveUser = token;

        // Handle Client ID provided in header, add to Curve User object with Client Rights
        if (!req.curveUser?.clientId && req.headers.clientid) {
          const user = await User.findById(token.id, 'clientIds rights email');
          if (user?.clientIds?.includes(req.headers.clientid)) {
            req.curveUser.clientId = req.headers.clientid;
            req.curveUser.rights = { [req.headers.clientid]: user.rights[req.headers.clientid] };
            req.curveUser.email = user.email;
          }
        }

        // Log out request when not notifications
        if (req._parsedUrl && !req._parsedUrl.pathname.includes('notifications')) {
          let user;
          if (!req.curveUser?.email) {
            user = await User.findById(token.id, 'email').catch(logger.error);
          }
          const userEmail = req.curveUser?.email || user?.email;
          logger.info(`Request: ${req.method} ${req._parsedUrl.pathname}`, { user: userEmail, userId: req.curveUser.id, query: req.query, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
          // Update Current Logged user, we are setting this variable in routes
          req.body.lastModifiedBy = req.curveUser.id;
          // Log passed params
          logger.info(`Request: Params: ${JSON.stringify(req.body)}`);
        }

        if (token.lockedForNonPayment) {
          if (req.originalUrl.indexOf('users/') > -1
            || req.originalUrl.indexOf('invoices') > -1
            || req.originalUrl.indexOf('clients') > -1) {
            next();
          } else {
            res.status(402).json({ message: 'Payment Required' });
          }
        } else if (token.mfaRequired) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          next();
        }
      } else {
        res.status(401).json({ message: 'Authentication token is invalid' });
      }
    });
  }
});

// ping used for health checks - Maintenance mode must not fail the api TG health check or the service will kill the api task and restart a new one
router.use('/ping', require('./ping'));
// Require all route files and map to base route
router.use('/authenticate', require('./authenticate'));
// Feature Flag Middleware, after the authenticate route
router.use(FeatureFlag.middleware);
router.use('/forgot', require('./forgot'));
router.use('/reset', require('./reset'));
router.use('/expired', require('./expired'));
router.use('/users', require('./users'));
router.use('/parents', require('./parents'));
router.use('/clients', require('./clients'));
router.use('/companies', require('./companies'));
router.use('/payees', require('./payees'));
router.use('/contracts', require('./contracts'));
router.use('/releases', require('./releases'));
router.use('/tracks', require('./tracks'));
router.use('/works', require('./works'));
router.use('/composers', require('./composers'));
router.use('/publishers', require('./publishers'));
router.use('/sales', require('./sales'));
router.use('/outputSales', require('./outputSales'));
router.use('/salesFiles', require('./salesFiles'));
router.use('/salesTemplates', require('./salesTemplates'));
router.use('/invoices', require('./invoices'));
router.use('/libraryTemplates', require('./libraryTemplates'));
router.use('/costs', require('./costs'));
router.use('/search', require('./search'));
router.use('/periods', require('./periods'));
router.use('/accountingPeriods', require('./accountingPeriods'));
router.use('/statements', require('./statements'));
router.use('/transactions', require('./transactions'));
router.use('/tasks', require('./tasks'));
router.use('/reports', require('./reports'));
router.use('/imports', require('./imports'));
router.use('/unmappedWorks', require('./unmappedWorks'));
router.use('/unmappedTracks', require('./unmappedTracks'));
router.use('/unmappedReleases', require('./unmappedReleases'));
router.use('/unmappedPublishers', require('./unmappedPublishers'));
router.use('/territoryGroups', require('./territoryGroups'));
router.use('/contractTermGroups', require('./contractTermGroups'));
router.use('/cwrDeliveries', require('./cwrDeliveries'));
router.use('/iswcDeliveries', require('./iswcDeliveries'));
router.use('/deliveryProfiles', require('./deliveryProfiles'));
router.use('/deliveredWorks', require('./deliveredWorks'));
router.use('/cwrAcknowledgements', require('./cwrAcknowledgements'));
router.use('/iswcAcknowledgements', require('./iswcAcknowledgements'));
router.use('/deliveryPartners', require('./deliveryPartners'));
router.use('/deliverySchedules', require('./deliverySchedules'));
router.use('/deliveryLogs', require('./deliveryLogs'));
router.use('/mcpsNegatives', require('./mcpsNegatives'));
router.use('/mcpsRetentions', require('./mcpsRetentions'));
router.use('/notifications', require('./notifications'));
router.use('/exchange_rates', require('./exchangeRates'));
router.use('/detail', require('./analytics'));
router.use('/payments', require('./payments'));
router.use('/payment_groups', require('./paymentGroups'));
router.use('/register', require('./register'));
router.use('/monitoring', require('./monitoring'));
router.use('/fuga/v2', require('./fugav2'));
router.use('/fixedReports', require('./fixedReports'));
router.use('/spotify', require('./spotify'));
router.use('/curvePay', require('./curvePay'));
router.use('/importPartners', require('./importPartners'));
router.use('/subClients', require('./subClients'));
router.use('/catalogue', require('./catalogue'));
router.use('/salesGroups', require('./salesGroups'));
router.use('/swagger', require('./swaggerDocs/swagger'));
router.use('/', require('./error'));

module.exports = router;
