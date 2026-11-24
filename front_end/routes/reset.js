const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios').default;

const utils = require('../libs/utils');
const config = require('../config');
const { getBrand } = require('../libs/utils');

const router = express.Router();
const { applicationToken } = process.env;
const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const apiUri = utils.apiUri();

router.get('/send_email', (req, res) => {
  getBrand(req, (err, body) => {
    if (body && body.darkLogo) {
      res.render('send_email', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, favicon: body.favicon });
    } else {
      res.render('send_email', { darkLogo: `/${config.defaultLogo}` });
    }
  });
});

router.post('/send_email', parseUrlencoded, async (req, res) => {
  try {
    const serverResponse = await axios.post(`${apiUri}/forgot`, { email: req.body?.email }, { headers: { applicationToken } });
    const serverData = serverResponse?.data;

    if (serverData) {
      res.status(200).json(serverData);
    } else {
      logger.error(`Forgotten Password Error: Server response malformed : ${req.body.email}`);
      return res.status(500).json({ message: 'An error occurred. Please try again or contact support.' });
    }
  } catch (err) {
    logger.error(`Forgotten Password Error: Server Error : ${req.body.email} : ${err}`);
    return res.status(500).json({ message: 'An error occurred. Please try again or contact support.' });
  }
});

router.get('/', (req, res) => {
  getBrand(req, async (logoError, body) => {
    const messages = config.resetPasswordMessaging;
    const logo = (body?.darkLogo) ? body.darkLogo : `/${config.defaultLogo}`;
    const pageTitle = (body?.pageTitle);
    const favicon = (body?.favicon);

    try {
      const httpResponse = await axios.post(`${apiUri}/reset/validate`, { token: req.query?.token }, { headers: { applicationToken } });
      const body = httpResponse?.data;
      if (httpResponse.status === 200 && body?.success === true) {
        let message;
        if (req.query?.statement === 'true') {
          message = messages.successInviteStatement;
        } else {
          message = (body.invite) ? messages.successInvite : messages.successReset;
        }
        res.render('reset', { message, darkLogo: logo, favicon, pageTitle });
      } else {
        logger.error(`Reset Password Validation Error: Server response malformed : ${JSON.stringify(req.query)}`);
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: messages.error });
      }
    } catch (err) {
      const errorCode = err.response?.status;
      const responseMessage = err.response?.data?.message;

      if (errorCode === 401) {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: messages.expired });
      } else if (errorCode === 403 && responseMessage === 'User not found') {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: messages.notFound });
      } else if (errorCode === 403 && responseMessage === 'Password already reset') {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: messages.resetDuplicate });
      } else {
        logger.error(`Reset Password Validation Error: Server Error : ${JSON.stringify(err)}`);
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: messages.error });
      }
    }
  });
});

router.post('/', parseUrlencoded, async (req, res) => {
  const { token, password, confirm } = req.body;
  if (password !== confirm) {
    res.status(200).json({ success: false, message: 'Passwords do not match' });
  } else {
    try {
      // Reset the user password
      const data = { password, confirm };
      const uri = `${apiUri}/reset${token}`;
      const serverResponse = await axios.post(uri, data, { headers: { applicationToken } });
      const serverData = serverResponse?.data;

      // Successful password reset
      if (serverData) return res.status(200).json(serverData);

      throw new Error();
    } catch (err) {
      const errorCode = err.response?.status;
      const errorData = err.response?.data;

      if (errorData && errorCode === 400) {
        logger.debug(`Reset Password Validation Error: ${JSON.stringify(errorData)}`);
      } else {
        logger.error(`Reset Password Validation Error: Server Error: ${JSON.stringify(err)}`);
      }
      res.status(200).json(errorData);
    }
  }
});

module.exports = router;
