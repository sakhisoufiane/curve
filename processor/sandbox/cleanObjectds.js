require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const Contract = require('../models/contract');

// const clientId = '5a670a94add44416ebcd0f4e'; // CookingVinyl
Contract.find({payeeId: {$ne: null}}, 'payeeId', (err, contracts) => {
  if (err) {
    logger.error(err);
    process.exit(0);
  } else if (contracts && contracts.length > 0) {
    const contractsFixArray = contracts.map(contract => {
      if (!isValidObjectId(contract.payeeId)) {
        logger.info(`contract._id: ${contract._id} | contract.payeeId: ${contract.payeeId} | null`);
        return contract._id;
      }
    }).filter(Boolean);

    logger.info(contractsFixArray);
    logger.info(contractsFixArray.length);

    Contract.updateMany({ _id: {$in: contractsFixArray} }, { $set: { payeeId: null } }, (err, res) => {
      if (err) {
        logger.error(err);
      } else {
        logger.info(res);
      }
      process.exit(0);
    });
  }
});

// Validator function
function isValidObjectId(id){
  if(ObjectId.isValid(id)){
      return ((String)(new ObjectId(id)) === id) ? true : false;
  }
  return false;
}
