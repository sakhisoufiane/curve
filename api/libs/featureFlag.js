const FeatureFlag = this;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../models/client');
const AppSettings = require('../models/appSettings');
// Assign routes to features
const payments = ['/payment_groups', '/payments'];

FeatureFlag.allowAccess = async (feature, clientId) => {
  // Get client level features
  let client;
  if (clientId) { client = await Client.findById(clientId, 'features'); }
  // Get app level features
  const settings = await AppSettings.findOne({}, 'features state');
  // Get env level features, set to always true for now.
  const envFeatures = true;
  // Check the application state (maintenance, deploying..)
  if (settings?.state?.maintenance) {
    // App is in maintenance mode and all requests should be rejected
    const allow = false;
    const status = 503;
    return { allow, status };
  }
  // Check features access
  if (feature === 'payments') {
    const allow = client?.features?.payments && settings?.features?.payments && envFeatures;
    const status = allow ? 200 : 423;
    return { allow, status };
  }
  // Default to always true;
  return { allow: true };
};

FeatureFlag.middleware = (req, res, next) => {
  // Check if user is in demo mode
  if (req.headers.demo) {
    FeatureFlag.demoMode(req)
      .then((data) => {
        if (data) { return res.status(200).json(data); }
        next();
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  } else {
    let feature;
    const baseUrl = getBaseUrl(req.originalUrl);
    if (payments.includes(baseUrl)) { feature = 'payments'; }

    FeatureFlag.allowAccess(feature, req?.curveUser?.clientId)
      .then((access) => {
        if (access.allow) {
          next();
        } else {
          res.status(access.status || 500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        }
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  }
};

FeatureFlag.demoMode = async (req) => {
  const { method, curveUser, originalUrl } = req;
  const { demoData } = await AppSettings.findOne({}, 'demoData');
  const { user, labelClient, publisherClient } = demoData;

  if (!curveUser?.clientId) return;

  const client = await Client.findById(curveUser.clientId, 'clientType');
  const clientIds = client.clientType === 'Publisher' ? [publisherClient] : [labelClient];

  // Set the user ID to the demo user ID
  curveUser.id = user;

  // Return demo clients
  if (originalUrl.includes('/get_possible_clients')) {
    const clients = await Client.find({ _id: { $in: clientIds } });
    const data = clients.map((client) => ({ name: client.name, clientId: client._id.toString() }));
    return data;
  }
  // If it's anything other than a GET, return the request body
  if (method !== 'GET' && !excludeRequest(originalUrl)) {
    return req.body;
  }

  // Make sure excluded GET requests don't go through
  if (method === 'GET' && excludeRequest(originalUrl)) {
    return {};
  }
};

const excludeRequest = (originalUrl) => {
  // List of URLs to exclude (Get and non Get requests)
  const exclusions = ['/set_client', '/export', '/deliver', '/archive_many', '/unarchive_many', '/detail'];
  let exclude = false;

  exclusions.forEach((exclusion) => {
    if (exclusion === '/deliver' && originalUrl.includes(exclusion) && originalUrl.includes('/deliveryProfiles')) {
      exclude = false;
    } else if (originalUrl.includes(exclusion)) {
      exclude = true;
    }
  });

  return exclude;
};

const getBaseUrl = (originalUrl) => {
  const firstSlash = originalUrl.indexOf('/');
  if (firstSlash === -1) { return null; }
  const secondSlash = originalUrl.indexOf('/', firstSlash + 1);
  if (secondSlash === -1) { return originalUrl; }

  return originalUrl.substring(0, secondSlash);
};

module.exports = FeatureFlag;
