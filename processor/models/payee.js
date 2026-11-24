const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Payee: { name, schema } } = require('@curveroyaltysystems/models');
const { Tipalti, logger, encryption, configShared } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const mongoosePaginate = require('mongoose-paginate');
const Client = require('./client');

const payeeSchema = schema;

payeeSchema.plugin(mongoosePaginate);

payeeSchema.plugin(encryption.encryptionPlugin, {
  encryptedFields: configShared.encryptedFields.payee,
  Client,
});

payeeSchema.methods.getTipaltiPayeePayableStatus = async function (amount) {
  const payee = this;
  // Get payer name and api key from the client
  const { paymentProviders } = await Client.findById(payee.clientId, 'paymentProviders');
  const payerName = paymentProviders?.tipalti?.payerName;
  const apiKey = paymentProviders?.tipalti?.apiKey;
  const tipaltiPayee = { tipaltiPayeeId: payee.paymentProviders?.tipalti?.payeeId, _id: payee._id };
  // return not payable if no api key or payer name
  if (!apiKey || !payerName) { return { payable: false, reason: 'A Tipalti Payer Name and Api Key are required to enable the payment provider.' }; }
  // Get Tipalti payable status
  const { payable, reason } = await Tipalti.getPayeePayableStatus(tipaltiPayee, payerName, apiKey, amount).catch(logger.error);
  // If the status or reason aren't the same as the ones saved agaisnt he payee, update the payee.
  if (payee.paymentProviders?.tipalti?.payeePayable !== payable || payee.paymentProviders?.tipalti?.payeeNotPayableReason !== reason) {
    _.set(payee, 'paymentProviders.tipalti.payeePayable', payable);
    _.set(payee, 'paymentProviders.tipalti.payeeNotPayableReason', reason);
    await payee.save();
  }
  // return status and reason to be used elsewhere
  return { payable, reason };
};

payeeSchema.methods.isPayeePayable = async function (amount) {
  const payee = this;
  logger.debug('Getting the Payee\'s payable status');
  // Check that the payee has a currency set against them
  if (!payee.paymentCurrency) {
    const payable = false;
    const reason = 'A payment currency needs to be set against the Payee';
    return { payable, reason };
  }
  // Get Client payment provider
  const { paymentProviders } = await Client.findById(payee.clientId);
  // Tipalti Payable Status
  if (paymentProviders?.selectedPaymentProvider === 'Tipalti') {
    const { payable, reason } = await payee.getTipaltiPayeePayableStatus(amount);
    return { payable, reason };
  }
  // Wise Payable Status
  if (paymentProviders?.selectedPaymentProvider === 'Wise') {
    const errors = [];
    const paymentMethodRequirements = payee.paymentProviders?.wise?.paymentMethodRequirements;
    const paymentFields = Payee.escapeDotsFromWiseFields(payee.paymentProviders?.wise?.paymentFields, false);
    if (!paymentMethodRequirements || !paymentFields) {
      const payable = false;
      const reason = 'A Wise payment method is required to be set against the Payee';
      return { payable, reason };
    }
    // Check against Wise requirements for the Payee's payment method
    paymentMethodRequirements?.fields?.forEach((requirementGroup) => {
      requirementGroup?.group?.forEach((field) => {
        if (field?.required && !paymentFields?.[field.key]) { errors.push(`${field.name} is required`); }
        if (field?.validationRegexp && paymentFields?.[field.key]) {
          const regex = new RegExp(field.validationRegexp);
          if (!regex.test(paymentFields[field.key])) {
            errors.push(`Invalid value for ${field.name}`);
          }
        }
      });
    });

    const payable = errors.length === 0;
    const reason = errors.join(', ');

    return { payable, reason };
  }

  // Curve Pay, return true as the validation is done on the payments API
  if (paymentProviders?.selectedPaymentProvider === 'Curve Pay') {
    return { payable: true, reason: null };
  }

  // Standard CSV
  if (!(payee.accountNo && payee.sortCode) && !payee.iban) {
    const payable = false;
    const reason = 'An IBAN or Account Number and Sort Code are required against the payee';
    return { payable, reason };
  }

  const payable = true; const reason = null;
  return { payable, reason };
};

payeeSchema.methods.getPaymentCurrency = async ({ payeeId, contractId, clientId }) => {
  const Contract = require('./contract');
  const contractFilter = contractId ? { _id: contractId } : { 'payees.payees': payeeId };
  const contract = await Contract.findOne(contractFilter).select('currency');

  // If the contract has a currency, and is not the Home Currency => return this currency as the Payee currency
  if (contract?.currency && contract?.currency !== 'Home Currency') return contract.currency;
  // If not, get the currency from the client
  const client = await Client.findById(clientId).select('homeCurrency');
  // If the client has a home currency, use that as the payment currency.
  if (client?.homeCurrency) return client.homeCurrency;

  // Else return null, and let the payment.
  return null;
};

/**
  * Formats wise payment fields to remove or add dots to them
  *
  * Calls callback(error) with an [error] if it occurs and the copied [payee] object.
  * @method
  * @param {object} paymentFields - The Payee wise fields.
  * @param {boolean} replaceDots - true to remove dots, false add dots.
  * @return {object} newPaymentFields - the formatted object
  */

payeeSchema.statics.escapeDotsFromWiseFields = function (paymentFields, replaceDots) {
  // if replaceDots is true, replace '.' with '_____'. If false, replace '_____' with '.'
  if (paymentFields) {
    const newPaymentFields = {};
    for (const key in paymentFields) {
      if (key) {
        const keyWithoutDot = replaceDots ? key.replace(/\./g, '_____') : key.replace(/_____/g, '.');
        newPaymentFields[keyWithoutDot] = paymentFields[key];
      }
    }

    return newPaymentFields;
  }
};

const Payee = mongoose.model(name, payeeSchema);

module.exports = Payee;
