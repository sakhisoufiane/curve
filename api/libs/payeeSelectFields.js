module.exports = {
  client: [
    'clientId',
    'name',
    'alternateName',
    'payeeCategories',
    'foreignId',
    'projectId',
    'supplierCode',
    'country',
    'vatNo',
    'notes',
    'duplicatedFrom',
    'selfBillingTaxText',
    'selfBillingTaxRate',
    'feesInvoiceTaxRate',
    'withholdingTaxRate',
    'withholdingTaxWording',
    'updatedAt',
    'valid',
    'validationErrors',
  ],
  clientAdminOnly: [
    'contactEmail',
    'address',
    'bankName',
    'bankAddress',
    'accountNo',
    'sortCode',
    'iban',
    'swiftCode',
    'paymentEmail',
    'paymentCurrency',
    'paymentProviders',
  ],
  getClientAdminFields() {
    return this.client.concat(this.clientAdminOnly);
  },
  getClientFields() {
    return this.client;
  },
  getClientAdminOnlyFields() {
    return this.clientAdminOnly;
  },
};
