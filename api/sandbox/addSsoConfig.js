require('dotenv').config();
require('../models/db');
const SsoConfig = require('../models/ssoConfig');

/*
Script for inserting sso configuration into database
*/

const main = async () => {
    const samlConfigQA = {
        clientIds: ['64e715113c51bd6bf4641ce1'],
        identityProvider: 'OneLogin',
        acceptedClockSkewMs: -1,
        signatureAlgorithm: 'sha1',
        wantAssertionsSigned: true,
        wantAuthnResponseSigned: false,
        audience: 'curve-users',
        callbackUrl: 'http://localhost:8082/',
        issuer: 'https://app.xxx.com/saml/metadata/29c5f584-4241-4e6f-bc3d-bf380564ddd9',
        cert: `MIIEwDCCA6igAwIBAgIUIrRLemhoklHS04NVeMsykv5e1sQwDQYJKoZIhvcNAQEF
          BQAwgY4xCzAJBgNVBAYTAkdCMREwDwYDVQQIDAhFbmdsYW5kIDEQMA4GA1UEBwwH
          fVLU6soVjfjvyDmdKGVZaXxe60cs35Qy1G3gxsSFGJQiz4nE44yJXWMbztODXqmN
          oJjKBHr0/2Dlatj3JUw7q9cHdVM=`,
    };

  const ssoConfig = new SsoConfig(samlConfigQA);
  await ssoConfig.save();

  console.log('done');
}


main();
