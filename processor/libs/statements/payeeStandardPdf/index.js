/* eslint-disable no-continue */
const appRootDir = require('app-root-dir').get();
const { logger, utils } = require('@curveroyaltysystems/platform-shared-utils');

const { addRow, spacer, addDivider, addContractSection, newPage, initPDF, addTransactionsSection } = require('./helpers');
const { lineStart, headerFont, mediumSpacer, secondaryColor, payeeTitleSize, smallSpacer, offsetColour, largeSpacer } = require('./constants');

const PayeePDF = this;

/**
 * Creates a Payee PDF
 *
 * @param {Object} params.payee - Payee Object
 * @param {Object} params.client - Client Object
 * @param {Object} params.period - Period Object
 * @param {Number} params.openingBalance - Opening Balance for the Payee
 * @param {Number} params.closingBalance - Closing Balance for the Payee
 * @param {Object} params.payment - Auto-Payment Transaction
 * @param {Object} params.taxTransaction - Tax Transaction
 * @param {Array} params.otherTransactions - Array of User Created Transactions
 * @param {Array} params.contractTransfers - Array of Contract Transactions (Type: Period Transfers)
 * @param {String} params.logo - Client Logo
 * @param {String} params.address - Payee Address
 *
 * @returns {Promise<String>} Local file path to the PDF
 */
PayeePDF.create = async ({ payee, client, period, openingBalance, closingBalance, payment, taxTransaction, otherTransactions, contractTransfers, logo }) => {
  logger.debug(`${period._id.toString()} - Creating Payee PDF for ${payee.name} in ${period.name}`);

  const fileName = `${period.year} - ${period.accountingPeriod}: ${payee.name}.pdf`;
  const filePath = `${appRootDir}/tmp/${utils.safeName(fileName)}`;

  // Initialize PDF
  const { pdf, writeStream } = initPDF({ filePath });

  // Header
  if (logo) {
    try {
      pdf.image(logo, 20, 20, { height: 80 });
    } catch (error) {
      logger.error(`Error adding logo to PDF: ${error}`);
    }
  }

  if (payee.address) { pdf.fillColor(secondaryColor).fontSize(headerFont).text(payee.address, 180, 40, { width: 400, align: 'right' }); }

  // Main Title
  pdf.fillColor(secondaryColor).fontSize(32).font('H2').text('PAYEE SUMMARY', lineStart, 130, { width: 300, align: 'right' });

  // Payee Titles
  pdf.fillColor('black').fontSize(payeeTitleSize).font('Condensed').text(period.name, 75, 164, { width: 300, align: 'right' });
  pdf.fillColor('black').fontSize(payeeTitleSize).font('Condensed').text(payee.name, 380, 164, { width: 200, align: 'right' });

  // Opening Balance Row
  addRow({ pdf, trailingHeader: 'OPENING BALANCE', value: openingBalance, currency: payee.payeeBalanceCurrency, showDivider: true });
  spacer({ pdf, amount: smallSpacer });

  // Line Break
  addDivider({ pdf });
  spacer({ pdf, amount: mediumSpacer });

  // Contracts Income
  addContractSection({ pdf, header: 'CONTRACTS', alignHeader: true, contractTransfers, payee, showTotals: true });

  // Other Transactions
  if (otherTransactions?.length) {
    addTransactionsSection({ pdf, otherTransactions, payee });
  }

  // Tax Row
  addRow({
    pdf,
    showDivider: true,
    trailingHeader: 'TAX',
    value: taxTransaction,
    currency: payee.payeeBalanceCurrency,
    subHeader: payee.selfBillingTaxRate ? `Tax @ ${payee.selfBillingTaxRate}%` : '',
  });

  // Auto Payments Row
  addRow({ pdf, trailingHeader: 'PAYMENT', value: payment?.amountInPayeeCurrency || 0, currency: payee.payeeBalanceCurrency, showDivider: true });

  // Closing Balance Row
  addRow({ pdf, trailingHeader: 'CLOSING BALANCE', value: closingBalance, currency: payee.payeeBalanceCurrency, showDivider: true });

  // Closing Balance Currency Message
  if (payee.payeeBalanceCurrency) {
    pdf.fillColor(offsetColour).fontSize(10).font('Body').text(`All amounts are in ${payee.payeeBalanceCurrency}`, 350, pdf.y + 9, { width: 200, align: 'right' });
  }

  // AutoPayments Message Row
  if (payee.autoPayment && !payment && (closingBalance < payee.minPayout)) {
    spacer({ pdf, amount: largeSpacer });

    const text = 'The closing amount on this statement will not be paid this period, as it falls below the minimum payment threshold';
    pdf.fillColor(offsetColour).fontSize(8).font('Currency').text(text, 70, pdf.y - 2, { width: 450, align: 'center' });
  }

  // Client Custom Text
  if (client.payeeSummaryText) {
    spacer({ pdf, amount: largeSpacer });
    pdf.fillColor(offsetColour).fontSize(12).font('Body').text(client.payeeSummaryText, 70, pdf.y - 2, { width: 450, align: 'center' });
  }

  // Footer = Powered By Curve, Statement Text and client.statementEmail
  if (client.email?.length) {
    const offsetY = pdf.y >= 760 ? pdf.y += 3 : 760;
    pdf.fillColor(offsetColour).fontSize(8).font('Body').text(`Any questions, please contact ${client.email}`, 145, offsetY, { width: 300, align: 'center' });
  }

  // Powered By Curve Logo
  const logoOffsetY = pdf.y >= 800 ? pdf.y += 3 : 800;
  pdf.image(`${appRootDir}/assets/images/Produced-By-Logo.jpg`, 270, logoOffsetY, { height: 25 });

  // Not Included Page
  newPage({ pdf });

  spacer({ pdf, amount: mediumSpacer });

  // Contracts Not Included
  addContractSection({ pdf, header: 'NOT INCLUDED', alignHeader: false, contractTransfers, payee, showTotals: false, showExcluded: true });

  // Close PDF
  pdf.end();
  await new Promise((resolve, _) => { writeStream.on('finish', () => resolve()); }).catch((err) => logger.error(`Error closing PDF: ${err}`));

  logger.debug(`${period._id.toString()} - Payee PDF for ${payee.name} in ${period.name} created at ${filePath}`);

  return filePath;
};

module.exports = PayeePDF;
