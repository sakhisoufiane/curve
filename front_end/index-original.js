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
        'img-src': ['blob:', '\'self\'', 'www.gstatic.com', 'data:', 'https://curve-royalties-staging.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-production.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-production-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-production-new.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-staging-new.s3.eu-west-1.amazonaws.com', 'https://*.gravatar.com', 'https://beacon-v2.helpscout.net', 'https://d33v4339jhl8k0.cloudfront.net', 'https://chatapi-prod.s3.amazonaws.com/', 'https://charts.mongodb.com/'],
        connectSrc: ['\'self\'', config.apiUri, 'https://api.curveroyaltysystems.com', 'https://beta-api.curveroyaltysystems.com', 'https://beta1-api.curveroyaltysystems.com', 'https://staging-api.curveroyaltysystems.com', 'https://curve-royalties-production-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging-new.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-production.s3-eu-west-1.amazonaws.com', 'https://curve-royalties-staging.s3.eu-west-1.amazonaws.com', 'https://curve-royalties-production.s3.eu-west-1.amazonaws.com', 'https://beaconapi.helpscout.net', 'https://chatapi.helpscout.net', 'https://d3hb14vkzrxvla.cloudfront.net', 'wss://*.pusher.com', '*.sumologic.com', 'https://stonly.com', 'https://*.stonly.com'],
        frameSrc: ['\'self\'', 'https://www.google.com', 'https://www.google.com/recaptcha/', 'https://beacon-v2.helpscout.net', 'https://www.youtube.com', 'https://player.vimeo.com', 'https://fast.wistia.net', 'https://ui2.tipalti.com', 'https://ui2.sandbox.tipalti.com', 'https://js.stripe.com', 'https://stonly.com', 'https://*.stonly.com', 'https://charts.mongodb.com/'],
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
  let origin;
  if (split.length >= 3) {
    origin = [split[0], split[1], split[2]].join('/');
  } else {
    origin = split.join('/');
  }
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
      res.render('login', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, siteKey: thisCaptchaSiteKey, favicon: body.favicon, googleUrl: googleOAuthUrl, aadUrl: aadOAuthUrl, skipQa: encryptedKey, withError });
    } else {
      res.render('login', { darkLogo: 'assets/img/curvetyp2x.png', siteKey: thisCaptchaSiteKey, googleUrl: googleOAuthUrl, aadUrl: aadOAuthUrl, skipQa: encryptedKey, withError });
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
      res.render('mfa', { darkLogo: body.darkLogo, pageTitle: body.pageTitle, favicon: body.favicon, googleUrl: googleOAuthUrl, aadUrl: aadOAuthUrl, withError, token, email, multiFactorAuthenticationType });
    } else {
      res.render('mfa', { darkLogo: 'assets/img/curvetyp2x.png', googleUrl: googleOAuthUrl, aadUrl: aadOAuthUrl, withError, token, email, multiFactorAuthenticationType });
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

app.get('/signin/aad', (req, res) => {
  // const { code } = req.query;
  // if (code) {
  //   const authorityUrl = `${aadConfig.authorityHostUrl}/${aadConfig.tenant}`;
  //   const authenticationContext = new AuthenticationContext(authorityUrl);
  //   authenticationContext.acquireTokenWithAuthorizationCode(req.query.code, aadConfig.redirectUri, aadConfig.resource, aadConfig.clientId, aadConfig.clientSecret, (err, response) => {
  //     let message = '';
  //     if (err) {
  //       message = `error: ${err.message}\n`;
  //       res.send(message);
  //       return;
  //     }

  //     if (response.userId) {
  //       verifyOAuthLogin(req, res, response.userId);
  //     }
  //   });
  // }
});

app.get('/signin/google', (req, res) => {
  const { code } = req.query;

  if (code) {
    // Get an access token based on our OAuth code
    googleOAuthClient.getToken(code, (err, tokens) => {
      if (err) {
        logger.info('Error authenticating');
        logger.error(err);
      } else {
        logger.debug('Successfully authenticated');
        googleOAuthClient.setCredentials(tokens);
        res.redirect('/signin/google/authenticate');
      }
    });
  }
});

app.get('/signin/google/authenticate', (req, res) => {
  const gmail = google.gmail({ version: 'v1', auth: googleOAuthClient });

  gmail.users.getProfile({
    userId: 'me',
  }, (err, gres) => {
    if (err) {
      return logger.error(`The API returned an error: ${err}`);
    }
    verifyOAuthLogin(req, res, gres.data.emailAddress);
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

// OAuth Google Configurations
const googleConfig = {
  clientId: '701398756543-7tp2f2moag6uab9ib0up9qogijfi1nr8.apps.googleusercontent.com', // e.g. asdfghjkljhgfdsghjk.apps.googleusercontent.com
  clientSecret: '_I42N9U_s_Dpx_tQHTqgD6wG', // e.g. _ASDFA%DFASDFASDFASD#FAD-
  redirect: 'http://localhost:8082/signin/google', // this must match your google api settings
  defaultScope: [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
};

// OAuth Google Configurations
const aadConfig = {
  tenant: '5018d353-cda2-4cbe-90bd-b25299c37b42',
  authorityHostUrl: 'https://login.windows.net',
  clientId: '0df90c1b-6b47-4b82-a08c-3a555e7812f6',
  clientSecret: '0qO-/gu@QT2SSR1j/tRRvKwmSpufZEs9',
  username: 'marfanrashid@hotmail.co.uk',
  password: '',
  redirectUri: 'http://localhost:8082/signin/aad',
  resource: '00000002-0000-0000-c000-000000000000',
};

function verifyOAuthLogin(req, res, email) {
  request.post({
    url: `${config.apiUri}/authenticate/oauth`,
    headers: {
      applicationToken: 'DrLmNC2q9t',
    },
    form: { email },
  }, (err, httpResponse, body) => {
    if (err) {
      logger.error(err);
      return res.status(200).json(JSON.parse(err));
    }
    const data = JSON.parse(body);
    logger.info(data);
    if (data.success === true) {
      logger.info(`Auth Token: ${data.token}`);
      res.cookie('curveToken', data.token);
      res.redirect('/');
    } else if (data.success === false) {
      req.session.oAuthError = 'Account can not be verified.';
      res.redirect('/login');
      // return res.json({"success" : false, "message" : "Account cant not be verified."});
      // res.send(data.message);
    }
  });
}

// Helper Funtions
function createGoogleConnection() {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirect,
  );
}

function createGoogleAuthUrl(auth) {
  return auth.generateAuthUrl({
    client_id: googleConfig.clientId,
    access_type: 'offline',
    prompt: 'consent',
    scope: googleConfig.defaultScope,
  });
}

function createaadOAuthUrl(state) {
  const templateAuthUrl = `https://login.windows.net/${aadConfig.tenant}/oauth2/authorize?response_type=code&client_id=<client_id>&redirect_uri=<redirect_uri>&state=<state>&resource=<resource>`;

  let authorizationUrl = templateAuthUrl.replace('<client_id>', aadConfig.clientId);
  authorizationUrl = authorizationUrl.replace('<redirect_uri>', aadConfig.redirectUri);
  authorizationUrl = authorizationUrl.replace('<state>', state);
  authorizationUrl = authorizationUrl.replace('<resource>', aadConfig.resource);

  return authorizationUrl;
}

const googleOAuthClient = createGoogleConnection();

const googleOAuthUrl = createGoogleAuthUrl(googleOAuthClient);

const aadOAuthUrl = createaadOAuthUrl('aad-token');

app.listen(8082);
