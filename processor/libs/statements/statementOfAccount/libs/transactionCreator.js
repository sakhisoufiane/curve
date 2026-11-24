const PdfKit = require('pdfkit');
const fs = require('fs');
const async = require('async');

const statement = function (params) {
  const thisStatement = this;
  // Initiate
  this.logo = params.logo;
  this.companyName = params.companyName;
  this.address = params.address;
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
  this.transactions = params.transactions;
  this.openingBalance = params.openingBalance;
  this.closingBalance = params.closingBalance;
  this.removeFooterImage = params.removeFooterImage;
  this.runNo = params.runNo;
  this.statementHeaderType = params.statementHeaderType;
  this.payeeName = params.payeeName;
  this.payeeAddress = params.payeeAddress;
  this.payeeCountry = params.payeeCountry;
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

  // Set Value as Curreny
  this.valueToCurrency = function (value) {
    if (!value) { value = 0; }
    if (value > -0.005 && value < 0) { value = 0; } // ensure toLocaleString doesn't return -0.00 for negative numbers of greater than -0.005
    return this.currencySymbol + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
