const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const axios = require('axios').default;
const config = require('../config');

let apiUri = process.env.apiUrl;
const environment = process.env.NODE_ENV?.toLowerCase();
const environmentName = process.env.environmentName?.toLowerCase();
const dockerRuntime = process.env.DOCKER === 'true';

if (environment === 'development' && dockerRuntime) {
  apiUri = process.env.apiUrlDocker;
}

const { applicationToken } = process.env;
logger.info(`environment: ${environment} | apiUri: ${apiUri}`);
// Set testMode to true to test getBrand against mrc.curveroyaltysystems.com
const testMode = false;

const utils = {
  apiUri() {
    return apiUri;
  },
  useSandbox() {
    return environmentName !== 'production';
  },
  buildCSPDirectives(helmetDefaults) {
    return {
      directives: {
        ...helmetDefaults,
        connectSrc: [apiUri, ...config.connectSrc], // mmove s3 paths to env vars to target specific environment
        frameSrc: utils.buildFrameSourceDirective(),
        childSrc: config.childSrc,
        mediaSrc: config.mediaSrc,
        'script-src': config.scriptSrc,
        'img-src': config.imgSrc, // // mmove s3 paths to env vars to target specific environment
      },
    };
  },
  buildCSPDirectivesTestingBypass(helmetDefaults) {
    return false;
  },
  buildFrameSourceDirective(req, callback) {
    const { frameSrc } = config;

    const tipaltiUri = (utils.useSandbox()) ? 'https://ui2.sandbox.tipalti.com' : 'https://ui2.tipalti.com';
    frameSrc.push(tipaltiUri);
    return config.frameSrc;
  },
  getBrand: async (req, callback) => {
    const originOptions = utils.getOriginOptions(req);

    try {
      const uri = `${apiUri}/authenticate/whitelabel`;
      const res = await axios.post(uri, { originOptions }, { headers: { applicationToken } });

      if (res?.data) {
        const response = res.data;
        response.clientType = req.query && ['Label', 'Publisher', 'Distributor'].includes(req.query.type) ? req.query.type : '';
        response.clientTypeExists = !!response.clientType;
        response.type = req.query && req.query.level === 'Professional' ? 'Professional' : 'Lite';
        logger.debug(response);
        callback(null, response);
      } else {
        const getBrandError = new Error('Server response malformed');
        logger.error('getBrand Error:', originOptions, getBrandError);
        callback(getBrandError);
      }
    } catch (err) {
      logger.error('getBrand Error:', originOptions, err);
      callback(err);
    }
  },
  getOriginOptions(req) {
    if (testMode) {
      req.headers.referer = 'https://mrc.curveroyaltysystems.com/test';
    } else if (req.headers && !req.headers.referer) {
      req.headers.referer = req.headers.host;
    }

    const split = req.headers.referer.split('/');
    let origin1;
    if (split.length >= 3) {
      origin1 = [split[0], split[1], split[2]].join('/');
    } else {
      origin1 = split.join('/');
    }

    const origin2 = `https://${req.headers.host}`;

    return [origin1, origin2].join();
  },
  buildPermissionsPolicyHeader: (req, res, next) => {
    res.setHeader('Permissions-Policy', 'accelerometer=(), autoplay=(), camera=(), cross-origin-isolated=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), xr-spatial-tracking=()');
    next();
  },
};

module.exports = utils;
