const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Notification = require('../../models/notification');
const Client = require('../../models/client');

const notifyISWCConflicts = async (acknowledgement, errors, receivingParty, email) => {
  try {
    const client = await Client.findById(acknowledgement.clientId);
    if (!client) {
      logger.error(`Client not found for ID: ${acknowledgement.clientId}`);
      return;
    }

    const formattedDate = moment(acknowledgement.createdAt).format('DD/MM/YYYY');
    const fileName = acknowledgement.name || acknowledgement.fileName;

    const duplicateMessages = [];
    const conflictMessages = [];

    // Generate the main text of the report by iterating over accumulatedErrors
    errors.forEach((error) => {
      const { work } = error;
      if (error.iswcDuplicates) {
        duplicateMessages.push(
          ...error.iswcDuplicates.map((dup) => `The ISWC ${dup.iswc} cannot be assigned to the Work "${work.title}" (${work.identifier ?? dup._id.toString()}) because it's already in use on "${dup.title}" (${dup.identifier ?? work._id.toString()})`),
        );
      }

      if (error.existingIswc) {
        conflictMessages.push(
          `Conflict: The Work "${work.title}" (${work.identifier ?? work._id.toString()}) already has an ISWC (${error.existingIswc}), which conflicts with the new ISWC ${error.newIswc}.`,
        );
      }
    });

    let subject;
    if (duplicateMessages.length > 0 && conflictMessages.length > 0) {
      subject = 'ISWC Duplicates and Conflicts Detected in Acknowledgement File';
    } else if (duplicateMessages.length > 0) {
      subject = 'Duplicate ISWCs Detected in Acknowledgement File';
    } else if (conflictMessages.length > 0) {
      subject = 'ISWC Conflicts Detected in Acknowledgement File';
    } else {
      subject = 'ISWC Issues Detected in Acknowledgement File';
    }

    let mainText = `Issues detected in your Acknowledgement file ${receivingParty ? `from ${receivingParty}` : ''} ${fileName} on ${formattedDate}.`;

    if (duplicateMessages.length > 0) {
      mainText += `<br><br>Duplicate ISWCs:<br>${duplicateMessages.join('<br>')}`;
    }

    if (conflictMessages.length > 0) {
      mainText += `<br><br>Conflicts Detected:<br>${conflictMessages.join('<br>')}`;
    }

    const generateOptions = {
      identifier: 'genericComplete',
      client,
      subject,
      email,
      mainText,
      error: [...duplicateMessages, ...conflictMessages],
    };

    Notification.generate('ISWC Conflicts and Duplicates', subject, null, generateOptions, (err, result) => {
      if (err) {
        logger.error(err);
      }
      logger.info(
        `ISWC conflict/duplicate notification sent to client ID: ${acknowledgement.clientId} - ISWC Acknowledgement ID: ${acknowledgement._id} - Number of issues: ${errors.length}`,
      );
    });
  } catch (error) {
    logger.error(`Error in notifyISWCConflicts: ${error.message}`);
  }
};

module.exports = {
  notifyISWCConflicts,
};
