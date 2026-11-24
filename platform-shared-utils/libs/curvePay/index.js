const axios = require('axios');
const logger = require('../logger');

const apiUrl = `${process.env.PAYMENTS_APP_URL}`;

const getPayeePayableStatus = async (payee, apiKey) => {
  try {
    const endpoint = `${apiUrl}/api/v1/payees/payable`;
    const requestBody = { ids: [payee._id.toString()] };

    logger.debug('Curve Pay - api', endpoint);
    logger.debug('Curve Pay - Request', requestBody);

    const response = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    });

    const payeeStatus = response.data?.[0];

    return payeeStatus?.id === payee._id.toString()
      ? { payable: payeeStatus.payable, reason: payeeStatus.reason?.code || '' }
      : { payable: false, reason: 'Unexpected response from Curve Pay.' };
  } catch (error) {
    logger.error(`Curve Pay - Error: ${error.message}`);
    return { payable: false, reason: error.message };
  }
};

const processBatchOfPayments = async ({ payments, apiKey, clientHomeCurrency }) => {
  if (!apiKey) throw Error('CurvePay API key is required');
  const endpoint = `${apiUrl}/api/v1/payment-async`;

  try {
    const formattedPayments = payments.map((payment) => ({
      payee_id: payment.payeeId.toString(),
      currency: payment.currency,
      amount: payment.amount.toString(),
      reason: payment.name,
      reference: payment.name,
      unique_request_id: payment.uuid,
    }));

    const requestBody = { client_currency: clientHomeCurrency, payments: formattedPayments };

    logger.debug('Curve Pay - api', endpoint);
    logger.debug('Curve Pay - Request', requestBody);

    const response = await axios.post(endpoint, requestBody, { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey } });

    logger.debug('Curve Pay - Response', response?.data);
    return response?.data;
  } catch (error) {
    if (error.response) {
      // API responded with an error status (e.g., 400 Bad Request)
      logger.error(`Curve Pay - API Error: ${error.response.status}`);
      logger.error(`Curve Pay - Error Details: ${JSON.stringify(error.response.data)}`);
      return {
        error: `CurvePay Error: ${error.response.status}`,
        details: error.response.data,
      };
    }
    // Network or unexpected error
    logger.error(`Curve Pay - Batch Payments Errored: ${error.message}`);
    return { error: error.message };
  }
};

module.exports = {
  processBatchOfPayments,
  getPayeePayableStatus,
};
