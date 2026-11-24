const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SamlStrategy = require('@node-saml/passport-saml').Strategy;
const SsoConfig = require('../models/ssoConfig');

const Client = require('../models/client');
const Payee = require('../models/payee');

const AuthenticateController = this;

const passwordRotationDays = 90;

AuthenticateController.getSamlIssuer = ({ SAMLResponse, logKey }) => {
  logger.info(`${logKey} getting SAML issuer`);
  const decodedString = Buffer.from(SAMLResponse, 'base64').toString('utf-8');

  // @TODO: refactor the three cases below (out of scope for this work - we will have to test with all 3 providers) to either use a regex /<(?:[^:>]+:)?Issuer[^>]*>([^<]+)<\/(?:[^:>]+:)?Issuer>/
  // or, better still, parse using xml parser, using xpath exposed @node-saml/node-saml (already a transitive dep through passport):
  // const doc = await parseDomFromString(decodedString);
  // const [issuerNode] = xpath.selectElements(doc, "/*[local-name()='Response']/*[local-name()='Issuer']");

  // For providers using SAML 1 and using <saml:Issuer> without any params inside of the issuer tag
  if (decodedString.includes('<saml:Issuer>')) {
    const startPosition = decodedString.indexOf('<saml:Issuer>') + '<saml:Issuer>'.length;
    const endPosition = decodedString.indexOf('</saml:Issuer>');
    const issuer = decodedString.substring(startPosition, endPosition);

    return issuer;
  }

  // For providers using SAML 2 with params inside of the issuer tag
  if (decodedString.includes('<saml2:Issuer')) {
    const issuerLine = decodedString.substring(decodedString.indexOf('<saml2:Issuer'), decodedString.indexOf('</saml2:Issuer>'));
    const issuer = issuerLine.substring(issuerLine.indexOf('>') + 1);
    return issuer;
  }

  // For providers using SAML with default namespace
  if (decodedString.includes('<Issuer')) {
    const issuerLine = decodedString.substring(decodedString.indexOf('<Issuer'), decodedString.indexOf('</Issuer>'));
    const issuer = issuerLine.substring(issuerLine.indexOf('>') + 1);
    return issuer;
  }

  logger.error(`${logKey} no SAML issuer found`);
};

AuthenticateController.verifySamlResponse = async ({ SAMLResponse, issuer, logKey }) => {
  const passport = require('passport');

  const ssoConfig = await SsoConfig.findOne({ issuer });

  if (!ssoConfig) {
    logger.error(`${logKey} could not find SSO Config`);
    return;
  }
  logger.info(`${logKey} found SSO config ${ssoConfig._id}`);

  const samlConfig = {
    clientIds: ssoConfig.clientIds,
    acceptedClockSkewMs: ssoConfig.acceptedClockSkewMs,
    signatureAlgorithm: ssoConfig.signatureAlgorithm,
    wantAssertionsSigned: ssoConfig.wantAssertionsSigned,
    wantAuthnResponseSigned: ssoConfig.wantAuthnResponseSigned,
    audience: ssoConfig.audience,
    issuer: ssoConfig.issuer,
    idpCert: ssoConfig.cert,
    callbackUrl: ssoConfig.callbackUrl,
  };
  passport.use(new SamlStrategy(samlConfig, ((profile, done) => done(null, profile))));

  return new Promise((resolve) => {
    passport.authenticate('saml', { session: false }, (err, user, info) => {
      if (err) {
        logger.error(`${logKey} SAML authentication failed`, err);
        resolve(null);
        return;
      }
      resolve({
        email: user.nameID,
        clientIds: samlConfig.clientIds,
        callbackUrl: ssoConfig.callbackUrl,
      });
    })({ body: { SAMLResponse } });
  });
};

AuthenticateController.checkPasswordExpired = ({ userPasswordRotationDate }) => {
  const passwordRotationDate = new Date();
  passwordRotationDate.setDate(passwordRotationDate.getDate() - passwordRotationDays);
  return !!userPasswordRotationDate && userPasswordRotationDate < passwordRotationDate;
};

AuthenticateController.isMfaRequired = async (user) => {
  // MFA already enabled
  if (user.multiFactorAuthentication) return false;

  // Internal users always require MFA
  if (user.internal || user.superInternal) return true;

  const clientIds = new Set();

  // Collect admin clientIds
  if (Array.isArray(user.adminClientIds)) {
    user.adminClientIds.forEach((id) => clientIds.add(id.toString()));
  }

  // Collect clientIds from payees
  if (Array.isArray(user.payeeIds) && user.payeeIds.length > 0) {
    const payees = await Payee.find({ _id: { $in: user.payeeIds } }, 'clientId');
    for (const payee of payees) {
      if (payee.clientId) clientIds.add(payee.clientId.toString());
    }
  }

  // If there are any associated clientIds, check if any have payments enabled
  if (clientIds.size > 0) {
    const paymentEnabledClients = await Client.countDocuments({ _id: { $in: Array.from(clientIds) }, 'features.payments': true });
    return paymentEnabledClients > 0;
  }

  return false;
};

module.exports = AuthenticateController;
