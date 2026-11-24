const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WebClient } = require('@slack/web-api');

const HyperCare = this;

const { HYPERCARE_SLACK_TOKEN } = process.env;

HyperCare.notifyPeriodRun = async ({ client, period }) => {
  const slack = new WebClient(HYPERCARE_SLACK_TOKEN);

  const message = `
      :alert: *${client?.name}* Has Started Running Period *${period?.name}* :alert:
      Client ID: ${client._id.toString()}
      Period ID: ${period._id.toString()}
      Accounting Type: ${period.contractType}
      Sales File Count: ${period.salesFilesIds?.length || 0}
    `;

  await slack.chat.postMessage({ channel: '#hypercare', text: message }).catch(logger.error);
};

HyperCare.notifyIngestion = async ({ client, salesFile }) => {
  const slack = new WebClient(HYPERCARE_SLACK_TOKEN);

  const message = `
      :alert: *${client?.name}* Has Started Running Sales Ingestion *${salesFile?.name}* :alert:
      Client ID: ${client._id.toString()}
      Sales File ID: ${salesFile._id.toString()}
    `;

  await slack.chat.postMessage({ channel: '#hypercare', text: message }).catch(logger.error);
};

module.exports = HyperCare;
