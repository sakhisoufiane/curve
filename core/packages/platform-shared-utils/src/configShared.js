module.exports = {
  encryptedFields: {
    payee: ['contactEmail', 'address', 'bankName', 'bankAddress', 'accountNo', 'sortCode', 'iban', 'swiftCode', 'paymentEmail', 'paymentProviders.wise.paymentFields'],
    client: ['ftpPassword', 'paymentProviders.tipalti.apiKey', 'paymentProviders.wise.apiKey'],
  },
};
