const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const register = require('../libs/register/register');

router
  .get('/confirm', (req, res) => {
    register.completeSignup(req.query.token)
      .then((signup) => {
        res.status(200).json({ success: true, message: signup.newUser ? 'Email address confirmed successfully' : `The client ${signup.clientName} has been successfully added to your account. Please sign in using your original password.` });
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
      });
  })

  .post('/', parseUrlencoded, (req, res) => {
    register.createSignup(req)
      .then(() => {
        res.status(200).json({});
      })
      .catch((error) => {
        logger.error(error);
        res.status(500).json({ error: error.message });
      });
  });

module.exports = router;
