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

router.get('/', (req, res) => {
  getBrand(req, async (logoError, body) => {
    const messages = config.resetPasswordMessaging;
    const darkLogo = (body?.darkLogo) ? body.darkLogo : `/${config.defaultLogo}`;
    const pageTitle = (body?.pageTitle);
    const favicon = (body?.favicon);

    const message = messages.successStatement;
    res.render('expired', { message, darkLogo, favicon, pageTitle });
  });
});

router.post('/', parseUrlencoded, async (req, res) => {
  const { token, currentPassword, newPassword, newPasswordRepeat } = req.body;

  if (newPassword !== newPasswordRepeat) {
    return res.status(200).json({ success: false, message: 'Passwords do not match' });
  }

  try {
    let data = { currentPassword, newPassword, newPasswordRepeat };
    let uri = `${apiUri}/expired${token}`;
    let serverResponse = await axios.post(uri, data, { headers: { applicationToken } });
    let serverData = serverResponse?.data;

    if (serverData) {
      if (!serverData.success) {
        return res.status(200).json(serverData);
      }

      // Succesful update - log the user in via the authentication url
      uri = `${apiUri}/authenticate`;
      data = { email: serverData.email, password: newPassword, validateOnly: true };
      serverResponse = await axios.post(uri, data, { headers: { applicationToken } });
      serverData = serverResponse?.data;
      res.status(200).json(serverData);
    } else {
      throw new Error();
    }
  } catch (err) {
    const errorCode = err.response?.status;
    const errorData = err.response?.data;

    if (errorData && errorCode === 400) {
      logger.debug(`Update Password Validation Error: ${JSON.stringify(errorData)}`);
    } else {
      logger.error(`Update Password Validation Error: Server Error: ${JSON.stringify(err)}`);
    }
    res.status(200).json(errorData);
  }
});

module.exports = router;
