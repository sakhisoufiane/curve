const { fileManager, utils, logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();

const Company = require('../../models/company');

const LogoFiles = {
  clearLogoFiles: (client, callback) => {
    // Clear down any logo files stored in tmp
    async.parallel([
      function (cb) {
        // Clear client logo
        if (client.logo) {
          const splitLogo = client.logo.split('/');
          const localLogoLocation = `${appRootDir}/tmp/${utils.safeName(splitLogo[splitLogo.length - 1])}`;
          if (fs.existsSync(localLogoLocation)) {
            fs.unlink(localLogoLocation, (err) => {
              cb();
            });
          } else {
            cb();
          }
        } else {
          cb();
        }
      },
      function (cb) {
        // Clear any company logos
        Company.find({ clientId: client._id.toString() })
          .then((companies) => {
            async.each(companies, (company, companyCb) => {
              if (company.logo) {
                const splitLogo = company.logo.split('/');
                const companyLocalLogoLocation = `${appRootDir}/tmp/${utils.safeName(splitLogo[splitLogo.length - 1])}`;
                if (fs.existsSync(companyLocalLogoLocation)) {
                  fs.unlink(companyLocalLogoLocation, (err) => {
                    companyCb();
                  });
                } else {
                  companyCb();
                }
              } else {
                companyCb();
              }
            }, cb);
          })
          .catch((err) => {
            logger.error(err);
            // Previous funcitonality did not handle errors, so we will just log it
            cb();
          });
      },
    ], callback);
  },
  downloadLogos: (client, callback) => {
    async.parallel([
      function (cb) {
        // Download main client logo
        if (client.logo) {
          fileManager.downloadFromS3(client.logo, process.env.S3_bucket, () => {
            cb();
          });
        } else {
          cb();
        }
      },
      function (cb) {
        // Download any company logos
        Company.find({ clientId: client._id.toString() })
          .then((companies) => {
            async.each(companies, (company, companyCb) => {
              if (company.logo) {
                fileManager.downloadFromS3(company.logo, process.env.S3_bucket, () => {
                  companyCb();
                });
              } else {
                companyCb();
              }
            }, cb);
          })
          .catch((err) => {
            logger.error(err);
            // Previous functionality did not handle errors, so we will just log it
            cb();
          });
      },
    ], callback);
  },
};

module.exports = LogoFiles;
