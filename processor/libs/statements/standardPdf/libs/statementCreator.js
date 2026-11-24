const PdfKit = require('pdfkit');
const fs = require('fs');
const async = require('async');

const statement = function (params) {
  const thisStatement = this;
  // Initiate
  this.periodType = params.periodType;
  this.db = params.db;
  this.salesTable = params.salesTable;
  this.costsTable = params.costsTable;
  this.dbFilter = params.filter;
  this.statementType = params.statementType;
  this.statementDesign = params.statementDesign;
  this.logo = params.logo;
  this.companyName = params.companyName;
  this.address = params.address;
  this.year = params.year;
  this.date = params.date;
  this.startDate = params.startDate;
  this.accountingPeriod = params.accountingPeriod;
  this.periodName = params.periodName;
  this.contractName = params.contractName;
  this.contractType = params.contractType;
  this.analysis = params.analysis;
  this.clientType = params.clientType;
  this.suppressZeroValue = params.suppressZeroValue;
  this.currencySymbol = params.currencySymbol ? params.currencySymbol : '';
  this.dateFormat = params.dateFormat && params.dateFormat === 'MM/dd/yyyy' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
  this.homeCurrency = params.homeCurrency;
  this.grossAmount = params.grossAmount;
  this.netAmount = params.netAmount;
  this.grossCosts = params.grossCosts;
  this.netCosts = params.netCosts;
  this.netOutput = params.netOutput;
  this.reservesWithheld = params.reservesWithheld;
  this.reservesReleased = params.reservesReleased;
  this.offsetColour = '#707070';
  if (params.offsetColour) { this.offsetColour = params.offsetColour; }
  this.contactEmail = params.contactEmail;
  this.customText = params.customText;
  this.removeFooterImage = params.removeFooterImage;
  this.contractType = params.contractType;
  this.profitShareRate = params.profitShareRate;
  this.profitShareBalance = params.profitShareBalance;
  this.profitShareNetAmount = params.profitShareNetAmount;
  this.profitShareUnrecoupedAdvanceStart = params.profitShareUnrecoupedAdvanceStart;
  this.profitShareAdvanceRecouped = params.profitShareAdvanceRecouped;
  this.proRataGrossAmount = params.proRataGrossAmount;
  this.feesInvoiceTaxAmount = params.feesInvoiceTaxAmount;
  this.payments = params.payments;
  this.otherTransactions = params.otherTransactions;
  this.currentBalance = params.currentBalance;
  this.runNo = params.runNo;
  this.openingBalance = params.openingBalance;
  this.closingBalance = params.closingBalance;
  this.transactionalClosingBalance = params.transactionalClosingBalance;
  this.transactions = params.transactions;
  this.salesData = params.salesData;
  this.salesTemplate = params.salesTemplate;
  this.costsTemplate = params.costsTemplate;
  this.bigQuery = params.bigQuery;
  this.salesTerms = params.salesTerms;
  this.statementHeaderType = params.statementHeaderType;
  this.payeeName = params.payeeName;
  this.payeeAddress = params.payeeAddress;
  this.payeeCountry = params.payeeCountry;
  this.withholdingTax = params.withholdingTax;
  this.totalTransactions = 0;
  this.deductionAmount = params.deductionAmount;
  this.displaySeparatedDeductions = params.displaySeparatedDeductions;
  this.customDeductionName = params.customDeductionName;
  this.inTrial = params.inTrial;

  // PDF Creation
  this.startPdf = function (filePath, margins) {
    thisStatement.location = filePath;
    this.pdf = new PdfKit({ margin: margins, size: 'A4' });
    this.writeStream = fs.createWriteStream(filePath);
    this.pdf.pipe(this.writeStream);
    this.addInTrialWaterMark();
    return this.pdf;
  };
  this.closePdf = function (callback) {
    this.pdf.end();
    this.writeStream.on('finish', () => {
      callback(thisStatement.location);
    });
  };

  // Prepare Data for Analysis
  this.mapIncomes = function (incomes, callback) {
    if (incomes && incomes.length > 0) {
      const output = {};
      async.each(incomes, (income, cb) => {
        if (!output[income.distributionChannel]) { output[income.distributionChannel] = []; }
        if (this.clientType === 'Distributor' || this.statementDesign === 'Distribution') {
          output[income.distributionChannel].push({ type: income.configuration, value: income.proRataGrossAmount });
        } else {
          output[income.distributionChannel].push({ type: income.configuration, value: income.value, deduction: income.deduction });
        }
        cb();
      }, (err) => {
        thisStatement.configurationsByDistributionChannel = output;
        if (callback) { callback(); }
      });
    } else if (callback) { callback(); }
  };

  // Set Value as Curreny
  this.valueToCurrency = function (value, negative) {
    if (!value) { value = 0; }
    if (value > -0.005 && value < 0) { value = 0; } // ensure toLocaleString doesn't return -0.00 for negative numbers of greater than -0.005
    let result = this.currencySymbol + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (negative) { result = `- ${result}`; }
    return result;
  };

  this.valueToStructuredNumber = function (value, decimalPlaces, minDecimalPlaces) {
    if (!value) { value = 0; }
    if (!decimalPlaces && decimalPlaces != 0) { decimalPlaces = 2; }
    return value.toLocaleString(undefined, { minimumFractionDigits: minDecimalPlaces || 0, maximumFractionDigits: decimalPlaces });
  };

  // Manage movements of page
  this.moveDown = function () {
    this.pdf.moveDown();
    if (this.pdf.y > 750) {
      this.pdf.addPage();
      this.addInTrialWaterMark();
      this.pdf.y = 30;
    }
  };

  this.moveY = function (movement) {
    this.pdf.y += movement;
    if (this.pdf.y > 760) {
      this.pdf.addPage();
      this.addInTrialWaterMark();
      this.pdf.y = 30;
    }
  };

  this.addInTrialWaterMark = function () {
    if (this.inTrial) {
      this.pdf.rotate(-45);
      this.pdf.fillOpacity(0.2);
      this.pdf.fillColor('black').fontSize(72).text('Free Trial', -200, 450);
      this.pdf.fillOpacity(1);
      this.pdf.rotate(45);
    }
  };
};

module.exports = statement;
