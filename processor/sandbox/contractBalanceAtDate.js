require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../models/contract');
const Period = require('../models/period');

Contract.findById('5bcf1257588c5e04787a1107', (err, contract) => {
  Period.findById('5dc2a95873beb0168109fb3e', (err, period) => {
    const date = new Date(period.endDate);
    date.setDate(date.getDate() + 1);
    contract.balanceAtDate(date, { excludeAdvance: true, excludeReserves: true, excludeContractPayments: false }, (err, data) => {
      logger.info(data);
    });
  });
});
