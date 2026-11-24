const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const User = require('../../models/user');

async function getPayeesFromReturnsRights(salesReturnsRights, { withUserEmail = false } = {}) {
  if (!salesReturnsRights) {
    return [];
  }

  const contractIds = salesReturnsRights.map((right) => right.contractId).map((id) => new ObjectId(id));
  const contracts = await Contract.find({
    _id: { $in: contractIds },
  }, {
    payees: 1,
    _id: 1,
  }).lean();

  const contractsWithSalesRights = contracts?.map((contract) => {
    const salesRight = salesReturnsRights.find((right) => right.contractId === contract._id.toString());
    return {
      ...contract,
      percentage: salesRight?.percentage,
    };
  }) ?? [];

  const payees = await Promise.all(contractsWithSalesRights.map(async (contract) => {
    const payeeId = contract.payees[0]?.payeeId;
    const payee = await Payee.findById(payeeId, { name: 1, contactEmail: 1, paymentEmail: 1 }).lean();

    let user;

    if (withUserEmail) {
      user = await User.findOne(
        { payeeIds: payeeId },
        { email: 1 },
      ).lean();
    }

    if (payee) {
      return {
        name: payee.name,
        email: withUserEmail ? user?.email || '' : payee.contactEmail || payee.paymentEmail || '',
        percentage: contract.percentage,
      };
    }

    return null;
  }));

  return payees.filter((payee) => payee !== null);
}

module.exports = {
  getPayeesFromReturnsRights,
};
