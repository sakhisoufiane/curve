const fs = require('fs');
const async = require('async');

const statement = function (params) {
  const thisStatement = this;
  // Initiate
  this.db = params.db;
  this.salesTable = params.salesTable;
  this.costsTable = params.costsTable;
  this.dbFilter = params.filter;
  this.statementType = params.statementType;
  this.statementDesign = params.statementDesign;
  this.logo = params.logo;
  this.address = params.address;
  this.year = params.year;
  this.date = params.date;
  this.startDate = params.startDate;
  this.accountingPeriod = params.accountingPeriod;
  this.periodName = params.periodName;
  this.payeeName = params.payeeName;
  this.contractName = params.contractName;
  this.contractType = params.contractType;
  this.salesTerms = params.salesTerms;
  this.deductionsTerms = params.deductionsTerms;
  this.costsTerms = params.costsTerms;
  this.analysis = params.analysis;
  this.clientType = params.clientType;
  this.currencySymbol = params.currencySymbol ? params.currencySymbol : '';
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
  this.payments = params.payments;
  this.otherTransactions = params.otherTransactions;
  this.currentBalance = params.currentBalance;
  this.runNo = params.runNo;
  this.openingBalance = params.openingBalance;
  this.closingBalance = params.closingBalance;
  this.transactions = params.transactions;

  // Prepare Data for Analysis
  this.mapIncomes = function (incomes, callback) {
    if (incomes && incomes.length > 0) {
      const output = {};
      async.each(incomes, (income, cb) => {
        if (!output[income.distributionChannel]) { output[income.distributionChannel] = []; }
        output[income.distributionChannel].push({ type: income.configuration, value: income.value });
        cb();
      }, (err) => {
        thisStatement.configurationsByDistributionChannel = output;
        if (callback) { callback(); }
      });
    } else if (callback) { callback(); }
  };

  // Set Value as Curreny
  this.valueToCurrency = function (value) {
    if (!value) { value = 0; }
    if (value > -0.005 && value < 0) { value = 0; } // ensure toLocaleString doesn't return -0.00 for negative numbers of greater than -0.005
    return this.currencySymbol + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  this.valueToStructuredNumber = function (value, decimalPlaces, minDecimalPlaces) {
    if (!value) { value = 0; }
    if (!decimalPlaces && decimalPlaces != 0) { decimalPlaces = 2; }
    return value.toLocaleString(undefined, { minimumFractionDigits: minDecimalPlaces || 0, maximumFractionDigits: decimalPlaces });
  };
};

module.exports = statement;
