require('dotenv').config();
require('../models/db');
const Contract = require('../models/contract');

const updateDeductions = async (id) => {
  const limit = 100;
  const filter = {$or: [{'deductionsTerms.deductionBasis': 'Unit Rate'}, {'deductionsTerms.deductionBasis': 'Percentage'} ] };
  if (id) {filter._id = { $gt: id} };
  const contracts = await Contract.find(filter).sort({_id: 1 }).limit(limit);
  console.log(`Found ${contracts.length} contracts`);

  id = contracts?.[contracts.length -1]?._id;
  const allPromises = [];
  for (contract of contracts) {
    for (deduction of contract.deductionsTerms) {
      if (deduction.deductionBasis === 'Unit Rate') { deduction.deductionBasis = 'Fixed Unit Rate'; }
      else if (deduction.deductionBasis === 'Percentage') { deduction.deductionBasis = 'Sales Input'; }
    }
    // findByIdAndUpdate instead of save to skip pre save validations
    allPromises.push(Contract.findByIdAndUpdate(contract._id, {$set: {deductionsTerms: contract.deductionsTerms}}, { timestamps: false }));
  }

  await Promise.all(allPromises);

  if (contracts.length === limit) { await updateDeductions(id); }
}

updateDeductions().then(() => { console.log('Done updating '); });