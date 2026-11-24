const PdfKit = require('pdfkit');
const fs = require('fs');
const async = require('async');

const statement = function (params) {
  const thisStatement = this;
  // Initiate
  this.logo = params.logo;
  this.companyName = params.companyName;
  this.address = params.address;
  this.vatNo = params.vatNo;
  this.year = params.year;
  this.accountingPeriod = params.accountingPeriod;
  this.periodName = params.periodName;
  this.date = params.date;
  this.contractName = params.contractName;
  this.currencySymbol = params.currencySymbol ? params.currencySymbol : '';
  this.dateFormat = params.dateFormat && params.dateFormat === 'MM/dd/yyyy' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
  this.homeCurrency = params.homeCurrency;
  this.offsetColour = '#707070';
  if (params.offsetColour) { this.offsetColour = params.offsetColour; }
  this.contactEmail = params.contactEmail;
  this.customText = params.customText;
  this.payeeName = params.payeeName;
  this.payeeAddress = params.payeeAddress;
  this.payeeVatNo = params.payeeVatNo;
  this.payeeCountry = params.payeeCountry;
  this.grossAmount = params.grossAmount;
  this.netAmount = params.netAmount;
  this.grossCosts = params.grossCosts;
  this.netCosts = params.netCosts;
  this.taxText = params.selfBillingTaxText;
  this.taxAmount = params.feesInvoiceTaxAmount;
  this.taxRate = params.feesInvoiceTaxRate;
  this.feesInvoiceNo = params.feesInvoiceNo;
  this.removeFooterImage = params.removeFooterImage;
  this.runNo = params.runNo;
  this.customText = params.customText;
  this.multiCurrency = params.multiCurrency;
  this.exchangeRates = params.exchangeRates;
  this.suppressZeroTaxLine = params.suppressZeroTaxLine;
  this.customFeesInvoiceTitle = params.customFeesInvoiceTitle;

  // PDF Creation
  this.startPdf = function (filePath, margins) {
    thisStatement.location = filePath;
    this.pdf = new PdfKit({ margin: margins, size: 'A4' });
    this.writeStream = fs.createWriteStream(filePath);
    this.pdf.pipe(this.writeStream);
    return this.pdf;
  };
  this.closePdf = function (callback) {
    this.pdf.end();
    this.writeStream.on('finish', () => {
      callback(thisStatement.location);
    });
  };

  // Set Value as Curreny
  this.valueToCurrency = function (value, specificCurrencySymbol) {
    if (!value) { value = 0; }
    if (value > -0.005 && value < 0) { value = 0; } // ensure toLocaleString doesn't return -0.00 for negative numbers of greater than -0.005
    const currencySymbol = specificCurrencySymbol || this.currencySymbol;
    return `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Convert Currency
  this.convertCurrency = function (inputCurrency, outputCurrency, value) {
    if (!value) { value = 0; }
    let exchange = 0;
    this.exchangeRates.forEach((exchangeRate) => {
      if (exchangeRate.from === inputCurrency && exchangeRate.to === outputCurrency) {
        exchange = exchangeRate.rate;
      }
    });
    return value * exchange;
  };

  // Manage movements of page
  this.moveDown = function () {
    this.pdf.moveDown();
    if (this.pdf.y > 750) {
      this.pdf.addPage();
      this.pdf.y = 30;
    }
  };

  this.moveY = function (movement) {
    this.pdf.y += movement;
    if (this.pdf.y > 760) {
      this.pdf.addPage();
      this.pdf.y = 30;
    }
  };
};

module.exports = statement;
