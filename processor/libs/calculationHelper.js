const moment = require('moment');
const { ObjectId } = require('mongodb');
const Contract = require('../models/contract');
const Period = require('../models/period');
const Statement = require('../models/statement');

const calculationHelper = {
  /**
    * Outputs a number based on logic around the total, limit and offset, to ensure we load the remainder at the end of a batch of data
    *
    * @param {number} total - The total of number of lines a calculation takes on
    * @param {number} limit - The max amount the output should be
    * @param {number} offset - How far into the total amount have we paginated
    */
  contractSizeByLimit: (total, limit, offset) => {
    let output = total;
    if (limit && !offset && limit < total) {
      output = limit;
    } else if (limit && (offset || offset === 0)) {
      const limitTotal = offset + limit;
      if (total - limitTotal < 0) {
        output = total - offset;
      } else {
        output = limit;
      }
    }
    return output;
  },
  /**
    * Outputs an array of data, which is sorted by the passed value, and truncated at the limit or less
    *
    * @param {array} items - The input array on which the function is performed
    * @param {number} sortValue - The item within an array that should be sorted on
    * @param {number} limit - The amount the array should be limited
    */
  sortAndLimit: (items, sortValue, limit) => {
    limit = limit || 10000;
    let result = items;
    if (items && Array.isArray(items)) {
      // Sort items by sort value
      items = items.sort((a, b) => {
        let val = -1;
        if (a[sortValue] < b[sortValue]) {
          val = 1;
        }
        return val;
      });
      result = items.slice(0, limit - 1);
    }
    // Return limited set
    return result;
  },
  /**
    * Outputs a partition number based on the period start date and the contract name
    *
    * @param {string} periodId - The period ID
    * @param {string} contractId - The contract ID
    */
  generateContractPartitionNo: async (periodId, contractId, callback) => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    // Get the statement first, if a statement is found this means it's a statement recalculation and we should keep the same partitionNp
    const statement = contractId.length === 24 && ObjectId.isValid(contractId) ? await Statement.findOne({ periodId, contractId }, 'partitionNo') : null;

    if (statement?.partitionNo) {
      callback(null, statement.partitionNo);
    } else {
      // In some cases (MCPS for example), the contractId (coming from RoyaltyCalculator.contract.contractId) is not a valid ID
      // For MCPS, RoyaltyCalculator.contract.contractId is equal to 'MCPS'.
      const contract = contractId.length === 24 && ObjectId.isValid(contractId) ? await Contract.findById(contractId, 'name') : { name: contractId };

      const period = await Period.findById(periodId, 'startDate');

      let partitionNo = 0;

      if (contract.name) {
        const firstLetter = contract.name.toLowerCase().charAt(0);
        const letterPosition = String(alphabet.indexOf(firstLetter) + 1).padStart(2, '0');
        let halfYearsSince2022 = Math.ceil(moment(period.startDate).diff(moment('01/01/2022', 'DD/MM/YYYY'), 'months') / 6);
        if (halfYearsSince2022 < 1) { halfYearsSince2022 = 1; }
        partitionNo = `${halfYearsSince2022}${letterPosition}`;
      }

      callback(null, partitionNo);
    }
  },
};

module.exports = calculationHelper;
