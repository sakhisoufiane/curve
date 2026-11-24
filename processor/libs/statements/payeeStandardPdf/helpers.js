const fs = require('fs');
const PdfKit = require('pdfkit');
const appRootDir = require('app-root-dir').get();

const {
  margins,
  lineStart,
  lineHeight,
  mediumSpacer,
  smallSpacer,
  bodyFontSize,
  headerFontSize,
  secondaryColor,
  currencyFontSize,
  subHeaderFontSize,
} = require('./constants');

const PayeePDFHelpers = this;

/**
 * Create Y axis spacing
 *
 * @param {Object} params.pdf - PDF Instance
 * @param {Number} params.amount - Amount to space by
 *
 * @returns {void}
 */
PayeePDFHelpers.spacer = ({ pdf, amount }) => {
  pdf.y += amount;

  const endPage = 800;

  // Check if we need to add a new page
  if (pdf.y > endPage) {
    pdf.addPage();
  }
};

/**
 * Add a Line Divider
 *
 * @param {Object} params.pdf - PDF Instance
 * @returns {void}
 */
PayeePDFHelpers.addDivider = ({ pdf }) => {
  PayeePDFHelpers.spacer({ pdf, amount: lineHeight }); // TODO check if we need this

  PayeePDFHelpers.spacer({ pdf, amount: smallSpacer });

  pdf.lineWidth(1);
  pdf.moveTo(lineStart, pdf.y).lineTo(630, pdf.y).stroke();

  PayeePDFHelpers.spacer({ pdf, amount: smallSpacer });
};

/**
 * Add a Row to the PDF, with dividers, sub header and trailing numerical value
 * @param {Object} params.pdf - PDF Instance
 * @param {String} params.trailingHeader - Leading Header
 * @param {String} params.subHeader - Leading SubHeader
 * @param {Number} params.value - Trailing Value
 * @param {String} params.currency - Currency Code
 * @param {Boolean} params.showDivider - Show Divider
 *
 * @returns {void}
 */
PayeePDFHelpers.addRow = ({ pdf, trailingHeader, subHeader, value, currency, showDivider }) => {
  if (showDivider) PayeePDFHelpers.addDivider({ pdf });
  PayeePDFHelpers.spacer({ pdf, amount: mediumSpacer });

  // Leading Header
  pdf.fillColor(secondaryColor).fontSize(headerFontSize).font('H2').text(trailingHeader, 20, pdf.y);
  pdf.moveUp();

  // Leading SubHeader
  if (subHeader) {
    pdf.fillColor(secondaryColor).fontSize(14).font('Body').text(subHeader, lineStart, pdf.y);
    pdf.moveUp();
  }

  // Trailing Value
  if (!Number.isNaN(value)) {
    const valueFont = ['GBP', 'USD', 'EUR'].includes(currency) ? 'H2' : 'H2 Non Western Currencies';
    pdf.fillColor('black').fontSize(subHeaderFontSize).font(valueFont).text(PayeePDFHelpers.localiseNumber(value, 2, 2), 350, pdf.y, { width: 200, align: 'right' });
    pdf.moveUp();
  }

  PayeePDFHelpers.spacer({ pdf, amount: mediumSpacer });
};

/**
 * Adds Contract Row under a Contract Section with sub header and trailing numerical value
 * @param {Object} params.pdf - PDF Instance
 * @param {Object} params.contract - Contract Object
 *
 * @returns {void}
 */
PayeePDFHelpers.addContractRow = ({ pdf, contract }) => {
  pdf.fillColor('black').fontSize(bodyFontSize).font('Body').text(contract.name, lineStart, pdf.y, { width: 310 });
  PayeePDFHelpers.spacer({ pdf, amount: smallSpacer });

  const subText = contract.didPayeeBalanceConditionMet.reason ? contract.didPayeeBalanceConditionMet.reason : `Share @ ${contract.share}% (${contract.condition})`;
  pdf.fillColor(secondaryColor).fontSize(10).font('Body').text(subText, lineStart, pdf.y, { width: 310 });
  pdf.moveUp();

  const total = PayeePDFHelpers.localiseNumber(contract.total, 2, 2);
  pdf.fillColor(secondaryColor).fontSize(currencyFontSize).font('Currency').text(total, 350, pdf.y - 2, { width: 200, align: 'right' });

  PayeePDFHelpers.spacer({ pdf, amount: mediumSpacer });
};

/**
 * Adds a Contract Section to the PDF with a header, align header, contract transfers, payee, show totals and show excluded
 * @param {Object} params.pdf - PDF Instance
 * @param {String} params.header - Header for the Section
 * @param {Boolean} params.alignHeader - Align Header
 * @param {Array} params.contractTransfers - Array of Contract Transfers
 * @param {Object} params.payee - Payee Object
 * @param {Boolean} params.showTotals - Show Totals
 * @param {Boolean} params.showExcluded - Show Excluded, if true, we omit contracts from the current iteration that did not meet the condition
 *
 * @returns {void}
 */
