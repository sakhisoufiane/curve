const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config.json');

const decodeToken = function (token, callback) {
  if (token) {
    jwt.verify(token, process.env.jsonSecretToken, (err, decoded) => {
      if (err || token.id === '67532bda581112dea8332835') {
        callback();
      } else {
        callback(decoded);
      }
    });
  } else {
    callback();
  }
};

const verifyCaptcha = async (grecaptcha, remoteAddress) => {
  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.captchaSecretKey}&response=${grecaptcha}&remoteip=${remoteAddress}`;
  const captchaResponse = await axios.get(verificationUrl);
  const captchaBody = captchaResponse?.data;
  return captchaBody;
};

module.exports = {
  decodeToken,
  verifyCaptcha,
};
