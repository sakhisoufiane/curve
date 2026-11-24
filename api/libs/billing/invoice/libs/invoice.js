const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const Invoice = require('./invoiceCreator');

const Standard = function (params) {
  Invoice.call(this, params);
  const invoice = this;

  // Set Font Heights
  this.headerFontSize = 18;
  this.subHeaderFontSize = 13;
  this.bodyFontSize = 12;
  this.currencyFontSize = 13;

  this.create = function (filePath, callback) {
    invoice.startPdf(filePath, 10);
    invoice.layout(() => {
      invoice.closePdf((err, fileLocation) => {
        callback(err, fileLocation);
      });
    });
  };

  this.layout = function (callback) {
    async.waterfall([
      invoice.setupPage,
      invoice.header,
      invoice.body,
    ], () => {
      callback();
    });
  };

  this.setupPage = function (callback) {
    invoice.pdf.registerFont('Body', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    invoice.pdf.registerFont('Neue', `${appRootDir}/assets/fonts/HelveticaNeue.ttf`);
    invoice.pdf.registerFont('Condensed', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    invoice.pdf.registerFont('H2', `${appRootDir}/assets/fonts/HelveticaNeueCondensedBold.ttf`);
    invoice.pdf.registerFont('Currency', `${appRootDir}/assets/fonts/texgyreheroscn-regular.otf`);
    invoice.pdf.font('Condensed');
    callback();
  };

  // Header
  this.header = function (callback) {
    invoice.curveLogo();
    invoice.pageTitle();
    invoice.clientAddress();
    invoice.displayPayeeAddress();
    invoice.dividingLine();
    callback();
  };

  this.curveLogo = function () {
    try {
      invoice.pdf.image('assets/images/Curve-Logo-Light-Blue.png', 20, 20, { height: 80 });
    } catch (err) {
      logger.error(err);
    }
  };

  this.displayPayeeAddress = function () {
    // Text
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('H2').text('Billed From:', 20, 170, { width: 200 });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text('Curve Royalty Systems', 20, invoice.pdf.y, { width: 200 });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).text('7 Bell Yard', 20, invoice.pdf.y, { width: 200 });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).text('London', 20, invoice.pdf.y, { width: 200 });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).text('WC2A 2JR', 20, invoice.pdf.y, { width: 200 });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).text('United Kingdom', 20, invoice.pdf.y, { width: 200 });
    invoice.pdf.y += 10;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).text(invoice.payeeVatNo, 20, invoice.pdf.y);
  };

  this.clientAddress = function () {
    const territoryMappings = {
      WW: 'World', Europe: 'All Europe', Africa: 'All Africa', Asia: 'All Asia', Americas: 'All Americas', Oceania: 'All Oceania', DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: 'Cote d\'Ivoire', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: 'Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CW: 'Curacao', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthelemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Suriname', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Aland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa',
    };
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('H2').text('Billed To:', 380, 170, { width: 200, align: 'right' });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text(invoice.billingInfo.companyName, 380, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text(`${invoice.billingInfo.address1}`, 380, invoice.pdf.y, { width: 200, align: 'right' });
    if (invoice.billingInfo.address2) { invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text(`${invoice.billingInfo.address2}`, 380, invoice.pdf.y, { width: 200, align: 'right' }); }
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text(`${invoice.billingInfo.city}`, 380, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text(`${invoice.billingInfo.postcode}`, 380, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).font('Body').text(`${territoryMappings[invoice.billingInfo.country]}`, 380, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.y += 10;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(15).text(invoice.billingInfo.vatNo, 380, invoice.pdf.y, { width: 200, align: 'right' });
  };

  this.pageTitle = function () {
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(28).font('H2').text('INVOICE', 80, 30, { width: 500, align: 'right' });
    invoice.pdf.fillColor('black').fontSize(18).font('Condensed').text(moment().format(invoice.dateFormat), 75, 62, { width: 505, align: 'right' });
    invoice.pdf.y += 10;
  };

  this.dividingLine = function () {
    invoice.pdf.y = 360;
    invoice.pdf.lineWidth(1);
    invoice.pdf.moveTo(110, invoice.pdf.y).lineTo(630, invoice.pdf.y).stroke();
    invoice.pdf.y += 10;
  };

  // Body
  this.body = function (callback) {
    async.waterfall([
      function (cb) { invoice.headersRow(cb); },
      function (cb) {
        invoice.transactionRow({ name: `Curve Usage - ${invoice.usage.contracts} Contracts, ${invoice.usage.catalogue} Catalogue Items`, amount: invoice.usage.amount }, cb);
      },
      function (cb) { invoice.pdf.y += 10; cb(); },
      function (cb) {
        if (invoice.usage.vat === 0) {
          invoice.taxRow({ name: 'VAT (0%) ', amount: 0 }, cb);
        } else {
          invoice.taxRow({ name: 'VAT (20%) ', amount: invoice.usage.vat }, cb);
        }
      },
      function (cb) { invoice.closingBalanceRow(cb); },
    ], callback);
  };

  this.headersRow = function (callback) {
    invoice.pdf.fillColor('black').fontSize(invoice.subHeaderFontSize).font('H2').text('DESCRIPTION', 120, invoice.pdf.y);
    invoice.pdf.moveUp();
    invoice.pdf.fillColor('black').fontSize(invoice.subHeaderFontSize).font('H2').text('AMOUNT', 370, invoice.pdf.y, { width: 200, align: 'right' });
    callback();
  };

  this.transactionRow = function (transaction, callback) {
    const currencyMapping = { GBP: '£', USD: '$', EUR: '€' };
    if (transaction.date) {
      invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.bodyFontSize).font('Body').text(moment(transaction.date).format(invoice.dateFormat), 30, invoice.pdf.y);
      invoice.pdf.moveUp();
    }
    const startingY = invoice.pdf.y;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.bodyFontSize).font('Body').text(transaction.name, 120, invoice.pdf.y, { width: 270 });
    const bottomY = invoice.pdf.y;
    invoice.pdf.y = startingY - 2;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.currencyFontSize).font('Currency').text(`${invoice.billingInfo.currency ? currencyMapping[invoice.billingInfo.currency] : currencyMapping.GBP}${invoice.valueToCurrency(transaction.amount)}`, 370, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.y = bottomY;
    invoice.pdf.y += 2;
    callback();
  };

  this.taxRow = function (transaction, callback) {
    const currencyMapping = { GBP: '£', USD: '$', EUR: '€' };
    const startingY = invoice.pdf.y - 2;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.bodyFontSize).font('Body').text(transaction.name, 280, invoice.pdf.y, { width: 220, align: 'right' });
    const bottomY = invoice.pdf.y;
    invoice.pdf.y = startingY;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.currencyFontSize).font('Currency').text(`${invoice.billingInfo.currency ? currencyMapping[invoice.billingInfo.currency] : currencyMapping.GBP}${invoice.valueToCurrency(transaction.amount)}`, 370, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.y = bottomY;
    invoice.pdf.y += 2;
    callback();
  };

  this.closingBalanceRow = function (callback) {
    const currencyMapping = { GBP: '£', USD: '$', EUR: '€' };
    invoice.pdf.y += 30;
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.headerFontSize).font('H2').text('INVOICE AMOUNT', 120, invoice.pdf.y);
    invoice.pdf.moveUp();
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(invoice.headerFontSize).font('H2').text(`${invoice.billingInfo.currency ? currencyMapping[invoice.billingInfo.currency] : currencyMapping.GBP}${invoice.valueToCurrency(invoice.usage.amount + invoice.usage.vat)}`, 370, invoice.pdf.y, { width: 200, align: 'right' });
    invoice.pdf.fillColor(invoice.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${invoice.billingInfo.currency ? invoice.billingInfo.currency : 'GBP'}`, 370, invoice.pdf.y, { width: 200, align: 'right' });
    callback();
  };
};

module.exports = Standard;
