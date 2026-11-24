const { fileManager, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const sanitize = require('sanitize-filename');

const Client = require('../../../models/client');
const Parent = require('../../../models/parent');
const Company = require('../../../models/company');

module.exports = (contract, callback) => {
  const output = {};
  Client.findById(contract.clientId)
    .then((client) => {
      if (!client) {
        callback(new Error(`Client not found for contract ${contract._id}`));
      } else {
        Parent.findById(client.parentId)
          .then(async (parent) => {
            // Attempt to find company whether ID exists or not
            let company;
            if (ObjectId.isValid(contract.companyId)) {
              company = await Company.findById(contract.companyId).catch(logger.error);
            }
            if (company) {
              output.companyName = company.companyName ? company.companyName : company.name;
              output.logo = company.logo;
              output.address = company.address;
              output.offsetColour = company.offsetColour;
              output.contactEmail = company.email;
              output.statementCustomText = company.statementCustomText;
              output.statementOfAccountCustomText = company.statementOfAccountCustomText;
              output.selfBillingTaxText = company.selfBillingTaxText;
              output.selfBillingTaxCustomText = company.selfBillingTaxCustomText;
              output.vatNo = company.vatNo;
              output.statementHeaderType = company.statementHeaderType;
              output.salesReportTemplate = company.salesReportTemplate;
              output.costsReportTemplate = company.costsReportTemplate;
              output.statementIncludeTotalsRow = company.statementIncludeTotalsRow;
              output.suppressZeroValueInExport = company.suppressZeroValueInExport;
              output.suppressStatementOfAccount = company.suppressStatementOfAccount;
              output.feesInvoiceCustomText = company.feesInvoiceCustomText;
            }
            // Set defaults where they aren't set by company
            output.statementDesign = contract.statementDesign;
            output.statementDesign = output.statementDesign || 'Standard';
            // Set Mechanical output to same as publisher
            if (contract.contractType === 'Mechanical' || client.clientType === 'Publisher') { output.statementType = 'Publisher'; }
            // Set company name when no company.companyName or company.name.
            if (!output.companyName) {
              if (client.companyName) {
                output.companyName = client.companyName;
              } else {
                output.companyName = client.name;
              }
            }
            output.statementHeaderType = output.statementHeaderType || client.statementHeaderType;
            output.logo = output.logo || client.logo;
            output.address = output.address || client.address;
            output.vatNo = output.vatNo || client.vatNo;
            output.offsetColour = output.offsetColour || client.offsetColour;
            output.contactEmail = output.contactEmail || client.email;
            output.statementCustomText = output.statementCustomText || client.statementCustomText;
            output.statementOfAccountCustomText = output.statementOfAccountCustomText || client.statementOfAccountCustomText;
            output.selfBillingTaxText = output.selfBillingTaxText || client.selfBillingTaxText;
            output.selfBillingTaxCustomText = output.selfBillingTaxCustomText || client.selfBillingTaxCustomText;
            output.feesInvoiceCustomText = output.feesInvoiceCustomText || client.feesInvoiceCustomText;
            output.vatNo = output.vatNo || client.vatNo;
            output.salesReportTemplate = output.salesReportTemplate || client.salesReportTemplate;
            output.costsReportTemplate = output.costsReportTemplate || client.costsReportTemplate;
            output.statementIncludeTotalsRow = output.statementIncludeTotalsRow || client.statementIncludeTotalsRow;
            output.suppressZeroValueInExport = output.suppressZeroValueInExport || client.suppressZeroValueInExport;
            output.suppressStatementOfAccount = output.suppressStatementOfAccount || client.suppressStatementOfAccount;
            output.suppressZeroTaxLine = output.suppressZeroTaxLine || client.suppressZeroTaxLine;
            output.customFeesInvoiceTitle = output.customFeesInvoiceTitle || client.customFeesInvoiceTitle;
            if (parent && parent.removeStatementLogo) { output.removeFooterImage = true; }
            // Download Logo to drive - do it once here, and not have to constantly download for each statement from S3
            // Check if logo file exists
            if (output.logo) {
              // Preserve s3path
              output.s3LogoPath = output.logo;
              const splitLogo = output.logo.split('/');
              const localLogoLocation = `${appRootDir}/tmp/${sanitize(splitLogo[splitLogo.length - 1])}`;
              fs.exists(localLogoLocation, (localExists) => {
                if (localExists) {
                  // Set logo to local
                  logger.info(`Logo exists (contractId)${contract._id.toString()} ${localLogoLocation}`);
                  output.logo = localLogoLocation;
                  callback(null, output);
                } else {
                  // Download from S3
                  fileManager.downloadFromS3(output.logo, process.env.S3_bucket, (err, localLogo) => {
                    if (err) {
                      logger.error(err);
                      logger.error(`Logo could not download from S3 (contractId)${contract._id.toString()} ${localLogoLocation}`);
                    }
                    // Don't handle errors, will attempt second download later on
                    if (localLogo) {
                      // Replace logo on output data with local version
                      output.logo = localLogo;
                    }
                    callback(null, output);
                  });
                }
              });
            } else {
              callback(null, output);
            }
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};
