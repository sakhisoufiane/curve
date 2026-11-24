const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Notification = require('../../models/notification');

/**
 *
 * @param {exportName} exportName Display name of the export type e.g. "All Sales"
 * @param {periodName} periodName Display name of the Period
 * @param {urls} urls Array of URLs to include in bulk export notifications ({ url: string, name: string }[])
 * @param {client} client Client model with populated fields i.e. from Client.findById
 * @param {email} email Email address for the notification
 * @param {identifier} identifier Unique identifier for the Notification type e.g. "salesExportZips"
 * @param {exportScope} exportScope Scope of the export e.g. "period" or "selectedStatements"
 * @param {linkAvailabilityText} linkAvailabilityText Human-readable duration matching the URL expiry e.g. "24 hours" or "7 days" (default: "7 days")
 *
 * @description Used for sending a generic export notification that can support multiple download URLs (for large exports)
 */
async function sendBulkExportNotification({
  exportName,
  periodName,
  urls,
  client,
  email,
  identifier,
  exportScope,
  linkAvailabilityText = '7 days',
}) {
  let subject;
  if (exportScope === 'period') {
    subject = `Your ${exportName} Export for ${periodName} is Ready For Download`;
  } else {
    subject = `Your ${exportName} Export is Ready For Download`;
  }

  const mainTextParts = [`Your download is ready, and will be available for the next ${linkAvailabilityText}.`];
  if (urls.length > 1) {
    const htmlLinks = urls.map(({ name, url }) => `<li style="padding-top:5px;"><a href="${url}">${name}</a></li>`).join('\n');
    mainTextParts.push(`Due to the large data size, the export has been divided into multiple zipped files (${urls.length} in total).`);
    mainTextParts.push(`<br><ul style="padding:10px;">${htmlLinks}</ul>`);
  }

  const options = {
    identifier,
    client,
    subject,
    email,
    mainText: mainTextParts.join(' '),
  };

  // If it's a single file, it will always be a single export URL
  const link = urls.length === 1 ? urls[0].url : '';

  // Save all URLs for in-app notification
  if (urls.length > 1) {
    options.urls = urls;
  } else {
    // Use link option for a single download to show the button in the email
    options.link = link;
  }

  await new Promise((resolve, reject) => {
    Notification.generate(`${exportName} Export Ready`, subject, link, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  logger.info(`${exportName} Export Notification sent`);
}

/**
 *
 * @param {reportName} reportName Display name of the Report
 * @param {url} url Public S3 URL where the export file can be downloaded from
 * @param {client} client Client model with populated fields i.e. from Client.findById
 * @param {email} email Email address for the notification
 *
 * @description Used for sending a report export notification (with a single download URL)
 */
async function sendReportExportNotification({
  reportName,
  url,
  client,
  email,
}) {
  const subject = `Your Report for ${reportName} is Ready for Download`;
  const options = {
    identifier: 'reportDownload',
    client,
    subject,
    email,
    link: url,
  };
  await new Promise((resolve, reject) => {
    Notification.generate('Report Ready', subject, url, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 *
 * @param {Object} params
 * @param {string} params.deliveryName Display name of the Delivery
 * @param {string} params.url Public S3 URL where the export file can be downloaded from
 * @param {Client} params.client Client model with populated fields i.e. from Client.findById
 * @param {string} params.email Email address for the notification
 */
async function sendSonglistExportNotification({
  deliveryName,
  url,
  client,
  email,
}) {
  const subject = `Your Songlist Export for ${deliveryName} is Ready for Download`;
  const options = {
    identifier: 'songlistDownload',
    client,
    subject,
    email,
    link: url,
  };
  await new Promise((resolve, reject) => {
    Notification.generate('Songlist Export Ready', subject, url, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 *
 * Sends a notification for a Works export.
 * @param {Object} params
 * @param {string} params.url Public S3 URL where the export file can be downloaded from
 * @param {Client} params.client Client model with populated fields i.e. from Client.findById
 * @param {string} params.email Email address for the notification
 * @param {string} params.deliveryFormat Format of the CWR delivery e.g. "CWR", "CSV"
 */
async function sendWorksExportNotification({
  url,
  client,
  email,
  isError = false,
}) {
  if (isError) {
    const subject = `Your Works Export for ${client.name} Has Errored`;
    const options = {
      identifier: 'genericError',
      client,
      subject,
      email,
      mainText: 'There was an error while generating your export. Please try again later or contact support if the issue persists.',
    };
    return new Promise((resolve, reject) => {
      Notification.generate(subject, subject, null, options, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  const subject = `Your Works Export for ${client.name} is Ready to Download`;
  const options = {
    identifier: 'worksExportDownload',
    client,
    subject,
    email,
    link: url,
  };
  await new Promise((resolve, reject) => {
    Notification.generate('Works Export Ready', subject, url, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 *
 * Sends a notification for a CWR export.
 * @param {Object} params
 * @param {string} params.url Public S3 URL where the export file can be downloaded from
 * @param {Client} params.client Client model with populated fields i.e. from Client.findById
 * @param {string} params.email Email address for the notification
 * @param {string} params.deliveryFormat Format of the CWR delivery e.g. "CWR", "CSV"
 */
async function sendCwrExportNotification({
  url,
  client,
  email,
  deliveryFormat,
}) {
  const subject = `Your ${deliveryFormat} Export for ${client.name} is Ready to Download`;
  const options = {
    identifier: 'cwrExportDownload',
    client,
    subject,
    email,
    link: url,
  };
  await new Promise((resolve, reject) => {
    Notification.generate(`${deliveryFormat} Export Ready`, subject, url, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  sendBulkExportNotification,
  sendReportExportNotification,
  sendSonglistExportNotification,
  sendWorksExportNotification,
  sendCwrExportNotification,
};
