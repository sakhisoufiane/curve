const moment = require('moment');
const { XMLHttpRequest } = require('xmlhttprequest');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Salesforce = {
  submit(email, companyName, marketingPermissions, clientType, callback) {
    logger.info(`Salesforce Submission: ${email}, ${companyName}, ${marketingPermissions}, ${clientType}`);
    marketingPermissions = !!(marketingPermissions === '1' || marketingPermissions === 1 || marketingPermissions === 'true');
    Salesforce.submitToSalesforce(clientType, email, companyName, marketingPermissions, callback);
  },
  submitToSalesforce(type, email, companyName, marketingPermissions, callback) {
    let baseUrl = 'https://info.curveroyaltysystems.com/l/1049452/2024-01-28/27fk';
    if (type === 'Publisher') {
      baseUrl = 'https://info.curveroyaltysystems.com/l/1049452/2024-01-21/21sg';
    }
    // Create the new request
    const xhr = new XMLHttpRequest();
    let url = `${baseUrl}?email=${email}&company=${companyName}&marketingPermissions=${marketingPermissions}`;
    url = encodeURI(url);
    logger.info(`Salesforce URL: ${url}`);
    xhr.open('POST', url);

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        logger.info(`Salesforce Response: ${xhr.responseText}`);
        callback(null, xhr.responseText);
      }
    };

    // Sends the request
    xhr.send();
  },
};

module.exports = Salesforce;