PayeePDFHelpers.addContractSection = ({ pdf, header, alignHeader, contractTransfers, payee, showTotals, showExcluded }) => {
  // Contracts Header
  pdf.fillColor(secondaryColor).fontSize(headerFontSize).font('H2').text(header, 20, pdf.y);
  if (alignHeader) PayeePDFHelpers.spacer({ pdf, amount: 0 - lineHeight });

  // Contracts
  for (const contract of contractTransfers) {
    if (showExcluded && !contract.didPayeeBalanceConditionMet.included) {
      PayeePDFHelpers.addContractRow({ pdf, contract });
    }

    if (!showExcluded && contract.didPayeeBalanceConditionMet.included) {
      PayeePDFHelpers.addContractRow({ pdf, contract });
    }
  }

  PayeePDFHelpers.spacer({ pdf, amount: lineHeight });

  // Contract Totals
  if (showTotals) {
    const contractsTotal = contractTransfers.reduce((acc, contract) => acc + (contract.didPayeeBalanceConditionMet.included ? contract.total : 0), 0);
    pdf.fillColor('black').fontSize(subHeaderFontSize).font('H2').text('TOTAL', lineStart, pdf.y);
    pdf.moveUp();

    const valueFont = ['GBP', 'USD', 'EUR'].includes(payee.payeeBalanceCurrency) ? 'H2' : 'H2 Non Western Currencies';
    pdf.fillColor('black').fontSize(subHeaderFontSize).font(valueFont).text(PayeePDFHelpers.localiseNumber(contractsTotal, 2, 2), 350, pdf.y, { width: 200, align: 'right' });
  }
};

/**
 * Adds a Transactions Section to the PDF with a header, align header, other transactions and payee
 * @param {Object} params.pdf - PDF Instance
 * @param {Array} params.otherTransactions - Array of User Created Transactions
 * @param {Object} params.payee - Payee Object
 *
 * @returns {void}
 */
PayeePDFHelpers.addTransactionsSection = ({ pdf, otherTransactions, payee }) => {
  PayeePDFHelpers.addDivider({ pdf });

  PayeePDFHelpers.spacer({ pdf, amount: mediumSpacer });

  pdf.fillColor(secondaryColor).fontSize(headerFontSize).font('H2').text('TRANSACTIONS', 20, pdf.y);
  PayeePDFHelpers.spacer({ pdf, amount: 0 - lineHeight });

  for (const transaction of otherTransactions) {
    pdf.fillColor('black').fontSize(bodyFontSize).font('Body').text(transaction.name, lineStart, pdf.y, { width: 310 });
    PayeePDFHelpers.spacer({ pdf, amount: smallSpacer });

    pdf.moveUp();

    const total = PayeePDFHelpers.localiseNumber(transaction.amountInPayeeCurrency, 2, 2);
    pdf.fillColor(secondaryColor).fontSize(currencyFontSize).font('Currency').text(total, 350, pdf.y - 2, { width: 200, align: 'right' });

    PayeePDFHelpers.spacer({ pdf, amount: mediumSpacer });
  }

  PayeePDFHelpers.spacer({ pdf, amount: lineHeight });

  const transactionTotal = otherTransactions.reduce((acc, otherTransaction) => acc + (otherTransaction?.amountInPayeeCurrency || 0), 0);
  pdf.fillColor('black').fontSize(subHeaderFontSize).font('H2').text('TOTAL', lineStart, pdf.y);
  pdf.moveUp();

  const valueFont = ['GBP', 'USD', 'EUR'].includes(payee.payeeBalanceCurrency) ? 'H2' : 'H2 Non Western Currencies';
  pdf.fillColor('black').fontSize(subHeaderFontSize).font(valueFont).text(PayeePDFHelpers.localiseNumber(transactionTotal, 2, 2), 350, pdf.y, { width: 200, align: 'right' });
};

/**
 * Add a new page to the PDF
 *
 * @param {Object} params.pdf - PDF Instance
 *
 * @returns {void}
 */
PayeePDFHelpers.newPage = ({ pdf }) => {
  pdf.addPage();
  pdf.y = 30;
};

/**
 * Localise a number to the correct number of decimal places
 *
 * @param {Number} value - Value to localise
 * @param {Number} decimalPlaces - Number of decimal places
 * @param {Number} minDecimalPlaces - Minimum number of decimal places
 *
 * @returns {String} Localised Number
 */
PayeePDFHelpers.localiseNumber = function (value, decimalPlaces, minDecimalPlaces) {
  if (!value) { value = 0; }
  if (!decimalPlaces && decimalPlaces != 0) { decimalPlaces = 2; }
  return value.toLocaleString(undefined, { minimumFractionDigits: minDecimalPlaces || 0, maximumFractionDigits: decimalPlaces });
};

/**
 * Initialize the PDF
 *
 * @param {Object} params.filePath - File Path for the PDF
 * @returns {Object} PDF Instance and Write Stream
 */
PayeePDFHelpers.initPDF = ({ filePath }) => {
  // Create PDF
  const pdf = new PdfKit({ margin: margins, size: 'A4' });

  // Create Write Stream
  const writeStream = fs.createWriteStream(filePath);
  pdf.pipe(writeStream);

  // Assign Fonts
  pdf.registerFont('Neue', `${appRootDir}/assets/fonts/HelveticaNeue.ttf`);
  pdf.registerFont('Body', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
  pdf.registerFont('Condensed', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
  pdf.registerFont('H2', `${appRootDir}/assets/fonts/HelveticaNeueCondensedBold.ttf`);
  pdf.registerFont('Currency', `${appRootDir}/assets/fonts/texgyreheroscn-regular.otf`); // Used for body text with Currency Symbol or text that has special chars
  pdf.registerFont('H2 Non Western Currencies', `${appRootDir}/assets/fonts/texgyreheroscn-bold.otf`); // For Currency Symbols not supported by Helvetica Neue
  pdf.font('Condensed');

  return { pdf, writeStream };
};

module.exports = PayeePDFHelpers;
