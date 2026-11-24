const ContractFields = this;
// Do we only really need _id and name for autocomplete?
ContractFields.autocomplete = {
  _id: 1,
  name: 1,
  foreignId: 1,
  projectId: 1,
  contractType: 1,
  type: 1,
  contractCategories: 1,
  createdAt: 1,
  active: 1,
  payeeId: 1,
  accountingPeriod: 1,
  valid: 1,
  validationErrors: 1,
  updatedAt: 1,
};

module.exports = ContractFields;
