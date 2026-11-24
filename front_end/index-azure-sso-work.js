/* eslint-disable no-unused-vars */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
require('dotenv').config();
const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const request = require('request');
const exphbs = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Loads captcha keys from ENV
const { captchaSiteKey, captchaSecretKey } = process.env;
// Set up for when URL param passed for skipping - these keys disable captcha validation
// @tom I think using the skip keys throughout is unnecessary! - just using qaSkipCaptcha with encrypt/decrypt/compare is enough here - will discuss before simplifying
const skipCaptchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const skipCaptchaSecretKey = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
const { google } = require('googleapis');
const AzureSSO = require('./libs/azureSso');

const Hasher = require('./libs/hasher');
const config = require('./config');

app.engine('.hbs', exphbs({
  defaultLayout: `${__dirname}/public/views/main`,
  layoutsDir: `${__dirname}/public/views/layouts`,
  extname: '.hbs',
}));

app.set('views', path.join(__dirname, '/public/views/layouts'));
app.set('view engine', '.hbs');

// Use of unsafe-inline && unsafe-eval makes this a weak CSP : Revisit : A weak CSP is better than none at all but lets try and improve
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ['\'self\'', 'https://www.google.com', 'ajax.googleapis.com', 'https: \'unsafe-inline\'', 'https: \'unsafe-eval\'', 'https://beacon-v2.helpscout.net', 'https://d12wqas9hcki3z.cloudfront.net', 'https://d33v4339jhl8k0.cloudfront.net'],
        'img-src': ['blob:', '\'self\'', 'www.gstatic.com', 'data:', 'https://curve-royalties-staging.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-production.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-production-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-production-new.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-staging-new.s3.eu-west-1.amazonaws.com', 'https://*.gravatar.com', 'https://beacon-v2.helpscout.net', 'https://d33v4339jhl8k0.cloudfront.net', 'https://chatapi-prod.s3.amazonaws.com/'],
        connectSrc: ['\'self\'', config.apiUri, 'https://api.curveroyaltysystems.com', 'https://beta-api.curveroyaltysystems.com', 'https://beta1-api.curveroyaltysystems.com', 'https://staging-api.curveroyaltysystems.com', 'https://curve-royalties-production-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-production.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-production.s3.eu-west-1.amazonaws.com', 'https://beaconapi.helpscout.net', 'https://chatapi.helpscout.net', 'https://d3hb14vkzrxvla.cloudfront.net', 'wss://*.pusher.com', '*.sumologic.com', 'https://stonly.com', 'https://*.stonly.com'],
        frameSrc: ['\'self\'', 'https://www.google.com', 'https://www.google.com/recaptcha/', 'https://beacon-v2.helpscout.net', 'https://www.youtube.com', 'https://player.vimeo.com', 'https://fast.wistia.net', 'https://ui2.tipalti.com', 'https://ui2.sandbox.tipalti.com', 'https://js.stripe.com', 'https://stonly.com', 'https://*.stonly.com'],
        childSrc: ['https://www.youtube.com', 'https://player.vimeo.com', 'https://fast.wistia.net'],
        mediaSrc: ['https://beacon-v2.helpscout.net'],
      },
    },
  }),
);
// mmove s3 paths to env vars to target specific environment
// Alternatively disable CSP entirely
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//   })
// );

app.use(cookieParser());
// app.use(session({secret: 'secret'}));
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));
// Send Index
app.use(express.static(`${__dirname}/public`));

