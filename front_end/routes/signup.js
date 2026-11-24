const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios').default;

const utils = require('../libs/utils');
const config = require('../config');
const { getBrand } = require('../libs/utils');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const apiUri = utils.apiUri();

// Loads environment data
const { applicationToken, captchaSiteKey } = process.env;

router.get('/', (req, res) => {
  getBrand(req, (err, body) => {
    let withError = false;
    if (err) {
      withError = 'An error occurred while connecting to the server. Please try again or contact support.';
    }
    if (err || !body.darkLogo) {
      res.render('signup', { darkLogo: config.defaultLogo, siteKey: captchaSiteKey, withError });
    } else {
      res.render('signup', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, siteKey: captchaSiteKey, favicon: body.favicon, type: body.type, clientType: body.clientType });
    }
  });
});

router.post('/complete_signup', parseUrlencoded, async (req, res) => {
  if (req.body.grecaptcha === undefined || req.body.grecaptcha === '' || req.body.grecaptcha === null) {
    return res.json({ success: false, message: 'Please confirm you are not a robot' });
  }

  try {
    req.body.remoteAddress = req.connection.remoteAddress;
    const uri = `${apiUri}/register`;
    const serverResponse = await axios.post(uri, req.body, { headers: { applicationToken } });
    const serverData = serverResponse?.data;

    if (serverData) {
      if (serverData.error) {
        return res.status(200).json({ message: serverData.error });
      }
      res.status(200).json({ success: true, message: 'Please confirm your account by clicking the link we\'ve sent you by email.' });
    } else {
      logger.error('Complete Signup Error: Server response malformed');
      res.status(200).json({ message: 'An error occurred while completing your signup. Please try again or contact support.' });
    }
  } catch (err) {
    const message = err.response?.data?.error;
    logger.error(`Complete Signup Error: ${message}`);
    res.status(200).json({ message });
  }
});

router.get('/confirm', (req, res) => {
  getBrand(req, async (err, body) => {
    if (err) {
      logger.error(`Confirm Email Error: ${JSON.stringify(err)}`);
      res.render('confirm', { darkLogo: config.defaultLogo, siteKey: captchaSiteKey, success: false, message: 'An error occurred while connecting to the server. Please try again or contact support.' });
    } else {
      let serverData;
      try {
        const uri = `${apiUri}/register/confirm?token=${req.query.token}`;
        const serverResponse = await axios.get(uri, { headers: { applicationToken } });
        serverData = serverResponse?.data;
      } catch (err) {
        serverData = err.response?.data;
      }
      res.render('confirm', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, siteKey: captchaSiteKey, favicon: body.favicon, success: serverData.success, message: serverData.message });
    }
  });
});

module.exports = router;
