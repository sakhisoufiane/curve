const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Ingest = require('./ingest');
const Import = require('../../../models/import');
const Client = require('../../../models/client');
const Notification = require('../../../models/notification');

async function runCwrImport({ importId, email }) {
  const logKey = `${importId} | CWR Import |`;

  const cwrImport = await Import.findById(importId);
  if (!cwrImport) throw new Error(`Import with ID ${importId} not found`);

  const client = await Client.findById(cwrImport.clientId);
  if (!client) throw new Error(`Client with ID ${cwrImport.clientId} not found`);

  try {
    logger.info(logKey, 'Starting CWR import for file:', cwrImport.name);
    const { count, errors } = await Ingest.ingestCwrFile({
      Import: cwrImport,
      s3Key: cwrImport.counterpointFiles.publishingCatalogueExport,
      bucket: process.env.S3_bucket,
      clientId: cwrImport.clientId,
      defaults: cwrImport.defaults,
      submitter: cwrImport.transferringParty,
    });

    if (errors?.length) {
      cwrImport.status = 'Complete';
      cwrImport.errorMessage = 'Partially Complete';
      cwrImport.errors = errors;
      cwrImport.ingestedWorks = count;

      await new Promise((resolve, reject) => {
        Notification.generate(
          `Your Import ${cwrImport.name} Has Partially Completed`,
          `${errors.length} errors in file ${cwrImport.name}. ${count} works imported.`,
          null,
          {
            identifier: 'partialImportError',
            client,
            email,
            subject: `Your Import ${cwrImport.name} Has Partially Completed`,
            mainText: `${errors.length} errors in file ${cwrImport.name}. ${count} works imported.`,
            error: errors.map((error) => `${error.error} (${error.title} - ${error.identifier})`),
          },
          (err) => (err ? reject(err) : resolve()),
        );
      });
    } else {
      cwrImport.status = 'Complete';
      cwrImport.ingestedWorks = count;

      await new Promise((resolve, reject) => {
        Notification.generate(
          'CWR Bulk import completed',
          `Your Import ${cwrImport.name} Has Completed`,
          null,
          {
            identifier: 'genericComplete',
            client,
            email,
            subject: `Your Import ${cwrImport.name} Has Completed`,
            mainText: `Your Import ${cwrImport.name} Has Completed. ${count} works imported.`,
          },
          (err) => (err ? reject(err) : resolve()),
        );
      });
    }
  } catch (ingestError) {
    logger.error(logKey, ingestError);
    cwrImport.status = 'Errored';
    cwrImport.errorMessage = ingestError.message;

    await new Promise((resolve, reject) => {
      Notification.generate(
        `Your Import ${cwrImport.name} Has Errored`,
        `${ingestError.message} in file ${cwrImport.name}`,
        null,
        {
          identifier: 'bulkImportError',
          client,
          email,
          subject: `Your Import ${cwrImport.name} Has Errored`,
          mainText: `${ingestError.message} in file ${cwrImport.name}`,
          error: ingestError.message,
        },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  } finally {
    await cwrImport.save().catch((err) => {
      logger.error(logKey, 'Failed to update Import', err);
    });
  }
}

module.exports = { runCwrImport };