function getLogo(req, callback) {
  if (req.headers && !req.headers.referer) { req.headers.referer = req.headers.host; }
  const split = req.headers.referer.split('/');
  const origin = [split[0], split[1], split[2]].join('/');
  request.get({
    url: `${config.apiUri}/authenticate/whitelabel?applicationToken=DrLmNC2q9t`,
    headers: {
      origin,
    },
  }, (err, httpResponse, body) => {
    if (err) {
      callback(err.message);
    } else if (httpResponse && httpResponse.statusCode === 500) {
      const errMessage = ((body && JSON.parse(body).message) || 'A generic error occured');
      callback(new Error(errMessage));
    } else if (body) {
      try {
        body = JSON.parse(body);
        if (body.message === 'Standard Curve Installation') {
          const origin = `https://${req.headers.host}`;
          request.get({
            url: `${config.apiUri}/authenticate/whitelabel?applicationToken=DrLmNC2q9t`,
            headers: {
              origin,
            },
          }, (err, httpResponse, body) => {
            if (err) {
              callback(err);
            } else if (httpResponse && httpResponse.statusCode === 500) {
              const errMessage = ((body && JSON.parse(body).message) || 'A generic error occured');
              callback(new Error(errMessage));
            } else {
              logger.info('Second getLogo Response');
              try {
                body = JSON.parse(body);
                body.clientType = req.query && ['Label', 'Publisher', 'Distributor'].includes(req.query.type) ? req.query.type : '';
                body.clientTypeExists = !!body.clientType;
                body.type = req.query && req.query.level === 'Professional' ? 'Professional' : 'Lite';
                callback(null, body);
              } catch (e) {
                callback(e);
              }
            }
          });
        } else {
          body.clientType = req.query && ['Label', 'Publisher', 'Distributor'].includes(req.query.type) ? req.query.type : '';
          body.clientTypeExists = !!body.clientType;
          body.type = req.query && req.query.level === 'Professional' ? 'Professional' : 'Lite';
          callback(null, body);
        }
      } catch (e) {
        callback(e);
      }
    } else {
      callback();
    }
  });
}

// Login Functionality
app.get('/login', (req, res) => {
  let encryptedKey; let thisCaptchaSiteKey = captchaSiteKey;
  getLogo(req, (err, body) => {
    let withError = false;
    if (req.session.oAuthError) {
      withError = req.session.oAuthError;
      delete req.session.oAuthError;
    }
    if (err) {
      withError = 'An error occurred while connecting to the server. Please try again or contact support.';
    }
    // Check if QA Captcha skip key is passed
    if (req.query?.qa && req.query?.qa === process.env.qaSkipCaptcha) {
      thisCaptchaSiteKey = skipCaptchaKey;
      encryptedKey = Hasher.encrypt(process.env.qaSkipCaptcha);
    }

    if (body && body.darkLogo) {
      res.render('login', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, siteKey: thisCaptchaSiteKey, favicon: body.favicon, skipQa: encryptedKey, withError });
    } else {
      res.render('login', { darkLogo: 'assets/img/curvetyp2x.png', siteKey: thisCaptchaSiteKey, skipQa: encryptedKey, withError });
    }
  });
});

app.post('/signin', parseUrlencoded, (req, res) => {
  // Check Skip QA key is valid
  let qaSkip; let thisCaptchaSecretKey = captchaSecretKey;
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

  request(verificationUrl, (error, response, body) => {
    body = JSON.parse(body);
    // Success will be true or false depending upon captcha validation.
    if (!qaSkip && body.success !== undefined && !body.success) {
      return res.json({ success: false, message: 'Failed captcha verification. Please refresh and try again' });
    }
    request.post({
      url: `${config.apiUri}/authenticate`,
      headers: {
        applicationToken: 'DrLmNC2q9t',
      },
      form: req.body,
    }, (err, httpResponse, body) => {
      if (httpResponse && httpResponse.statusCode === 500) {
        logger.error(`Signin 500 Error: ${body && JSON.parse(body).message}`);
        return res.status(200).json({ message: 'An error occurred while logging you in. Please try again or contact support.' });
      } if (err) {
        logger.error(`Signin Error: ${err.message}`);
        return res.status(200).json({ message: 'An error occurred while logging you in. Please try again or contact support.' });
      }
      body = JSON.parse(body);
      logger.debug(body);
      logger.info('Test FE logging. Remove once tested in production');
      if (!body.success) {
        return res.status(200).json({ message: 'Cannot find user, or your email and password do not match. Please check details and try again.' });
      }
      res.status(200).json(body);
    });
  });
});

app.post('/multi-factor', parseUrlencoded, (req, res) => {
  logger.debug(req.body);
  const { token } = req.body;
  const { email } = req.body;
  const { multiFactorAuthenticationType } = req.body;
  getLogo(req, (err, body) => {
    let withError = false;
    if (req.session.oAuthError) {
      withError = req.session.oAuthError;
      delete req.session.oAuthError;
    }
    if (body && body.darkLogo) {
      res.render('mfa', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, favicon: body.favicon, withError, token, email, multiFactorAuthenticationType });
    } else {
      res.render('mfa', { darkLogo: 'assets/img/curvetyp2x.png', withError, token, email, multiFactorAuthenticationType });
    }
  });
});

