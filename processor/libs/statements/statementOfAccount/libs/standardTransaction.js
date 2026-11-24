const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const Statement = require('./transactionCreator');
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
    statement.layout((err) => {
      statement.closePdf((fileLocation) => {
        callback(fileLocation);
      });
    });
  };

  this.layout = function (callback) {
    async.waterfall([
      statement.setupPage,
      function (cb) {
        if (statement.statementHeaderType === 'Include Payee Address') {
          statement.headerPayeeAddress(cb);
        } else {
          statement.header(cb);
        }
      },
      statement.body,
      statement.footer,
    ], (err) => {
      callback(err);
    });
  };

  this.setupPage = function (callback) {
    statement.pdf.registerFont('Body', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    statement.pdf.registerFont('Neue', `${appRootDir}/assets/fonts/HelveticaNeue.ttf`);
    statement.pdf.registerFont('Condensed', `${appRootDir}/assets/fonts/RobotoCondensed-Regular.ttf`);
    statement.pdf.registerFont('H2', `${appRootDir}/assets/fonts/HelveticaNeueCondensedBold.ttf`);
    statement.pdf.registerFont('H2 Non Western Currencies', `${appRootDir}/assets/fonts/texgyreheroscn-bold.otf`); // For Currency Symbols not supported by Helvetica Neue
    statement.pdf.registerFont('Currency', `${appRootDir}/assets/fonts/texgyreheroscn-regular.otf`); // Used for body text with Currency Symbol or text that has special chars
    statement.pdf.font('Condensed');
    callback();
  };

  // Header
  this.header = function (callback) {
    statement.clientLogo();
    statement.clientAddress();
    statement.pageTitle();
    callback();
  };

  // Header With Payee Address
  this.headerPayeeAddress = function (callback) {
    this.payeeAddress();
    this.clientLogoPayeeAddress();
    this.clientAddress();
    this.pageTitle();
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

  this.clientLogoPayeeAddress = function () {
    try {
      if (this.logo) { this.pdf.image(this.logo, 250, 20, { height: 80 }); }
    } catch (err) {
      logger.error(err);
      logger.debug(statement.logo);
    }
  };

  this.clientAddress = function () {
    statement.pdf.fillColor(statement.offsetColour).fontSize(12).text(statement.companyName, 180, 25, { width: 400, align: 'right' });
    this.pdf.fillColor(statement.offsetColour).fontSize(12).text(this.address, 180, 40, { width: 400, align: 'right' });
  };

  this.payeeAddress = function () {
    const territoryMappings = {
      WW: 'World', Europe: 'All Europe', Africa: 'All Africa', Asia: 'All Asia', Americas: 'All Americas', Oceania: 'All Oceania', DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: 'Cote d\'Ivoire', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: 'Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CW: 'Curacao', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthelemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Suriname', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Aland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa',
    };

    this.pdf.fillColor(statement.offsetColour).fontSize(12).text(params.payeeName, 20, 25, { width: 300, align: 'left' });
    this.pdf.fillColor(statement.offsetColour).fontSize(12).text(params.payeeAddress, 20, statement.pdf.y, { width: 300, align: 'left' });
    if (params.payeeCountry) {
      statement.pdf.fillColor(statement.offsetColour).fontSize(12).text(territoryMappings[params.payeeCountry], 20, statement.pdf.y, { width: 300 });
    }
  };

  this.pageTitle = function () {
    statement.pdf.fillColor(statement.offsetColour).fontSize(28).font('H2').text('STATEMENT OF ACCOUNT', 80, 130, { width: 300, align: 'right' });
    logger.debug(moment(this.date).format(statement.dateFormat));
    statement.pdf.fillColor('black').fontSize(18).font('Condensed').text(moment(this.date).format(statement.dateFormat), 75, 164, { width: 300, align: 'right' });

    statement.pdf.fillColor('black').fontSize(18).font('Condensed').text(this.contractName, 380, 164, { width: 200, align: 'right' });
    statement.moveY(10);
    statement.pdf.lineWidth(1);
    statement.pdf.moveTo(110, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.moveY(10);
  };

  // Body
  this.body = function (callback) {
    statement.openingBalanceRow(statement.openingBalance);
    const statementDate = new Date(statement.date);
    statementDate.setDate(statementDate.getDate() + 1);
    statementDate.setUTCHours(0, 0, 0, 0);
    async.eachSeries(statement.transactions, (transaction, cb) => {
      if (transaction.date <= statementDate) {
        statement.transactionRow(transaction, cb);
      } else {
        cb();
      }
    }, () => {
      statement.closingBalanceRow(callback);
    });
  };

  this.openingBalanceRow = function (openingBalance) {
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('DATE', 30, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('DESCRIPTION', 120, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('AMOUNT', 250, statement.pdf.y, { width: 200, align: 'right' });
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('BALANCE', 370, statement.pdf.y, { width: 200, align: 'right' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text('Opening Balance', 120, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(openingBalance), 370, statement.pdf.y - 2, { width: 200, align: 'right' });
    statement.moveY(2);
  };

  this.transactionRow = function (transaction, callback) {
    const transactionNameFont = StatementUtils.containsSpecialChars(transaction.name) ? 'Currency' : 'Body';
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font(transactionNameFont).text(moment(transaction.date).format(statement.dateFormat), 30, statement.pdf.y);
    statement.pdf.moveUp();
    const startingY = statement.pdf.y;
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font(transactionNameFont).text(transaction.name, 120, statement.pdf.y, { width: 280 });
    const bottomY = statement.pdf.y;
    statement.pdf.y = startingY;
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(transaction.amount), 250, statement.pdf.y - 2, { width: 200, align: 'right' });
    statement.pdf.moveUp();
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(statement.valueToCurrency(transaction.balance), 370, statement.pdf.y, { width: 200, align: 'right' });
    statement.pdf.y = bottomY;
    statement.moveY(2);
    callback();
  };

  this.closingBalanceRow = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 1.25);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('CLOSING BALANCE', 20, statement.pdf.y);
    statement.pdf.moveUp();
    const valueFont = ['GBP', 'USD', 'EUR'].includes(statement.homeCurrency) ? 'H2' : 'H2 Non Western Currencies';
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font(valueFont).text(statement.valueToCurrency(statement.closingBalance), 370, statement.pdf.y, { width: 200, align: 'right' });
    if (statement.homeCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 370, statement.pdf.y, { width: 200, align: 'right' }); }
    callback();
  };

  // Footer
  this.footer = function (callback) {
    if (statement.customText && statement.customText !== '') {
      statement.moveY(30);
      statement.customText.split('\n').forEach((customTextElement) => {
        statement.pdf.fillColor(statement.offsetColour).fontSize(12.5).font('Currency').text(customTextElement, 70, statement.pdf.y, { width: 450, align: 'center' });
        statement.moveY(6);
      });
    }
    if (params.autoPayment && !params.autoPayment.triggerAutoPayment) {
      if (params.autoPayment.reason === 'Threshold Not Met') {
        statement.moveY(12);
        const text = 'The closing amount on this statement will not be paid this period, as it falls below the minimum payment threshold';
        statement.pdf.fillColor(statement.offsetColour).fontSize(12.5).font('Currency').text(text, 70, statement.pdf.y - 2, { width: 450, align: 'center' });
        statement.moveY(12);
      } else if (params.autoPayment.reason === 'Conditions Not Met') {
        statement.moveY(12);
        const text = 'The closing amount on this statement will not be paid this period due to the requirement of other contracts needing to be recouped before payment is made';
        statement.pdf.fillColor(statement.offsetColour).fontSize(12.5).font('Currency').text(text, 70, statement.pdf.y - 2, { width: 450, align: 'center' });
        statement.moveY(12);
      }
    }
    if (statement.contactEmail && statement.contactEmail !== '') { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`Any questions, please contact ${statement.contactEmail}`, 145, 760, { width: 300, align: 'center' }); }
    if (!statement.removeFooterImage) { statement.pdf.image(`${appRootDir}/assets/images/Produced-By-Logo.jpg`, 270, 800, { height: 30 }); }
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(`Run No: ${statement.runNo}`, 280, 800, { width: 300, align: 'right' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(moment().format(`${statement.dateFormat} HH:mm:SS`), 280, 810, { width: 300, align: 'right' });
    callback();
  };
};

module.exports = Standard;
