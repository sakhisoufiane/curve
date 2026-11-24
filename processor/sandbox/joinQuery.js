const moment = require('moment');
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');

const config = require('../config.json');

require('../models/db');
const Period = require('../models/period');
const Client = require('../models/client');
const SalesFile = require('../models/salesFile');


const run = async (periodId) => {
  const period = await Period
    .findById(periodId)
    .select('salesFilesIds clientId')
    .catch(logger.error);

  if (!period) throw new Error('Period not found');

  const client = await Client.findById(period.clientId).catch(logger.error);
  if (!client) throw new Error('Client not found');

  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

  const salesFiles = await SalesFile.find({ _id: { $in: period.salesFilesIds } }, '_id partitionNo').catch(logger.error);
  if (!salesFiles?.length) throw new Error('Sales Files not found');

  const template = config.exportTemplates.unreportedReport;
  const select = template.map((column) => column.field);

  const whereClause = `Input.salesFileId IN (${salesFiles.map((sf) => `'${sf._id.toString()}'`).join(', ')}) AND Input.partitionNo IN (${salesFiles.map((sf) => sf.partitionNo).join(', ')}) AND status = 'Complete'`;

  const query = `
    SELECT
      STRING_AGG(Output.contractId, ', ') as contractIds,
      ${bigQuery.formatJoinColumnsSelect('Input', select)},
      Output.salesLineId
    FROM
      \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
    LEFT OUTER JOIN
      \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output
    ON
      (Output.salesLineId = Input.id)
    WHERE
      ${whereClause}
    GROUP BY
      ${bigQuery.formatJoinColumnsSelect('Input', select)},
      Output.salesLineId
  `;

  const bucketName = 'arjun-fixed-report-test';
  const filename = `${bigQuery.outputTable}-${moment().format('x')}-export-`;
  const gsPath = `gs://${bucketName}/${filename}*.json`;
  const exportQuery = `EXPORT DATA OPTIONS( uri='${gsPath}', overwrite=true, format='JSON') AS ${query}`
  console.log(exportQuery);
};

const periodId = '666376e433f7f891580fc04c';

run(periodId).then(() => {
  logger.info('Fixed Report Complete');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(-1);
});