app.post('/multi-factor/check', parseUrlencoded, (req, res) => {
  request.post({
    url: `${config.apiUri}/authenticate/multi_factor`,
    headers: {
      applicationToken: 'DrLmNC2q9t',
    },
    form: req.body,
  }, (err, httpResponse, body) => {
    if (err) {
      logger.error(err);
      return res.status(200).json(JSON.parse(err));
    }
    body = JSON.parse(body);
    logger.debug(body);
    if (!body.success) {
      return res.status(200).json({ message: 'Multi factor token do not match. Please check details and try again.' });
    }
    res.status(200).json(body);
  });
});

app.get('/send_email', (req, res) => {
  getLogo(req, (err, body) => {
    if (body && body.darkLogo) {
      res.render('send_email', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, favicon: body.favicon });
    } else {
      res.render('send_email', { darkLogo: 'assets/img/curvetyp2x.png' });
    }
  });
});

app.post('/send_email', parseUrlencoded, (req, res) => {
  const data = {};
  data.email = req.body.email;
  request.post({
    url: `${config.apiUri}/forgot`,
    headers: {
      applicationToken: 'DrLmNC2q9t',
    },
    form: data,
  }, (err, httpResponse, body) => {
    if (err) {
      return res.status(200).json(JSON.parse(err));
    }
    res.status(200).json(JSON.parse(body));
  });
});

app.get('/reset', (req, res) => {
  getLogo(req, (logoError, body) => {
    const logo = (body && body.darkLogo) ? body.darkLogo : 'assets/img/curvetyp2x.png';
    const pageTitle = (body && body.pageTitle);
    const favicon = (body && body.favicon);
    request.post({
      url: `${config.apiUri}/reset/validate`,
      headers: {
        applicationToken: 'DrLmNC2q9t',
      },
      json: {
        token: req.query.token,
      },
    }, (err, httpResponse, body) => {
      const statusCode = httpResponse ? httpResponse.statusCode : '';
      if (statusCode === 200 && body && body.success === true) {
        const message = (body.invite) ? 'Welcome aboard!<br/><br/>Create your password below, and we\'ll get you started.' : 'Reset your password by entering a new one below.';
        res.render('reset', { message, darkLogo: 'assets/img/curvetyp2x.png' });
      } else if (statusCode === 401) {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: 'This password reset link has expired.<br/><br/>Please request a new password reset <a href="https://app.curveroyaltysystems.com/send_email">here</a>' });
      } else if (statusCode === 403 && body && body.message === 'User not found') {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: 'A user account for this reset link does not exist.<br/><br/>Please contact the label or publisher who invited you to the platform.' });
      } else if (statusCode === 403 && body && body.message === 'Password already reset') {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: 'Your password has already been reset.<br/><br/>If you want to reset your password again, please request a new password reset <a href="https://app.curveroyaltysystems.com/send_email">here</a>, or you can login with your new password <a href="https://app.curveroyaltysystems.com/login">here</a>' });
      } else {
        res.render('reset', { darkLogo: logo, pageTitle, favicon, error: 'There was an error resetting your password.<br/><br/>Please try again or a request a new password reset <a href="https://app.curveroyaltysystems.com/send_email">here</a>' });
      }
    });
  });
});

app.post('/reset', parseUrlencoded, (req, res) => {
  const { token } = req.body;
  const confirmPassword = req.body.confirm;
  const { password } = req.body;
  const data = { password, confirmPassword };
  if (password !== confirmPassword) {
    res.status(200).json({ success: false, message: 'Passwords do not match' });
  } else {
    request.post({
      url: `${config.apiUri}/reset${token}`,
      headers: {
        applicationToken: 'DrLmNC2q9t',
      },
      form: data,
    }, (err, httpResponse, body) => {
      if (err) {
        res.status(200).json(JSON.parse(err));
      } else if (!body.success) {
        res.status(200).json(JSON.parse(body));
      } else {
        request.post({
          url: `${config.apiUri}/authenticate`,
          headers: {
            applicationToken: 'DrLmNC2q9t',
          },
          form: { email: body.email, password: req.body.password },
        }, (err, httpResponse, body) => {
          if (err) {
            logger.error(err);
            res.status(200).json(JSON.parse(err));
          } else {
            res.status(200).json(JSON.parse(body));
          }
        });
      }
    });
  }
});

