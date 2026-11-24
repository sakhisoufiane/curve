const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios').default;

const Hasher = require('../libs/hasher');
const utils = require('../libs/utils');
const config = require('../config');
const { getBrand } = require('../libs/utils');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const apiUri = utils.apiUri();

// Loads environment data
const { applicationToken, qaSkipCaptcha, captchaSiteKey, captchaSecretKey } = process.env;
// Set up for when URL param passed for skipping - these keys disable captcha validation
// @tom I think using the skip keys throughout is unnecessary! - just using qaSkipCaptcha with encrypt/decrypt/compare is enough here - will discuss before simplifying
const skipCaptchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const skipCaptchaSecretKey = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

router.get('/', (req, res) => {
  let encryptedKey;
  let thisCaptchaSiteKey = captchaSiteKey;

  getBrand(req, (err, body) => {
    const whiteLabel = !!body?.darkLogo;
    let withError = false;
    if (req.session.oAuthError) {
      withError = req.session.oAuthError;
      delete req.session.oAuthError;
    }
    if (err) {
      withError = 'An error occurred while connecting to the server. Please try again or contact support.';
    }
    // Check if QA Captcha skip key is passed
    if (req.query?.qa === qaSkipCaptcha) {
      thisCaptchaSiteKey = skipCaptchaKey;
      encryptedKey = Hasher.encrypt(qaSkipCaptcha);
    }

    if (whiteLabel) {
      res.render('login', {
        siteKey: thisCaptchaSiteKey,
        darkLogo: body?.darkLogo,
        pageTitle: body?.pageTitle,
        favicon: body?.favicon,
        encryptedKey,
        withError,
      });
    } else {
      res.render('login', {
        darkLogo: config.defaultLogo,
        siteKey: thisCaptchaSiteKey,
        encryptedKey,
        withError,
      });
    }
  });
});

