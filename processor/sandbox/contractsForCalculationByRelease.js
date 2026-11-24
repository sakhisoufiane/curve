require('../models/db');
const Release = require('../models/release');
const Work = require('../models/work');
const Contract = require('../models/contract');

const id = '5c656d8122e8b130dc327c1e';

Work.findById(id, (err, work) => {
  work.contractsForSalesCalculation('Half-Yearly', (contracts) => {
    console.log(contracts[0].terms.sales);
    process.exit(-1);
  });
});
