// API URLS
// Sandbox: https://api.sandbox.transferwise.tech
// Live: https://api.transferwise.com

const Wise = this;
const _ = require('lodash');
const axios = require('axios');
const logger = require('../logger');

const apiUrl = process.env.wiseApiUrl || 'https://api.sandbox.transferwise.tech';

Wise.getProfiles = async (apiKey) => {
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v2/profiles`;
  const response = await axios.get(url, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  // If no response or no profiles returned return error
  if (!response?.data?.length) {
    const error = Error('Couldn\'t load the list of profiles from Wise');
    error.showToUser = true;
    throw error;
  }
  // Map and return the profiles
  // eslint-disable-next-line consistent-return
  const profiles = response.data.map((profile) => {
    if (profile.type === 'PERSONAL') return { type: 'Personal', name: profile.fullName, id: profile.id };
    if (profile.type === 'BUSINESS') return { type: 'Business', name: profile.fullName, id: profile.id };
  });
  return profiles;
};

Wise.getPaymentRequirements = async (sourceCurrency, targetCurrency, amount) => {
  const config = { headers: { 'Content-Type': 'application/json' } };
  const url = `${apiUrl}/v1/account-requirements?source=${sourceCurrency}&target=${targetCurrency}&sourceAmount=${amount || 10000}`;
  const response = await axios.get(url, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  // If no response or no requirements returned, return error
  if (!response?.data) {
    const error = Error('Couldn\'t load the Payee\'s payment requirements from Wise');
    error.showToUser = true;
    throw error;
  }
  const requirements = response.data;
  return requirements;
};

Wise.getPayerBalance = async (profileId, apiKey, clientCurrency) => {
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v4/profiles/${profileId}/balances?types=STANDARD`;
  const response = await axios.get(url, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  //   if no balances returned, return an error
  if (!response?.data?.length) {
    const error = new Error('Couldn\'t load the account balance from Wise');
    error.showToUser = true;
    error.status = 404;
    throw error;
  }
  // Return the account that matches the client's currency.
  let payerBalance = { balance: 0, currency: clientCurrency };
  response.data.forEach((account) => {
    if (account.currency === clientCurrency) { payerBalance = { balance: account.amount?.value || 0, currency: account.currency }; }
  });
  return payerBalance;
};

Wise.processBatchOfPayments = async ({ payments, apiKey, autoPayment }) => {
  // Process each individual payments
  for (const payment of payments) {
    // eslint-disable-next-line no-await-in-loop
    await processSinglePayment({ payment, apiKey, autoPayment }).catch((error) => {
      logger.error(error);
      payment.error = error.message;
      payment.fullError = JSON.parse(JSON.stringify(error));
    });
  }
  // Return the processed payments
  return payments;
};

Wise.getListOfRecipients = async (profileId, apiKey) => {
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v1/accounts`;
  const response = await axios.get(url, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  const recipients = response.data || [];

  return recipients.map((recipient) => ({
    id: String(recipient.id),
    name: recipient.accountHolderName,
    currency: recipient.currency,
  }));
};

Wise.getSingleRecipient = async (recipientId, apiKey) => {
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v1/accounts/${recipientId}`;
  const response = await axios.get(url, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  const recipient = response.data;
  return recipient;
};

Wise.getRate = async ({ source, target, apiKey }) => {
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v1/rates?source=${source}&target=${target}`;
  const response = await axios.get(url, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  const rate = response.data;
  return rate;
};

const processSinglePayment = async ({ payment, apiKey, autoPayment }) => {
  logger.debug(`Processing payment ${payment._id}`);
  // Create Wise Quote
  const quote = await createQuote(apiKey, payment);
  // Create recipient account (or use selected one)
  const recipient = payment.recipientId ? { id: payment.recipientId } : await Wise.createRecipientAccount(apiKey, payment);
  // Create transfer
  const transfer = await createTransfer(apiKey, recipient.id, quote.id, payment.uuid);
  payment.transferId = transfer.id;
  // Fund transfer
  if (autoPayment) {
    await fundTransfer(apiKey, payment.profile, transfer.id);
  }
};

const createQuote = async (apiKey, payment) => {
  logger.debug('Creating quote..');
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v2/quotes`;
  const body = { profile: payment.profile, sourceCurrency: payment.sourceCurrency, targetCurrency: payment.targetCurrency };
  if (payment.feesPaidBy === 'payee') {
    logger.debug('Payee is paying the fees. Getting source amount..');
    body.sourceAmount = await getSourceAmount({ apiKey, amount: payment.targetAmount, sourceCurrency: payment.sourceCurrency, targetCurrency: payment.targetCurrency });
  } else {
    body.targetAmount = payment.targetAmount;
  }
  const response = await axios
    .post(url, body, config)
    .catch((error) => {
      const errorToReturn = new Error('Couldn\'t load the payment\'s quote from Wise.');
      errorToReturn.response = error.response?.data;
      errorToReturn.json = error.toJSON();
      throw errorToReturn;
    });
  logger.info(JSON.stringify(response?.data || {}));
  if (!response?.data) { throw Error('Couldn\'t load the payment\'s quote from Wise.'); }
  const quote = response.data;
  return quote;
};

const getSourceAmount = async ({ apiKey, amount, sourceCurrency, targetCurrency }) => {
  if (sourceCurrency === targetCurrency) { return amount; }

  // If currencies are different, convert amount from targetCurrency to sourceCurrency
  const wiseRate = await Wise.getRate({ source: targetCurrency, target: sourceCurrency, apiKey });
  const rate = wiseRate?.[0]?.rate || 0;
  return amount * rate;
};

Wise.createRecipientAccount = async (apiKey, payment) => {
  logger.debug('Creating recipient account..');
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v1/accounts`;
  const body = {
    currency: payment.targetCurrency,
    profile: payment.profile,
    type: payment.type,
    accountHolderName: payment.accountHolderName,
    details: formatPaymentDetails(payment.details),
  };
  const response = await axios
    .post(url, body, config)
    .catch((error) => {
      const errorToReturn = new Error('Couldn\'t create a recipient on Wise.');
      errorToReturn.response = error.response?.data;
      errorToReturn.json = error.toJSON();
      throw errorToReturn;
    });
  logger.info(JSON.stringify(response?.data || {}));
  if (!response?.data) { throw Error('Couldn\'t create a recipient on Wise.'); }
  const recipient = response.data;
  return recipient;
};

Wise.createSubscription = async ({ apiKey, profileId, subscription: body }) => {
  logger.debug('Creating wise subscription..');
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v3/profiles/${profileId}/subscriptions`;
  const response = await axios
    .post(url, body, config)
    .catch((error) => {
      const errorToReturn = new Error('Couldn\'t create a subscription on Wise.');
      errorToReturn.response = error.response?.data;
      errorToReturn.json = error.toJSON();
      throw errorToReturn;
    });
  logger.info(JSON.stringify(response?.data || {}));
  if (!response?.data) { throw Error('Couldn\'t create a subscription on Wise.'); }
  return response.data;
};

Wise.listSubscriptions = async ({ apiKey, profileId }) => {
  logger.debug('Getting wise subscription..');
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v3/profiles/${profileId}/subscriptions`;
  const response = await axios
    .get(url, config)
    .catch((error) => {
      const errorToReturn = new Error('Couldn\'t create a subscription on Wise.');
      errorToReturn.response = error.response?.data;
      errorToReturn.json = error.toJSON();
      throw errorToReturn;
    });
  logger.info(JSON.stringify(response?.data || {}));
  if (!response?.data) { throw Error('Couldn\'t get subscriptions on Wise.'); }
  const subscriptions = response.data;
  return subscriptions;
};

const createTransfer = async (apiKey, targetAccount, quoteUuid, customerTransactionId) => {
  logger.debug('Creating transfer..');
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v1/transfers`;
  const body = { targetAccount, quoteUuid, customerTransactionId };
  const response = await axios
    .post(url, body, config)
    .catch((error) => {
      const errorToReturn = new Error('Couldn\'t create a transfer on Wise.');
      errorToReturn.response = error.response?.data;
      errorToReturn.json = error.toJSON();
      throw errorToReturn;
    });
  logger.info(JSON.stringify(response?.data || {}));
  if (!response?.data) { throw Error('Couldn\'t create a transfer on Wise.'); }
  const transfer = response.data;
  return transfer;
};

const fundTransfer = async (apiKey, profileId, transferId) => {
  logger.debug('Funding transfer..');
  const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } };
  const url = `${apiUrl}/v3/profiles/${profileId}/transfers/${transferId}/payments`;
  const body = { type: 'BALANCE' };
  const response = await axios.post(url, body, config).catch(logger.error);
  logger.info(JSON.stringify(response?.data || {}));
  if (!response?.data) { throw Error('Couldn\'t fund the transfer on Wise'); }
};

const formatPaymentDetails = (details) => {
  const formattedDetails = {};
  for (const field in details) {
    if (field.indexOf('.') === -1) {
      formattedDetails[field] = details[field];
    } else {
      _.set(formattedDetails, field, details[field]);
    }
  }
  return formattedDetails;
};
module.exports = Wise;
