const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const Statement = require('./selfBillingCreator');
const StatementUtils = require('../../statementUtils');

const Standard = function (params) {
  Statement.call(this, params);
  const statement = this;

  // Set Font Heights
  this.headerFontSize = 18;
  this.subHeaderFontSize = 13;
  this.bodyFontSize = 12;
  this.currencyFontSize = 13;

  this.create = function (filePath, callback) {
    statement.startPdf(filePath, 10);
    statement.layout(() => {
      statement.closePdf((fileLocation) => {
        callback(fileLocation);
      });
    });
  };

  this.layout = function (callback) {
    async.waterfall([
      statement.setupPage,
      statement.header,
      statement.body,
      statement.footer,
    ], () => {
      callback();
    });
  };

  this.setupPage = function (callback) {
    statement.pdf.registerFont('Body', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    statement.pdf.registerFont('Neue', `${appRootDir}/assets/fonts/HelveticaNeue.ttf`);
    statement.pdf.registerFont('Condensed', `${appRootDir}/assets/fonts/RobotoCondensed-Regular.ttf`);
    statement.pdf.registerFont('H2', `${appRootDir}/assets/fonts/HelveticaNeueCondensedBold.ttf`);
    statement.pdf.registerFont('H2 Non Western Currencies', `${appRootDir}/assets/fonts/texgyreheroscn-bold.otf`); // For Currency Symbols not supported by Helvetica Neue
    statement.pdf.registerFont('Currency', `${appRootDir}/assets/fonts/texgyreheroscn-regular.otf`);
    statement.pdf.font('Condensed');
    callback();
  };

  // Header
  this.header = function (callback) {
    statement.clientLogo();
    statement.pageTitle();
    statement.clientAddress();
    statement.displayPayeeAddress();
    statement.dividingLine();
    callback();
  };

  this.clientLogo = function () {
    if (statement.logo) {
      try {
        statement.pdf.image(statement.logo, 20, 20, { height: 80 });
      } catch (err) {
        logger.error(err);
        logger.debug(statement.logo);
      }
    }
  };

  this.displayPayeeAddress = function () {
    // Setup territory currencyMappings
    const territoryMappings = {
      WW: 'World', Europe: 'All Europe', Africa: 'All Africa', Asia: 'All Asia', Americas: 'All Americas', Oceania: 'All Oceania', DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: 'Cote d\'Ivoire', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: 'Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CW: 'Curacao', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthelemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Suriname', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Aland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa',
    };
    // Text
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).font('H2').text('Billed From:', 20, 170, { width: 200 });
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).font('Body').text(statement.payeeName, 20, statement.pdf.y, { width: 200 });
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).text(statement.payeeAddress, 20, statement.pdf.y, { width: 200 });
    if (statement.payeeCountry) {
      statement.pdf.fillColor(statement.offsetColour).fontSize(15).text(territoryMappings[statement.payeeCountry], 20, statement.pdf.y, { width: 200 });
    }
    statement.pdf.y += 10;
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).text(statement.payeeVatNo, 20, statement.pdf.y);
  };

  this.clientAddress = function () {
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).font('H2').text('Billed To:', 380, 170, { width: 200, align: 'right' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).font('Body').text(statement.companyName, 380, statement.pdf.y, { width: 200, align: 'right' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).font('Body').text(statement.address, 380, statement.pdf.y, { width: 200, align: 'right' });
    statement.pdf.y += 10;
    statement.pdf.fillColor(statement.offsetColour).fontSize(15).text(statement.vatNo, 380, statement.pdf.y, { width: 200, align: 'right' });
  };

  this.pageTitle = function () {
    statement.pdf.fillColor(statement.offsetColour).fontSize(28).font('H2').text('SELF BILLING INVOICE', 80, 30, { width: 500, align: 'right' });
    statement.pdf.fillColor('black').fontSize(18).font('Condensed').text(moment(this.date).format(statement.dateFormat), 75, 62, { width: 505, align: 'right' });
    statement.pdf.fillColor('black').fontSize(18).font('Condensed').text(`Invoice No: SBINV${this.selfBillingInvoiceNo}`, 75, 86, { width: 505, align: 'right' });
    statement.pdf.fillColor('black').fontSize(18).font('Condensed').text(`Contract: ${this.contractName}`, 75, 112, { width: 505, align: 'right' });
    statement.pdf.y += 10;
  };

  this.dividingLine = function () {
    statement.pdf.y = 360;
    statement.pdf.lineWidth(1);
    statement.pdf.moveTo(110, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.pdf.y += 10;
  };

  // Body
  this.body = function (callback) {
    async.waterfall([
      function (cb) { statement.headersRow(cb); },
      function (cb) {
        if (statement.clientType === 'Distributor') {
          statement.transactionRow({ name: `${statement.periodName} Total Income`, amount: statement.grossAmount }, cb);
        } else {
          statement.transactionRow({ name: `${statement.periodName} Royalties`, amount: statement.closingBalance }, cb);
        }
      },
      function (cb) { statement.pdf.y += 10; cb(); },
      function (cb) {
        if (!statement.withholdingTaxAmount) { statement.withholdingTaxAmount = 0; }
        statement.withholdingRow(cb);
      },
      function (cb) {
        if (statement.suppressZeroTaxLine && (!statement.taxRate || statement.taxRate === 0 || statement.taxRate === '0')) {
          cb();
        } else if (statement.taxRate || statement.taxRate === 0 || statement.taxRate === '0') {
          const taxText = statement.taxText ? statement.taxText : 'Tax';
          statement.taxRow({ name: `${taxText} (${statement.taxRate}%) `, amount: statement.taxAmount }, cb);
        } else {
          cb();
        }
      },
      function (cb) { statement.closingBalanceRow(cb); },
    ], callback);
  };

  this.headersRow = function (callback) {
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('DESCRIPTION', 120, statement.pdf.y);
    if (statement.multiCurrency) {
      statement.pdf.moveUp();
      statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('AMOUNT (GBP)', 240, statement.pdf.y, { width: 200, align: 'right' });
      statement.pdf.moveUp();
      statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('AMOUNT (EUR)', 370, statement.pdf.y, { width: 200, align: 'right' });
    } else {
      statement.pdf.moveUp();
      statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('AMOUNT', 370, statement.pdf.y, { width: 200, align: 'right' });
    }
    callback();
  };

  this.transactionRow = function (transaction, callback) {
    if (transaction.date) {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(moment(transaction.date).format(statement.dateFormat), 30, statement.pdf.y);
      statement.pdf.moveUp();
    }
    const startingY = statement.pdf.y;
    const transactionNameFont = StatementUtils.containsSpecialChars(transaction.name) ? 'Currency' : 'Body';
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font(transactionNameFont).text(transaction.name, 120, statement.pdf.y, { width: 270 });
    const bottomY = statement.pdf.y;
    statement.pdf.y = startingY - 2;
    if (statement.multiCurrency) {
      const amountInPounds = statement.convertCurrency('Home Currency', 'GBP', transaction.amount);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(amountInPounds, '£'), 240, statement.pdf.y, { width: 200, align: 'right' });
      statement.pdf.moveUp();
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(transaction.amount), 370, statement.pdf.y, { width: 200, align: 'right' });
    } else {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(transaction.amount), 370, statement.pdf.y, { width: 200, align: 'right' });
    }
    statement.pdf.y = bottomY;
    statement.pdf.y += 2;
    callback();
  };

  this.taxRow = function (transaction, callback) {
    const startingY = statement.pdf.y - 2;
    const xPosition = statement.multiCurrency ? 120 : 280;
    const align = statement.multiCurrency ? 'left' : 'right';
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(transaction.name, xPosition, statement.pdf.y, { width: 220, align });
    const bottomY = statement.pdf.y;
    statement.pdf.y = startingY;
    if (statement.multiCurrency) {
      const amountInPounds = statement.convertCurrency('Home Currency', 'GBP', transaction.amount);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(amountInPounds, '£'), 240, statement.pdf.y, { width: 200, align: 'right' });
      statement.pdf.moveUp();
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(transaction.amount), 370, statement.pdf.y, { width: 200, align: 'right' });
    } else {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(transaction.amount), 370, statement.pdf.y, { width: 200, align: 'right' });
    }
    statement.pdf.y = bottomY;
    statement.pdf.y += 2;
    callback();
  };

  this.withholdingRow = function (callback) {
    if (statement.withholdingTaxAmount) {
      const startingY = statement.pdf.y;
      let label = (statement.withholdingTaxWording && statement.withholdingTaxWording !== '') ? statement.withholdingTaxWording : 'Withholding Tax';
      if (statement.withholdingTaxRate) { label += ` (${statement.withholdingTaxRate}%)`; }
      const withholdingTaxLabelFont = StatementUtils.containsSpecialChars(label) ? 'Currency' : 'Body';
      const yPosition = statement.multiCurrency ? 120 : 280;
      const align = statement.multiCurrency ? 'left' : 'right';
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font(withholdingTaxLabelFont).text(label, yPosition, statement.pdf.y, { width: 220, align });
      const bottomY = statement.pdf.y;
      statement.pdf.y = startingY;
      if (statement.multiCurrency) {
        const amountInPounds = statement.convertCurrency('Home Currency', 'GBP', statement.withholdingTaxAmount);
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(amountInPounds, '£'), 240, statement.pdf.y, { width: 200, align: 'right' });
        statement.pdf.moveUp();
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(statement.withholdingTaxAmount), 370, statement.pdf.y, { width: 200, align: 'right' });
      } else {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(statement.withholdingTaxAmount), 370, statement.pdf.y, { width: 200, align: 'right' });
      }
      statement.pdf.y = bottomY;
      statement.pdf.y += 2;
    }
    callback();
  };

  this.closingBalanceRow = function (callback) {
    statement.pdf.y += 30;
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('INVOICE AMOUNT', 120, statement.pdf.y);
    statement.pdf.moveUp();
    const valueFont = ['GBP', 'USD', 'EUR'].includes(statement.homeCurrency) ? 'H2' : 'H2 Non Western Currencies';
    if (statement.multiCurrency) {
      const amountInPounds = statement.convertCurrency('Home Currency', 'GBP', statement.closingBalance + statement.withholdingTaxAmount + statement.taxAmount);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font(valueFont).text(statement.valueToCurrency(amountInPounds, '£'), 240, statement.pdf.y, { width: 200, align: 'right' });
      statement.pdf.moveUp();
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font(valueFont).text(statement.valueToCurrency(statement.closingBalance + statement.withholdingTaxAmount + statement.taxAmount), 370, statement.pdf.y, { width: 200, align: 'right' });
    } else {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font(valueFont).text(statement.valueToCurrency(statement.closingBalance + statement.withholdingTaxAmount + statement.taxAmount), 370, statement.pdf.y, { width: 200, align: 'right' });
    }
    if (statement.homeCurrency && !statement.multiCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 370, statement.pdf.y, { width: 200, align: 'right' }); }
    callback();
  };

  // Footer
  this.footer = function (callback) {
    statement.pdf.y += 30;
    if (statement.customText && statement.customText !== '') {
      statement.customText.split('\n').forEach((customTextElement) => {
        statement.pdf.fillColor(statement.offsetColour).fontSize(12.5).font('Currency').text(customTextElement, 95, statement.pdf.y, { width: 400, align: 'center' });
        statement.moveY(6);
      });
    }
    if (statement.contactEmail && statement.contactEmail !== '') { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`Any questions, please contact ${statement.contactEmail}`, 145, 760, { width: 300, align: 'center' }); }
    if (!statement.removeFooterImage) { statement.pdf.image(`${appRootDir}/assets/images/Produced-By-Logo.jpg`, 270, 800, { height: 30 }); }
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(`Run No: ${statement.runNo}`, 280, 800, { width: 300, align: 'right' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(moment().format(`${statement.dateFormat} HH:mm:SS`), 280, 810, { width: 300, align: 'right' });
    callback();
  };
};

module.exports = Standard;
