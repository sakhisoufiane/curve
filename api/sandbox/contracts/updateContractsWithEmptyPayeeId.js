require('dotenv').config();
require('../models/db');
const Contract = require('../models/contract');

const updateContracts = async (id) => {
  const limit = 50;
  const query = id ? { payeeId: '', _id: { $gt: id }} : { payeeId: '' };
  console.log(query);
  const contracts = await Contract.find(query).sort({_id: 1}).limit(limit);
  const updates = contracts.map((contract) => Contract.findByIdAndUpdate(contract._id, {$set: {payeeId: null}}));
  await Promise.all(updates);
  if (contracts.length === limit) { updateContracts(contracts[contracts.length -1]._id); }
};

updateContracts().catch((err) => console.error(err));