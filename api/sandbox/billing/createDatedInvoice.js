require('dotenv').config();
require('../../models/db');
const moment = require('moment');
const Billing = require('../../libs/billing/index');
const Client = require('../../models/client');
const Invoice = require('../../models/invoice');
const util = require('util');
const InvoiceGenerator = require('../../libs/billing/invoice/index');

const dateOfInvoice = "2025-03-26";// Insert Date we display inside of invoice
const isoDate = moment(dateOfInvoice).toISOString();


// TO backtrack the invoice date on the PDF, head to api/libs/billing/invoice/libs/invoice.js line 93 and add the value of dateOfInvoice in the moment()

const createInvoice = async (clientId) => {
    const client = await Client.findById(clientId);
    // Use this if usage hasn't changed for client:
    // const usage = await Billing.getClientUsage(clientId, client.billing.currency)
const usage = {
  amount: 75,
  vat: 0,
  contracts: 35,
  catalogue: 60,
  nextBillingDate: isoDate,
  currencyToCharge: 'EUR',
  nextTier: {
    contracts: 45,
    catalogue: 300,
    nextAmount: 100,
    nextTierVat: 0
  }
}
  const params = {
    s3WriteKey: `invoice/${client._id.toString()}/Invoice ${moment(dateOfInvoice).format('MMM YYYY')}.pdf`,
    name: `Invoice ${moment(dateOfInvoice).format('MM/YYYY')}`,
    billingInfo: client.billing,
    usage,
  };

  const file = await util.promisify(InvoiceGenerator)(params);

  const invoice = new Invoice({
    clientId: client._id.toString(),
    name: `Invoice ${moment(dateOfInvoice).format('MM/YYYY')}`,
    billingInfo: client.billing,
    date: isoDate,
    usage,
    file,
  });
  console.log('invoice Created')
  await invoice.save();
};

createInvoice('65868ee900164373fa8684b0')