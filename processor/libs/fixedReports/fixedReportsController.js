const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const Report = require('../../models/report');
const Client = require('../../models/client');
const FixedReport = require('../../models/fixedReport'); // This is used by populate('fixedReportId', 'key') below, even though it appears unused
const Notification = require('../../models/notification');

// Scripts Imports
const auditReport = require('./auditReport');
const unmappedSalesReport = require('./unmappedSales/index');
const unmappedSalesReportV2 = require('./unmappedSalesV2/index');

const ScriptList = {
  unmappedSalesReportV2,
  unmappedSalesReport,
  auditReport,
};

const FixedReportController = this;

/**
 * Creates an in-app notification and send email to client
 *
 * @param {Object} params - { key, params, email, clientId }
 * @param {String} params.publicKey - S3 public key to send to client
 * @param {import('../../models/client')} params.client - Client Document
 * @param {String} params.reportName - Name of the report
 * @param {String} params.email - Email to send to client
 * @param {Error} params.error - Error object
 *
 * @returns {Promise<void>}
 * @throws {Error} - If notification could not be generated
 * @example
 * const publicKey = 'https://s3.amazonaws.com/...';
 * const client = await Client.findById(clientId);
 * const email = 'test@email.com' // Curve User
 * await FixedReportController.notifyClient({ publicKey, client, reportName: 'Unmapped Sales', email });
 * await FixedReportController.notifyClient({ client, reportName: 'Unmapped Sales', email, error: new Error('Error Message') });
 */
FixedReportController.notifyClient = ({ publicKey, client, reportName, email, error }) => {
  // Params
  const subject = error ? `Your report for ${reportName} has errored` : `Your Report for ${reportName} is Ready for Download`;
  const generateOptions = {
    identifier: 'reportDownload',
    client,
    subject,
    email,
    link: publicKey,
  };

  // Generate notification
  const promise = new Promise((resolve, reject) => {
    Notification.generate('Report Ready', subject, publicKey, generateOptions, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  return promise;
};

/**
 * Uploads local file to S3
 * @param {Object} params - { file, client }
 * @param {String} params.file - Local File name to upload
 * @param {import('../../models/client')} params.client - Client Document
 *
 * @returns {Promise<String>} publicKey - S3 public key to send to client
 * @throws {Error} - If file does not exist in local storage
 *
 * @example
 * const file = 'local/tmp/Unmapped Sales 1234567890.csv';
 * const client = await Client.findById(clientId);
 * const publicKey = await FixedReportController.uploadToS3({ file, client });
 * console.log(publicKey); 'https://s3.amazonaws.com/...'
 */
FixedReportController.uploadToS3 = async ({ file, client }) => {
  const outputLocation = `${appRootDir}/tmp/${file}`;
  if (!fs.existsSync(outputLocation)) throw new Error('Could not find file in local storage');

  const s3Key = `fixedReports/${client._id.toString()}/${file}`;

  const promise = new Promise((resolve, reject) => {
    fileManager.uploadToS3(s3Key, outputLocation, (err, key) => {
      if (err) {
        reject(err);
      } else {
        fileManager.publicLink24Hours(s3Key, (err, publicKey) => {
          if (err) {
            reject(err);
          } else {
            resolve(publicKey);
          }
        });
      }
    });
  });

  return promise;
};

/**
 * Main function which executes the incoming script request and sends back to client.
 *
 * @param {Object} params - { key, params, email, clientId }
 * @returns {Promise<void>}
 * @throws {Error} - If no script is found with the key
 *
 * @example
 * const reportId = '5f8d1b2f8c2b6c001c7c8e0e';
 * const email = 'test@email.com'
 * await FixedReportController.runFixedReport({ reportId, email });
 */
FixedReportController.runFixedReport = async ({ reportId, email }) => {
  const report = await Report.findById(reportId).populate('fixedReportId', 'key');
  if (!report) throw new Error(`Could not find report: ${reportId}`);

  if (report.reportType !== 'Fixed' || !report.fixedReportId?._id || !report.fixedReportId?.key) throw new Error('No Fixed Report is associated with this report');

  logger.debug(`Incoming report key: ${report.fixedReportId.key}`);

  const client = await Client.findById(report.clientId, '_id');
  if (!client) throw new Error(`Could not find Client ID: ${report.clientId}`);

  // Picks up script from list of imported scripts
  const script = ScriptList[report.fixedReportId.key];
  if (!script) throw Error(`No Script found with key: ${report.fixedReportId.key}`);

  try {
    // Runs script
    console.time(`${report._id.toString()} | ${report.fixedReportId.key}`);
    const file = await script.run(report); // Returns name of file and not filePath
    console.timeEnd(`${report._id.toString()} | ${report.fixedReportId.key}`);

    logger.info(`${report._id.toString()} | ${client._id.toString()} - ${report.fixedReportId.key} | Uploading file to S3: ${file}`);
    const publicKey = await FixedReportController.uploadToS3({ file, client });

    // Send in app notification and email to client
    await FixedReportController.notifyClient({ publicKey, client, reportName: report.name, email });
  } catch (error) {
    logger.error(`${report._id.toString()} | ${client._id.toString()} - ${report.fixedReportId.key} | Error:`, error);
    // Send in app notification and email to client
    await FixedReportController.notifyClient({ client, reportName: report.name, email, error });
  }
};

module.exports = FixedReportController;
