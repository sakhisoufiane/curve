const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const axios = require('axios').default;
const Payee = require('../../models/payee');

const getiFrame = async ({ req, client }) => {
  const apiKey = client?.paymentProviders?.curvePay?.apiKey;
  if (!apiKey) throw Error('CurvePay API key is required');

  const route = req.body.route || 'debug';
  if (req.body.route === 'payee') {
    const payee = await Payee.findById(req.body.id);

    Object.assign(req.body, {
      ...(req.curveUser.type && { role: req.curveUser.type }),
      ...(payee.country && { bank_account_country: payee.country, payee_country: payee.country }),
      ...(payee.address && { address: payee.address }),
      ...(payee.bankName && { bank_name: payee.bankName }),
      ...(payee.accountNo && { account_number: payee.accountNo }),
      ...(payee.sortCode && { sort_code: payee.sortCode }),
      ...(payee.iban && { iban: payee.iban }),
      ...(payee.swiftCode && { bic: payee.swiftCode }),
      ...(payee.contactEmail && { email: payee.contactEmail }),
      ...(payee.paymentCurrency && { currency: payee.paymentCurrency }),
    });
  }
  try {
    const data = req.body || {};
    data.client_currency = client?.homeCurrency || '';
    const response = await axios.post(
      `${process.env.PAYMENTS_APP_URL}/api/v1/embed/${route}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      },
    );

    logger.debug(response.data);
    return response?.data?.url;
  } catch (err) {
    throw err.response?.data || err;
  }
};

module.exports = {
  getiFrame,
};
