/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-lonely-if */
/* eslint-disable quote-props */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-buffer-constructor */
require('dotenv').config();
const moment = require('moment');
const pako = require('pako');
const uuid = require('uuid');
const { parseString } = require('xml2js');
const axios = require('axios');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const { applicationToken } = process.env;

const config = require('../config');

const ssoConfig = {
  // unique entityId while setting up SAML server
  entityURI: process.env.ssoEntityUri,
  // SAML server login url, can be found in SAML XML file
  entryPoint: process.env.ssoEntryPoint,
  // X 509 signing certificate, can be found in SAML XML file
  certificate: 'MIIC8DCCAdigAwIBAgIQaKWqA3vVf7ZPHf5h52SkkjANBgkqhkiG9w0BAQsFADA0MTIwMAYDVQQDEylNaWNyb3NvZnQgQXMIIC8DCCAdigAwIBAgIQaKWqA3vVf7ZPHf5h52SkkjANBgkqhkiG9w0BAQsFADA0MTIwMAYDVQQDEylNaWNyb3NvZnQgQX8MIIC8DCCAdigAwIBAgIQaKWqA3vVf7ZPHf5h52SkkjANBgkqhkiG9w0BAQsFADA0MTIwMAYDVQQDEylNaWNyb3NvZnQgQX',
  // callback url after successfully authentication
  entityReplyUrl: process.env.ssoEntityReplyUrl,
};

// const config = {
//   entityURI: 'https://sts.windows.net/f0ba66ac-be62-44ae-9e4f-75536ffaa911/',
//   entryPoint: 'https://login.microsoftonline.com/f0ba66ac-be62-44ae-9e4f-75536ffaa911/saml2',
//   entityReplyUrl: 'https://dev.curveroyaltysystems.com/azure/acs',
// };

const AzureSSO = {
  generateSAMLRequest() {
    const SAMLReq = `<samlp:AuthnRequest
    xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    ID="id${uuid.v4()}"
    Version="2.0"
    IssueInstant="${moment().utc().format()}"
    IsPassive="false"
    AssertionConsumerServiceURL="${ssoConfig.entityReplyUrl}" xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    ForceAuthn="false">
      <Issuer xmlns="urn:oasis:names:tc:SAML:2.0:assertion">${ssoConfig.entityURI}</Issuer>
      <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">
      </samlp:NameIDPolicy>
    </samlp:AuthnRequest>`;
    const deflatedSAMLReq = pako.deflateRaw(SAMLReq);
    const deflatedBase64SAMLReq = Buffer(deflatedSAMLReq).toString('base64');
    const encodedDeflatedBase64SAMLReq = encodeURIComponent(deflatedBase64SAMLReq);
    // eslint-disable-next-line no-bitwise
    return ~ssoConfig.entryPoint.indexOf('?')
      ? `${ssoConfig.entryPoint}&SAMLRequest=${encodedDeflatedBase64SAMLReq}`
      : `${ssoConfig.entryPoint}?SAMLRequest=${encodedDeflatedBase64SAMLReq}`;
  },
  decryptResponse(input, callback) {
    // Decode to buffer from base64
    const buff = new Buffer(input, 'base64');
    // Get String
    const xml = buff.toString();
    // Turn into JSON
    if (xml) {
      parseString(xml, callback);
    } else {
      callback(new Error('Failed to retrieve XML from data'));
    }
  },
  authenticateResponse(input, callback) {
    // Decrypt the response
    AzureSSO.decryptResponse(input, (err, response) => {
      // Handle errors
      if (err) {
        callback(err);
      } else {
        logger.info(response);
        // Get Attributes from JSON
        const email = AzureSSO.getEmailFromAttributes(response);
        logger.info(`SSO: Email: ${response}`);
        if (email) {
          // Authenticate with API
          AzureSSO.authenticateUser(email, callback);
        } else {
          logger.error(`Azure SAML Error: Email not found in SAML response: ${response}`);
          callback(new Error('Email not found in SAML response'));
        }
      }
    });
  },
  getEmailFromAttributes(response) {
    let output;
    if (response && response['samlp:Response']?.Assertion[0]?.AttributeStatement[0]?.Attribute) {
      // Get attributes from JSON
      const attributes = response['samlp:Response'].Assertion[0].AttributeStatement[0].Attribute;
      // Loop through to find email
      attributes.forEach((attribute) => {
        if (attribute?.$?.Name === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') {
          output = attribute.AttributeValue[0];
        }
      });
    }
    return output;
  },
  authenticateUser: async (email, callback) => {
    // const postData = {
    //   email,
    //   ssoKey: process.env.ssoKey,
    // };

    // try {
    //   const uri = `${apiUri}/authenticate/sso`;
    //   const serverResponse = await axios.post(uri, postData, { headers: { applicationToken } });
    //   const serverData = serverResponse?.data;

    //   if (serverData) {
    //     if (serverData.error) {
    //       return res.status(200).json({ message: serverData.error });
    //     }
    //     res.status(200).json({ success: true, message: 'Please confirm your account by clicking the link we\'ve sent you by email.' });
    //   } else {
    //     logger.error('Azure SAML Error: Server response malformed');
    //     res.status(200).json({ message: 'An error occurred while completing your signup. Please try again or contact support.' });
    //   }
    // } catch (err) {
    //   const message = err.response?.data?.error;
    //   logger.error(`Complete Signup Error: ${message}`);
    //   res.status(200).json({ message });
    // }

    const uri = `${process.env.apiUrl}/authenticate/sso`;
    const postData = {
      email,
      ssoKey: process.env.ssoKey,
    };
    const config = {
      headers: {
        applicationToken: 'DrLmNC2q9t',
      },
    };

    const response = await axios.post(uri, postData, config);
    if (response.status === 500) {
      // logger.error(`Azure SAML Error: Sign In 500 Error - ${response.data && response.data.message}`);
      throw new Error('An error occurred while logging you in. Please try again or contact support.');
    } else {
      // logger.info(`SSO: Response Body: ${response.data}`);
      if (!response.data.success) {
        // logger.error(`Azure SAML Error: Sign In Error - Cannot find user with email ${email}`);
        throw new Error('Cannot find user with your email. Please check details and try again.');
      } else {
        return response.data;
      }
    }
  },
};

module.exports = AzureSSO;
