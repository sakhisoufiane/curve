const { logger } = require("@curveroyaltysystems/platform-shared-utils");

require('../models/db');
const FixedReport = require("../models/fixedReport");

const createFixedReport = async (params) => {
  const fixedReport = new FixedReport(params);
  await fixedReport.save();
};

const params = {
  name: 'Unreported Sales Report',
  key: 'unmappedSalesReport',
  label: false,
  publisher: false,
  public: false,
  clientIds: [],
}

createFixedReport(params).then(() => {
  logger.info('Congrats, your Report has been created')
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(-1);
});