app.get('/signup', (req, res) => {
  getLogo(req, (err, body) => {
    if (err) {
      logger.error(err);
    } else {
      res.render('signup', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, siteKey: captchaSiteKey, favicon: body.favicon, type: body.type, clientType: body.clientType });
    }
  });
});

app.get('/confirm', (req, res) => {
  getLogo(req, (err, body) => {
    if (err) {
      logger.error(err);
    } else {
      request.get({
        url: `${config.apiUri}/register/confirm?token=${req.query.token}`,
        headers: {
          applicationToken: 'DrLmNC2q9t',
        },
      }, (err, httpResponse, response) => {
        if (err) {
          logger.error(err);
          res.status(200).json(JSON.parse(err));
        } else {
          response = JSON.parse(response);
          res.render('confirm', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, siteKey: captchaSiteKey, favicon: body.favicon, success: response.success, message: response.message });
        }
      });
    }
  });
});

app.post('/complete_signup', parseUrlencoded, (req, res) => {
  if (req.body.grecaptcha === undefined || req.body.grecaptcha === '' || req.body.grecaptcha === null) {
    return res.json({ success: false, message: 'Please confirm you are not a robot' });
  }
  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecretKey}&response=${req.body.grecaptcha}&remoteip=${req.connection.remoteAddress}`;

  request(verificationUrl, (error, response, body) => {
    body = JSON.parse(body);

    // Success will be true or false depending upon captcha validation.
    if (body.success !== undefined && !body.success) {
      return res.json({ success: false, message: 'Failed captcha verification. Please refresh and try again' });
    }
    request.post({
      url: `${config.apiUri}/register`,
      headers: {
        applicationToken: 'DrLmNC2q9t',
      },
      form: req.body,
    }, (err, httpResponse, body) => {
      if (err || (body && JSON.parse(body).error)) {
        res.status(200).json({ message: JSON.parse(body).error });
      } else {
        res.status(200).json({ success: true, message: 'Please confirm your account by clicking the link we\'ve sent you by email.' });
      }
    });
  });
});

app.get('/virgin', (req, res) => {
  const sso = AzureSSO.generateSAMLRequest();
  res.redirect(sso);
});

app.post('/azure/acs', parseUrlencoded, (req, res) => {
  if (req?.body?.SAMLResponse) {
    AzureSSO.authenticateResponse(req.body.SAMLResponse, (err, response) => {
      logger.info(response);
      if (err) {
        // eslint-disable-next-line no-restricted-syntax
        logger.error(err);
        res.render('sso_confirm', { success: false, pageTitle: 'Curve', siteKey: captchaSiteKey, message: 'User not recognised or an issue with logging you in' });
      } else {
        res.render('sso_confirm', { pageTitle: 'Curve', success: response.success, message: 'Successfully logged in, you will be redirected shortly', token: response.token });
      }
    });
  } else {
    // eslint-disable-next-line no-restricted-syntax
    logger.info('No SAML Response, rendering failure');
    res.render('sso_confirm', { success: false, pageTitle: 'Curve', siteKey: captchaSiteKey, message: 'Failed to receive the expected response from the SSO provider' });
  }
});

app.get('/azure/acs_test', (req, res) => {
  const input = 'PHNhbWxwOlJlc3BvbnNlIElEPSJfMmZhZmI1MjktY2RjNS00MTQ3LThhMjktM2IyNWRjM2M3ODk1IiBWZXJzaW9uPSIyLjAiIElzc3VlSW5zdGFudD0iMjAyMi0wNy0yN1QyMTo1NToyOC42NzVaIiBEZXN0aW5hdGlvbj0iaHR0cHM6Ly9kZXYuY3VydmVyb3lhbHR5c3lzdGVtcy5jb20vYXp1cmUvYWNzIiBJblJlc3BvbnNlVG89ImlkOTRhMWQ0OWMtYWFkOC00ZjgxLWE2ZGUtYWJiZDU1ZmE0YTRlIiB4bWxuczpzYW1scD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sIj48SXNzdWVyIHhtbG5zPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uIj5odHRwczovL3N0cy53aW5kb3dzLm5ldC9hNDJhYmExZi0wZjc0LTQyNWEtOGJjMS03N2Q2YTQwYjE2OWEvPC9Jc3N1ZXI+PHNhbWxwOlN0YXR1cz48c2FtbHA6U3RhdHVzQ29kZSBWYWx1ZT0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnN0YXR1czpTdWNjZXNzIi8+PC9zYW1scDpTdGF0dXM+PEFzc2VydGlvbiBJRD0iX2RjNDVkMTFmLWRhMzEtNDJhOS1hOTkxLWYyNjI3ZjIyNTMwMCIgSXNzdWVJbnN0YW50PSIyMDIyLTA3LTI3VDIxOjU1OjI4LjY2MFoiIFZlcnNpb249IjIuMCIgeG1sbnM9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iPjxJc3N1ZXI+aHR0cHM6Ly9zdHMud2luZG93cy5uZXQvYTQyYWJhMWYtMGY3NC00MjVhLThiYzEtNzdkNmE0MGIxNjlhLzwvSXNzdWVyPjxTaWduYXR1cmUgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyMiPjxTaWduZWRJbmZvPjxDYW5vbmljYWxpemF0aW9uTWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8xMC94bWwtZXhjLWMxNG4jIi8+PFNpZ25hdHVyZU1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZHNpZy1tb3JlI3JzYS1zaGEyNTYiLz48UmVmZXJlbmNlIFVSST0iI19kYzQ1ZDExZi1kYTMxLTQyYTktYTk5MS1mMjYyN2YyMjUzMDAiPjxUcmFuc2Zvcm1zPjxUcmFuc2Zvcm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjZW52ZWxvcGVkLXNpZ25hdHVyZSIvPjxUcmFuc2Zvcm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1leGMtYzE0biMiLz48L1RyYW5zZm9ybXM+PERpZ2VzdE1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI3NoYTI1NiIvPjxEaWdlc3RWYWx1ZT5RV05hWmdLV25veTkrRWRFZzVLZ0t2RmtHalVBa1g5V0l0dllBRHpxWEVBPTwvRGlnZXN0VmFsdWU+PC9SZWZlcmVuY2U+PC9TaWduZWRJbmZvPjxTaWduYXR1cmVWYWx1ZT5VaHlhdzRMOHBjZlpBZ3ZUd2E4bnZxNlB3dnlRbmtDbGhZSTRUcDZyUDRlRWk0YW4xcVNCU1UvN1l1RkV1ekI3TzVzSEJCaFZUNW14NG5qVDVYTm1SR1ZYSWtGamNiV0dLQnNpTnpkVlpNZGFua1plemtBcjFiZE9CRlN3dWlKZysyNGJYcWRkcWM1d1l5UFoyNmUyV3pKSmN1dHlvSDRjMExJbmgwdHpvQm01ajZVRjk0M3lRY0d2bVpHQ3UwNzlubzZKc1QxZnl4UWQvQlNKbEJ1SENmWTBCNGdWZnpHMjRDTXQvUFBVVFJHS2R4d3Evc21pbzNWSnRsUTZ0aXNGeWRPWUUyNDNsUDgvZ3J4T3BleGpyTlNRMzgxRlJLMFZEUFdjMzVaNmJDUjBTOEhhMDlPRmJ2N1dmbTB0bW1hbkMyTFFUQklvQWRGOFdQYTVvK2ZRSlE9PTwvU2lnbmF0dXJlVmFsdWU+PEtleUluZm8+PFg1MDlEYXRhPjxYNTA5Q2VydGlmaWNhdGU+TUlJREJUQ0NBZTJnQXdJQkFnSVFINEZsWU5BK1VKbEYwRzN2eTlacmhUQU5CZ2txaGtpRzl3MEJBUXNGQURBdE1Tc3dLUVlEVlFRREV5SmhZMk52ZFc1MGN5NWhZMk5sYzNOamIyNTBjbTlzTG5kcGJtUnZkM011Ym1WME1CNFhEVEl5TURVeU1qSXdNREkwT1ZvWERUSTNNRFV5TWpJd01ESTBPVm93TFRFck1Da0dBMVVFQXhNaVlXTmpiM1Z1ZEhNdVlXTmpaWE56WTI5dWRISnZiQzUzYVc1a2IzZHpMbTVsZERDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTUJERENiWS9jakVIZkVFdWxaNXVkL0N1UmpkVDYveU45ZnkxSmZmamdtTHZ2Znc2dzd6eG8xWWtDdlpEb2dvd1g4cXFBQy9xUVhuSi9mbDEya3ZndU1XVTU5V1VjUHZoaEMybTdxTkx2bE9xOTB5bytOc1JReEQvdjBlVWFUaHJJYUF2ZVpheW9sT2JYcm9aK0h3VE4xMzBkaGdkSFZUSEtjemQ0ZVB0RGpMd1N2LzJhL2JaRUFsUHlzMTAyelFvOGdPOG03VzYvTnpSZlpOeW82VThqc21Oa3ZxcnhXMlBnS0tqSVMvVWFmSzlod1kvNzY3SytrVitobm9rc2NZMnhNd3hRTmxTSEVpbTBoNzJ6UVJIbHRpb3kxNU0ra0J0aTR5cytWN0dDNmVwTC8vcFBaVDBBY3YxZXdvdUdaSVFEZnVvOVV0U25LdWZHaTI2ZE1BelNrQ0F3RUFBYU1oTUI4d0hRWURWUjBPQkJZRUZMRnIrc2pVUStJZHpHaDNlYURrenVlMnFrVFpNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUNpVk4yQTZFcnpCaW5HWWFmQzd2RnY1dTFRRDZuYnZZMzJBOEt5Y0p3S1d5MXNhODNDYkxGYkZpOTJTR2tLeVBacU16VnlRY0Y1YWFSWnBrUEdxamh6TStpRWZzUjJSSWYrL25vWkJsUi9lc0lOZkJoazRvQnJ1ajdTWStrUGpZelYwM05lWTBjZk80SkVmNmtYcENxUkNncDlWRFJNNDRHRDhtVVYvb29OK1haVkZJV3M1R2FpOEZHWlg5SDhaU2drSUtieE1iVk9oaXNNcU5oaHA1VTNmVDdWUHNsOTRyaWxKOGdLWFAvS0JicGxkcmZtT0FkVkRnVUMrTUh3M3NTWFN0K1Zub3JCNERVNG1VUUxjTXJpUW1iWGRRYzhkMUhVWllaRWtjS2FTZ2J5Z0hMdEJ5T0pGNDRYVXNCb3RzVGZaNGkvelZqblljamdVUW13bUFXRDwvWDUwOUNlcnRpZmljYXRlPjwvWDUwOURhdGE+PC9LZXlJbmZvPjwvU2lnbmF0dXJlPjxTdWJqZWN0PjxOYW1lSUQgRm9ybWF0PSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoxLjE6bmFtZWlkLWZvcm1hdDp1bnNwZWNpZmllZCI+LXRMR0NUeW5fTUxWemYyYUtDeXh2YXhZNjg2ODVyb3UwSmtKcERrUnpKdzwvTmFtZUlEPjxTdWJqZWN0Q29uZmlybWF0aW9uIE1ldGhvZD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmNtOmJlYXJlciI+PFN1YmplY3RDb25maXJtYXRpb25EYXRhIEluUmVzcG9uc2VUbz0iaWQ5NGExZDQ5Yy1hYWQ4LTRmODEtYTZkZS1hYmJkNTVmYTRhNGUiIE5vdE9uT3JBZnRlcj0iMjAyMi0wNy0yN1QyMjo1NToyOC40NzJaIiBSZWNpcGllbnQ9Imh0dHBzOi8vZGV2LmN1cnZlcm95YWx0eXN5c3RlbXMuY29tL2F6dXJlL2FjcyIvPjwvU3ViamVjdENvbmZpcm1hdGlvbj48L1N1YmplY3Q+PENvbmRpdGlvbnMgTm90QmVmb3JlPSIyMDIyLTA3LTI3VDIxOjUwOjI4LjQ3MloiIE5vdE9uT3JBZnRlcj0iMjAyMi0wNy0yN1QyMjo1NToyOC40NzJaIj48QXVkaWVuY2VSZXN0cmljdGlvbj48QXVkaWVuY2U+YXBpOi8vNjkwZjY4YzYtODU0Ny00OTRiLWJkOTMtZGQxOWZhMjBiYTVhPC9BdWRpZW5jZT48L0F1ZGllbmNlUmVzdHJpY3Rpb24+PC9Db25kaXRpb25zPjxBdHRyaWJ1dGVTdGF0ZW1lbnQ+PEF0dHJpYnV0ZSBOYW1lPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRpZCI+PEF0dHJpYnV0ZVZhbHVlPmE0MmFiYTFmLTBmNzQtNDI1YS04YmMxLTc3ZDZhNDBiMTY5YTwvQXR0cmlidXRlVmFsdWU+PC9BdHRyaWJ1dGU+PEF0dHJpYnV0ZSBOYW1lPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL2lkZW50aXR5L2NsYWltcy9vYmplY3RpZGVudGlmaWVyIj48QXR0cmlidXRlVmFsdWU+YTg0ODM1ZWEtNGI0MS00MDg3LThlNDEtMzA5NGZkODEyMjg3PC9BdHRyaWJ1dGVWYWx1ZT48L0F0dHJpYnV0ZT48QXR0cmlidXRlIE5hbWU9Imh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL3N1cm5hbWUiPjxBdHRyaWJ1dGVWYWx1ZT5BbGxlbjwvQXR0cmlidXRlVmFsdWU+PC9BdHRyaWJ1dGU+PEF0dHJpYnV0ZSBOYW1lPSJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9naXZlbm5hbWUiPjxBdHRyaWJ1dGVWYWx1ZT5Ub208L0F0dHJpYnV0ZVZhbHVlPjwvQXR0cmlidXRlPjxBdHRyaWJ1dGUgTmFtZT0iaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS9pZGVudGl0eS9jbGFpbXMvZGlzcGxheW5hbWUiPjxBdHRyaWJ1dGVWYWx1ZT5Ub20gQWxsZW48L0F0dHJpYnV0ZVZhbHVlPjwvQXR0cmlidXRlPjxBdHRyaWJ1dGUgTmFtZT0iaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvZW1haWxhZGRyZXNzIj48QXR0cmlidXRlVmFsdWU+dG9tQGN1cnZlcm95YWx0eXN5c3RlbXMuY29tPC9BdHRyaWJ1dGVWYWx1ZT48L0F0dHJpYnV0ZT48QXR0cmlidXRlIE5hbWU9Imh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vaWRlbnRpdHkvY2xhaW1zL2lkZW50aXR5cHJvdmlkZXIiPjxBdHRyaWJ1dGVWYWx1ZT5saXZlLmNvbTwvQXR0cmlidXRlVmFsdWU+PC9BdHRyaWJ1dGU+PEF0dHJpYnV0ZSBOYW1lPSJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL2NsYWltcy9hdXRobm1ldGhvZHNyZWZlcmVuY2VzIj48QXR0cmlidXRlVmFsdWU+aHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2F1dGhlbnRpY2F0aW9ubWV0aG9kL3Bhc3N3b3JkPC9BdHRyaWJ1dGVWYWx1ZT48QXR0cmlidXRlVmFsdWU+aHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2F1dGhlbnRpY2F0aW9ubWV0aG9kL3Vuc3BlY2lmaWVkPC9BdHRyaWJ1dGVWYWx1ZT48L0F0dHJpYnV0ZT48L0F0dHJpYnV0ZVN0YXRlbWVudD48QXV0aG5TdGF0ZW1lbnQgQXV0aG5JbnN0YW50PSIyMDIyLTA3LTI3VDEwOjQxOjU2LjQ5M1oiIFNlc3Npb25JbmRleD0iX2RjNDVkMTFmLWRhMzEtNDJhOS1hOTkxLWYyNjI3ZjIyNTMwMCI+PEF1dGhuQ29udGV4dD48QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFjOmNsYXNzZXM6UGFzc3dvcmQ8L0F1dGhuQ29udGV4dENsYXNzUmVmPjwvQXV0aG5Db250ZXh0PjwvQXV0aG5TdGF0ZW1lbnQ+PC9Bc3NlcnRpb24+PC9zYW1scDpSZXNwb25zZT4=';
  AzureSSO.authenticateResponse(input, (err, response) => {
    if (err) {
      logger.error(err);
    }
    res.render('sso_confirm', { darkLogo: null, pageTitle: null, siteKey: captchaSiteKey, favicon: null, success: response.success, message: 'Successfully logged in, you will be redirected shortly', token: response.token });
  });
});

app.listen(8082);
