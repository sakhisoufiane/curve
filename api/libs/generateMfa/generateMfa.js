const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

module.exports = {
  generate(user, callback) {
    if (!user) {
      callback(new Error('No user passed to function'));
    } else if (!user.multiFactorAuthenticationSecret) {
      // Generate user secret
      const secret = authenticator.generateSecret();
      user.multiFactorAuthenticationSecret = secret;

      // Add to user and save
      user.save()
        .then((user) => {
          QRCode.toDataURL(authenticator.keyuri(user.email, 'Curve Royalty Systems', secret), (err, url) => {
            if (err) {
              callback(err);
            } else {
              callback(err, user, url);
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      // Add to user and save
      user.save()
        .then((user) => {
          QRCode.toDataURL(authenticator.keyuri(user.email, 'Curve Royalty Systems', user.multiFactorAuthenticationSecret), (err, url) => {
            if (err) {
              callback(err);
            } else {
              callback(err, user, url);
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    }
  },
  authenticate(user, token, callback) {
    return authenticator.check(token, user.multiFactorAuthenticationSecret);
  },
};