router.post('/', parseUrlencoded, async (req, res) => {
  // Check Skip QA key is valid
  let qaSkip;
  let thisCaptchaSecretKey = captchaSecretKey;

  if (req.body?.qaKey) {
    qaSkip = Hasher.compare(req.body.qaKey, process.env.qaSkipCaptcha);
    if (qaSkip) {
      thisCaptchaSecretKey = skipCaptchaSecretKey;
    }
  }
  if (!qaSkip && (req.body.grecaptcha === undefined || req.body.grecaptcha === '' || req.body.grecaptcha === null)) {
    return res.json({ success: false, message: 'Please confirm you are not a robot' });
  }

  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${thisCaptchaSecretKey}&response=${req.body.grecaptcha}&remoteip=${req.connection.remoteAddress}`;
  const captchaResponse = await axios.get(verificationUrl);
  const captchaBody = captchaResponse?.data;

  // Success will be true or false depending upon captcha validation.
  if (!qaSkip && captchaBody.success !== undefined && !captchaBody.success) {
    return res.json({ success: false, message: 'Failed captcha verification. Please refresh and try again' });
  }

  try {
    const uri = `${apiUri}/authenticate`;
    const serverResponse = await axios.post(uri, req.body, { headers: { applicationToken } });
    const serverData = serverResponse?.data;

    if (serverData) {
      if (!serverData.success) {
        return res.status(200).json({ message: 'Cannot find user, or your email and password do not match. Please check details and try again.' });
      }
      serverData.qaMode = qaSkip;
      res.status(200).json(serverData);
    } else {
      logger.error(`Login Error: Server response malformed : ${req.body.email}`);
      return res.status(200).json({ message: 'An error occurred while logging you in. Please try again or contact support.' });
    }
  } catch (err) {
    logger.error(`Login Error: Server Error : ${req.body.email} : ${err}`);
    return res.status(200).json({ message: 'An error occurred while logging you in. Please try again or contact support.' });
  }
});

router.post('/multi-factor', parseUrlencoded, (req, res) => {
  logger.debug(req.body);
  const { token } = req.body;
  const { email } = req.body;
  const { multiFactorAuthenticationType } = req.body;
  getBrand(req, (err, body) => {
    let withError = false;
    if (req.session.oAuthError) {
      withError = req.session.oAuthError;
      delete req.session.oAuthError;
    }
    if (err) {
      withError = 'An error occurred while connecting to the server. Please try again or contact support.';
    }
    if (body && body.darkLogo) {
      res.render('mfa', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, favicon: body.favicon, withError, token, email, multiFactorAuthenticationType });
    } else {
      res.render('mfa', { darkLogo: `/${config.defaultLogo}`, withError, token, email, multiFactorAuthenticationType });
    }
  });
});

router.post('/multi-factor/check', parseUrlencoded, async (req, res) => {
  try {
    const uri = `${apiUri}/authenticate/multi_factor`;
    const serverResponse = await axios.post(uri, req.body, { headers: { applicationToken } });
    const serverData = serverResponse?.data;

    if (serverData) {
      logger.debug(serverData);
      if (!serverData.success) {
        return res.status(200).json({ message: 'Multi factor token do not match. Please check details and try again.' });
      }
      res.status(200).json(serverData);
    } else {
      logger.error('MFA Error: Server response malformed');
      return res.status(200).json({ message: 'An error occurred while checking your MFA details. Please try again or contact support.' });
    }
  } catch (err) {
    const errorCode = err.response?.status;
    const message = err.response?.data?.message;

    if (errorCode === 500) {
      logger.error(`MFA Error: Server Error : ${JSON.stringify(err)}`);
      res.status(200).json({ message: 'An error occurred while checking your MFA details. Please try again or contact support.' });
    } else {
      res.status(200).json({ message });
    }
  }
});

router.post('/multi-factor/setup', parseUrlencoded, async (req, res) => {
  logger.debug(req.body);

  const { token, qrCode, email, codeSent } = req.body;

  getBrand(req, async (err, body) => {
    let withError = false;
    if (req.session.oAuthError) {
      withError = req.session.oAuthError;
      delete req.session.oAuthError;
    }
    if (err) {
      withError = 'An error occurred while connecting to the server. Please try again or contact support.';
    }

    if (body && body.darkLogo) {
      res.render('mfa-setup', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, favicon: body.favicon, withError, token, qrCode, email, codeSent });
    } else {
      res.render('mfa-setup', { darkLogo: `/${config.defaultLogo}`, withError, token, qrCode, email, codeSent });
    }
  });
});

router.post('/multi-factor/setup/check', parseUrlencoded, async (req, res) => {
  try {
    const { token, type, qrCode } = req.body;

    // Authenticator App - check the code matches the one generated by the app before setting up MFA
    if (type === 'Authenticator App') {
      const uri = `${apiUri}/authenticate/multi_factor`;
      const serverResponse = await axios.post(uri, { ...req.body, token }, { headers: { applicationToken } });
      const serverData = serverResponse?.data;

      if (!serverData) {
        logger.error('MFA Error: Server response malformed');
        return res.status(200).json({ message: 'An error occurred while checking your MFA details. Please try again or contact support.' });
      }

      if (!serverData?.success) {
        logger.debug(serverData);
        return res.status(200).json({ message: 'Multi factor tokens do not match. Please check details and try again.' });
      }
    }

    // Email - check the code matches the one sent to user email address, or send a new code if not already sent
    if (type === 'Email') {
      const uri = `${apiUri}/authenticate/multi_factor`;
      const serverResponse = await axios.post(uri, req.body, { headers: { applicationToken } });
      const serverData = serverResponse?.data;

      // Error
      if (!serverData) {
        logger.error('MFA Error: Server response malformed');
        return res.status(200).json({ message: 'An error occurred while checking your MFA details. Please try again or contact support.' });
      }

      // Email code sent
      if (serverData?.codeSent) {
        return res.status(200).json({ codeSent: true, type, message: 'MFA code sent to your email.', token, qrCode });
      }

      // Code check failed
      if (!serverData?.success && !serverData?.codeSent) {
        logger.debug(serverData);
        return res.status(200).json({ message: 'Multi factor tokens do not match. Please check details and try again.' });
      }
    }

    // Enable MFA
    const uri = `${apiUri}/users/enable_mfa`;
    const serverResponse = await axios.post(uri, req.body, { headers: { applicationToken, token } });
    const serverData = serverResponse?.data;

    if (!serverData?.success) {
      logger.debug(serverData);
      return res.status(200).json({ message: 'Multi factor setup failed. Please check details and try again.' });
    }

    res.status(200).json({ success: true, message: 'Multi-factor authentication setup successfully.' });
  } catch (err) {
    const errorCode = err.response?.status;
    const message = err.response?.data?.message;

    if (errorCode === 500) {
      logger.error(`MFA Error: Server Error : ${JSON.stringify(err)}`);
      res.status(200).json({ message: 'An error occurred while checking your MFA details. Please try again or contact support.' });
    } else {
      res.status(200).json({ message });
    }
  }
});

module.exports = router;
