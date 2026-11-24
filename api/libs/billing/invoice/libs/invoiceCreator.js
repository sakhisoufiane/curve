const PdfKit = require('pdfkit');
const fs = require('fs');

const statement = function (params) {
  const thisStatement = this;
  // Initiate
  this.dateFormat = params.dateFormat && params.dateFormat === 'MM/dd/yyyy' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
  this.offsetColour = '#707070';
  this.billingInfo = params.billingInfo;
  this.usage = params.usage;
  // PDF Creation
  this.startPdf = function (filePath, margins) {
    thisStatement.location = filePath;
    this.pdf = new PdfKit({ margin: margins, size: 'A4' });
    this.writeStream = fs.createWriteStream(filePath);
    this.pdf.pipe(this.writeStream);
    return this.pdf;
  };
  this.closePdf = function (callback) {
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      callback(err, err ? undefined : thisStatement.location);
    };
    this.pdf.end();
    this.writeStream.on('finish', () => finish(null));
    this.writeStream.on('error', finish);
  };

  // Set Value as Curreny
  this.valueToCurrency = function (value) {
    if (!value) { value = 0; }
    if (value > -0.005 && value < 0) { value = 0; } // ensure toLocaleString doesn't return -0.00 for negative numbers of greater than -0.005
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
