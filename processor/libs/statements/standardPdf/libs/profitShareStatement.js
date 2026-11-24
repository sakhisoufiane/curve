const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const Statement = require('./statementCreator');
const collectData = require('../../../writeCsv/collectData');
const StatementUtils = require('../../statementUtils');

const Standard = function (params) {
  // Set params to object
  Statement.call(this, params);
  const statement = this;

  // Set Font Heights
  this.headerFontSize = 18;
  this.subHeaderFontSize = 13;
  this.bodyFontSize = 11;
  this.currencyFontSize = 13;

  if (this.clientType === 'Distributor') {
    this.mapIncomes(this.analysis.gross.configurationByDistributionChannel);
  } else {
    this.mapIncomes(this.analysis.net.configurationByDistributionChannel);
  }

  this.create = function (filePath, callback) {
    const standardStatement = this;
    async.waterfall([
      function (cb) {
        standardStatement.startPdf(filePath, 10);
        standardStatement.layout();
        cb();
      },
      function (cb) {
        // Remove any zero values in sales data
        if (standardStatement.suppressZeroValue && standardStatement.salesData) {
          // Remove any 0 value lines
          standardStatement.salesData = standardStatement.salesData.map((line) => { if (line.contractCurrencyCalculationOutput !== 0) { return line; } }).filter(Boolean);
        }
        if (standardStatement.statementDesign.includes('Catalogue Summary')) {
          // Create Second Page of Highlights
          standardStatement.catalogueSummaryPage();
          cb();
        } else if (standardStatement.statementDesign.includes('Extended')) {
          logger.debug('Extended Statement');
          // Create Second Page of Highlights
          standardStatement.catalogueSummaryPage();
          // Create multi page extended pages
          standardStatement.extendedDetail(() => {
            if (standardStatement.statementType !== 'Publisher') {
              standardStatement.extendedCostsDetail(cb);
            } else {
              cb();
            }
          });
        } else {
          cb();
        }
      },
    ], (err) => {
      standardStatement.closePdf((fileLocation) => {
        callback(fileLocation);
      });
    });
  };

  this.layout = function () {
    this.setupPage();
    if (this.statementHeaderType === 'Include Payee Address') {
      this.headerPayeeAddress();
    } else {
      this.header();
    }
    this.body();
    this.footer();
  };

  this.setupPage = function () {
    this.pdf.registerFont('Body', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    this.pdf.registerFont('Neue', `${appRootDir}/assets/fonts/HelveticaNeue.ttf`);
    this.pdf.registerFont('Condensed', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    this.pdf.registerFont('H2', `${appRootDir}/assets/fonts/HelveticaNeueCondensedBold.ttf`);
    this.pdf.registerFont('H2 Currency', `${appRootDir}/assets/fonts/texgyreheroscn-bold.otf`); // For Currency Symbols not supported by Helvetica Neue
    this.pdf.registerFont('Currency', `${appRootDir}/assets/fonts/texgyreheroscn-regular.otf`); // Used for body text with Currency Symbol or text that has special chars
    this.pdf.font('Condensed');
  };

  // Header
  this.header = function () {
    this.clientLogo();
    this.clientAddress();
    this.pageTitle();
  };

  this.headerPayeeAddress = function () {
    this.payeeAddress();
    this.clientLogoPayeeAddress();
    this.clientAddress();
    this.pageTitle();
  };

  this.clientLogo = function () {
    if (this.logo) {
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
      if (this.logo) { this.pdf.image(this.logo, 250, 20, { height: 70 }); }
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
    const territoryMappings = { WW: 'World', Europe: 'All Europe', Africa: 'All Africa', Asia: 'All Asia', Americas: 'All Americas', Oceania: 'All Oceania', DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: 'Cote d\'Ivoire', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: 'Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CW: 'Curacao', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthelemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Suriname', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Aland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa' };

    this.pdf.fillColor(statement.offsetColour).fontSize(12).text(params.payeeName, 20, 25, { width: 300, align: 'left' });
    this.pdf.fillColor(statement.offsetColour).fontSize(12).text(params.payeeAddress, 20, statement.pdf.y, { width: 300, align: 'left' });
    if (params.payeeCountry) {
      statement.pdf.fillColor(statement.offsetColour).fontSize(12).text(territoryMappings[params.payeeCountry], 20, statement.pdf.y, { width: 300 });
    }
  };

  this.pageTitle = function () {
    this.pdf.fillColor(statement.offsetColour).fontSize(32).font('H2').text('ROYALTY STATEMENT', 80, 110, { width: 300, align: 'right' });
    this.pdf.fillColor('black').fontSize(18).font('Condensed').text(this.periodName, 75, 144, { width: 300, align: 'right' });
    this.pdf.fillColor('black').fontSize(18).font('Condensed').text(this.contractName, 380, 144, { width: 200, align: 'right' });
    statement.moveY(10);
    statement.pdf.lineWidth(1);
    statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.moveY(10);
  };

  // Body
  this.body = function () {
    async.waterfall([
      this.opening,
      this.paymentsSection,
      this.income,
      this.costs,
      this.reserves,
      this.profitShareTotals,
      this.transactionsSection,
      this.advancesSection,
      this.closingBalanceSection,
    ]);
  };

  this.opening = function (callback) {
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('OPENING', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Opening Balance', statement.openingBalance);
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    callback();
  };

  this.paymentsSection = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('PAYMENTS', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Payments this Period', statement.payments);
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    callback();
  };

  this.income = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('INCOME', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    const channels = statement.clientType === 'Distributor' ? statement.analysis.gross.distributionChannels : statement.analysis.net.distributionChannels;
    async.eachSeries(channels, (distributionChannel, cb) => {
      statement.distributionChannel(distributionChannel, cb);
    }, () => {
      // Handle separated deductions
      if (statement.displaySeparatedDeductions) {
        statement.headerRow(statement.customDeductionName ? statement.customDeductionName : 'Deduction', statement.deductionAmount, statement.offsetColour, true);
      }

      if (statement.clientType === 'Distributor') {
        statement.headerRow('TOTAL INCOME', statement.grossAmount);
      } else {
        statement.headerRow('TOTAL INCOME', statement.netAmount);
      }

      statement.moveY(statement.subHeaderFontSize);
      statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
      callback();
    });
  };

  this.distributionChannel = function (distributionChannel, callback) {
    if (distributionChannel.value) {
      statement.headerRow(distributionChannel.type, statement.displaySeparatedDeductions ? distributionChannel.value + distributionChannel.deduction : distributionChannel.value);
      const configurations = statement.configurationsByDistributionChannel[distributionChannel.type].sort(statement.sortByValue);
      async.eachSeries(configurations, (configuration, cb) => {
        if (configuration.value) {
          statement.detailRow(configuration.type, statement.displaySeparatedDeductions ? configuration.value + configuration.deduction : configuration.value);
          cb();
        } else {
          cb();
        }
      }, () => {
        statement.pdf.moveDown();
        callback();
      });
    } else {
      callback();
    }
  };

  this.headerRow = function (type, value, colour, negative) {
    if (!type || type === '') { type = 'Other'; }
    if (!colour || colour === '') { colour = 'black'; }
    statement.pdf.fillColor(colour).fontSize(statement.subHeaderFontSize).font('H2').text(type.toUpperCase(), 150, statement.pdf.y);
    statement.pdf.moveUp();
    const valueFont = ['GBP', 'USD', 'EUR'].includes(statement.homeCurrency) ? 'H2' : 'H2 Currency';
    statement.pdf.fillColor(colour).fontSize(statement.subHeaderFontSize).font(valueFont).text(statement.valueToCurrency(value, negative), 350, statement.pdf.y, { width: 200, align: 'right' });
    statement.moveY(5);
  };

  this.detailRow = function (type, value, notMoney) {
    if (!type || type === '') { type = 'Other'; }
    const typeFont = StatementUtils.containsSpecialChars(type) ? 'Currency' : 'Body';
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font(typeFont).text(type, 150, statement.pdf.y, { width: 310 });
    statement.pdf.moveUp();
    if (!notMoney) { value = statement.valueToCurrency(value); }
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(value, 350, statement.pdf.y - 2, { width: 200, align: 'right' });
    statement.moveY(2);
  };

  this.costs = function (callback) {
    if (statement.statementType !== 'Publisher') {
      statement.moveY(statement.subHeaderFontSize * 0.7);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('COSTS', 20, statement.pdf.y, { width: 115, align: 'right' });
      statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
      let costs = statement.clientType === 'Distributor' ? statement.analysis.gross.costs : statement.analysis.net.costs;
      costs = costs || [];
      costs = costs.sort(statement.sortByValue);
      async.eachSeries(costs, (cost, cb) => {
        statement.detailRow(cost.type, cost.value);
        cb();
      }, () => {
        if (costs.length > 0) { statement.moveY(statement.subHeaderFontSize); }
        statement.headerRow('TOTAL COSTS', statement.netCosts);
        statement.moveY(statement.subHeaderFontSize * 0.7);
        statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
        callback();
      });
    } else {
      callback();
    }
  };

  this.sortByValue = function (a, b) {
    if (a && b) {
      return b.value - a.value;
    }
    return 0;
  };

  this.reserves = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('RESERVES', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Reserves Withheld', 0 - statement.reservesWithheld);
    statement.headerRow('Reserves Released', statement.reservesReleased);
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    callback();
  };

  this.transactionsSection = function (callback) {
    // Set end date for comparison to transaction
    const statementDate = new Date(statement.date);
    statementDate.setDate(statementDate.getDate() + 1);
    statementDate.setUTCHours(0, 0, 0, 0);
    // Filter any transactions that aren't required
    const transactions = statement.transactions.map((transaction) => {
      // We're ignoring both 'Reserves Released' and 'Reserve Released', Curve generated one have the S in reserves, the user generated ones don't
      if (!['Payment', 'Reserve Withheld', 'Reserves Released', 'Reserve Released', 'Advance', 'Advance Recoupment', 'Negative Balance Recoupment', 'Negative Balance Adjustment'].includes(transaction.type) && transaction.date >= statement.startDate && transaction.date <= statementDate && (transaction.date != statement.date && transaction.name != statement.periodName)) {
        return transaction;
      }
    }).filter(Boolean);
    if (transactions && transactions.length > 0) {
      statement.moveY(statement.subHeaderFontSize * 1.25);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('TRANSACTIONS', 20, statement.pdf.y, { width: 115, align: 'right' });
      statement.moveY(0 - (statement.subHeaderFontSize * 1.25));
      let totalTransactions = 0;
      let count = 0;
      async.eachSeries(transactions, (transaction, cb) => {
        if (transaction.date >= statement.startDate && transaction.date <= statementDate && (transaction.date != statement.date && transaction.name != statement.periodName)) {
          totalTransactions += transaction.amount;
          const transactionName = `${moment(transaction.date).format(statement.dateFormat)} - ${transaction.name}`;
          statement.detailRow(transactionName, transaction.amount);
          count += 1;
          cb();
        } else {
          cb();
        }
      }, () => {
        if (count > 0) {
          statement.moveY(statement.subHeaderFontSize * 1.25);
        }
        statement.totalTransactions = totalTransactions;
        statement.headerRow('TOTAL TRANSACTIONS', totalTransactions);
        statement.moveY(statement.subHeaderFontSize * 1.25);
        statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
        callback();
      });
    } else {
      callback();
    }
  };

  this.advancesSection = function (callback) {
    if (Math.round(statement.profitShareUnrecoupedAdvanceStart * 100) / 100) {
      statement.moveY(statement.subHeaderFontSize * 1.25);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('ADVANCE', 20, statement.pdf.y, { width: 115, align: 'right' });
      statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
      statement.detailRow('Unrecouped Advance', statement.profitShareUnrecoupedAdvanceStart);
      if (statement.totalTransactions && parseInt(statement.closingBalance) <= 1) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize - 2).font('Body').text('Includes any payments to third parties such as producers when balance is negative', 150, statement.pdf.y);
        statement.pdf.y += 2;
      }
      statement.detailRow('Recouped Advance this Period', statement.profitShareAdvanceRecouped);
      if (statement.profitShareUnrecoupedAdvanceStart - statement.profitShareAdvanceRecouped < 0) {
        statement.detailRow('Remaining Advance', statement.profitShareUnrecoupedAdvanceStart + statement.profitShareAdvanceRecouped);
      }
      statement.moveY(statement.subHeaderFontSize * 1.25);
      statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    }
    callback();
  };

  this.profitShareTotals = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('BALANCE', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    if (statement.contractType === 'Profit Share - Flexible') {
      statement.detailRow('Gross Amount this Period (Income - Costs + Reserves)', statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld);
    } else {
      statement.detailRow('Gross Amount this Period (Income - Costs)', statement.netAmount - statement.netCosts);
      statement.detailRow('Balance (Opening + Payments + Gross + Reserves)', statement.profitShareBalance);
    }
    statement.profitShareRate = statement.profitShareRate ? statement.profitShareRate : 0;
    // Only display rate when positive balance
    if (statement.contractType === 'Profit Share - Flexible' || statement.profitShareBalance >= 0 || (statement.profitShareBalance < 0 && statement.openingBalance > 0)) {
      statement.detailRow('Profit Share Rate', `${statement.profitShareRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, true);
    }
    statement.detailRow('Profit Split', statement.profitShareNetAmount);
    // Add messaging
    if (statement.contractType === 'Profit Share') {
      if (statement.openingBalance > 0 && statement.profitShareBalance >= 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize - 2).font('Body').text('Split of gross amount this period - ignoring any previous balance or payments', 150, statement.pdf.y);
      } else if (statement.openingBalance > 0 && statement.payments != statement.openingBalance && statement.profitShareBalance < 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize - 2).font('Body').text('Balance split at profit share rate back to zero, with remainder held at 100%', 150, statement.pdf.y);
      } else if (statement.profitShareBalance < 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize - 2).font('Body').text('Balance held at 100% whilst negative', 150, statement.pdf.y);
      } else if (statement.openingBalance < 0 && statement.profitShareNetAmount > 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize - 2).font('Body').text('Balance split at profit share rate', 150, statement.pdf.y);
      }
    }
    statement.moveY(statement.subHeaderFontSize * 1.25);
    statement.pdf.moveTo(150, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    callback();
  };

  this.closingBalanceSection = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('CLOSING', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Closing Balance', statement.closingBalance);
    if (statement.homeCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 350, statement.pdf.y, { width: 200, align: 'right' }); }
    callback();
  };

  // Footer
  this.footer = function () {
    if (this.customText && this.customText !== '') {
      statement.moveY(30);
      this.customText.split('\n').forEach((customTextElement) => {
        statement.pdf.fillColor(statement.offsetColour).fontSize(12.5).font('Currency').text(customTextElement, 70, statement.pdf.y - 2, { width: 450, align: 'center' });
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
    if (this.contactEmail && this.contactEmail !== '') { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`Any questions, please contact ${this.contactEmail}`, 145, 760, { width: 300, align: 'center' }); }
    if (!this.removeFooterImage) { this.pdf.image(`${appRootDir}/assets/images/Produced-By-Logo.jpg`, 270, 800, { height: 30 }); }
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(`Run No: ${statement.runNo}`, 10, 800, { width: 300, align: 'left' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(moment().format('DD/MM/YYYY HH:mm:SS'), 10, 810, { width: 300, align: 'left' });
  };

  // Catalogue Summary
  this.catalogueSummaryPage = function () {
    // Add page
    this.pdf.addPage();
    this.addInTrialWaterMark();
    this.summaryPageSetup();
    // Add Top Catalogue
    if (statement.statementType !== 'Publisher') {
      // Get correct set depending on client type
      let releases = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.releases : statement.analysis.net.releases;
      if (!releases) { releases = []; }
      this.topItems(releases, 'TOP RELEASES', 10, true, true);
      let tracks = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.tracks : statement.analysis.net.tracks;
      if (!tracks) { tracks = []; }
      this.topItems(tracks, 'TOP TRACKS', 10, false, true);
    } else {
      let { works } = statement.analysis.net;
      if (!works) { works = []; }
      this.topItems(statement.analysis.net.works, 'TOP WORKS', 10, true, true);
    }
    const territoryMappings = { WW: 'World', Europe: 'All Europe', Africa: 'All Africa', Asia: 'All Asia', Americas: 'All Americas', Oceania: 'All Oceania', DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: 'Cote d\'Ivoire', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: 'Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CW: 'Curacao', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthelemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Suriname', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', XK: 'Kosovo', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Aland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa' };
    let territories = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.territories : statement.analysis.net.territories;
    if (!territories) { territories = []; }
    territories = territories.map((item) => {
      item.type = territoryMappings[item.type];
      return item;
    });
    this.topItems(territories, 'TOP TERRITORIES', 10, false);
    // Add page
    this.pdf.addPage();
    this.addInTrialWaterMark();
    this.summaryPageSetup();
    let sources = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.sources : statement.analysis.net.sources;
    if (!sources) { sources = []; }
    this.topItems(sources, 'TOP SOURCES', 10, true);
    let subSources = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.subSources : statement.analysis.net.subSources;
    if (!subSources) { subSources = []; }
    this.topItems(subSources, 'TOP SUBSOURCES', 10, true);
  };

  this.summaryPageSetup = function () {
    // Add logo and address
    this.clientLogo();
    this.clientAddress();
    this.pdf.fillColor(statement.offsetColour).fontSize(32).font('H2').text('SUMMARY', 110, 120, { width: 200, align: 'left' });
    statement.moveY(5);
    this.pdf.lineWidth(1);
    this.pdf.moveTo(110, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.moveY(10);
    this.catalogueHeaderRow();
  };

  this.catalogueHeaderRow = function () {
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('TITLE', 150, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('UNITS', 370, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize).font('H2').text('REVENUE', 350, statement.pdf.y, { width: 200, align: 'right' });
    statement.moveY(5);
  };

  this.catalogueDetailRow = function (type, units, value, notMoney) {
    if (!type || type === '') { type = 'Other'; }
    const typeFont = StatementUtils.containsSpecialChars(type) ? 'Currency' : 'Body';
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font(typeFont).text(type, 150, statement.pdf.y, { width: 220 });
    statement.pdf.moveUp();
    const displayUnits = units ? statement.valueToStructuredNumber(units, 0) : null;
    if (displayUnits) {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(displayUnits, 203, statement.pdf.y, { width: 200, align: 'right' });
      statement.pdf.moveUp();
    }
    if (!notMoney) { value = statement.valueToCurrency(value); }
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.currencyFontSize).font('Currency').text(value, 350, statement.pdf.y - 2, { width: 200, align: 'right' });
    statement.moveY(2);
  };

  this.sortByValue = function (a, b) {
    if (a && b) {
      return b.value - a.value;
    }
    return 0;
  };

  this.topItems = function (items, title, limit, includeUnits, includeTitle) {
    if (items && (items.length > 1 || (items && items[0] && items[0].type !== 'Other'))) {
      statement.moveY(15);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize * 0.9).font('H2').text(title, 20, statement.pdf.y);
      statement.moveY(0 - (statement.subHeaderFontSize * 1.2));
      // Sort into value order
      items = items.sort(this.sortByValue);
      // Limit to 10
      items = items.slice(0, limit);
      // Write rows
      async.eachSeries(items, (item, cb) => {
        const units = includeUnits ? item.units : null;
        const titleText = item.type ? `${item.type}: ${item.title}` : item.title;
        const title = includeTitle ? titleText : item.type;
        // Only display lines when value is present
        if (item.value) {
          statement.catalogueDetailRow(title, units, statement.displaySeparatedDeductions ? item.value + item.deduction : item.value);
        }
        cb();
      });
    }
  };

  this.extendedDetail = function (callback) {
    // Setup page
    this.pdf.addPage();
    this.addInTrialWaterMark();
    this.detailPageSetup();
    this.getExtendedData(callback);
  };

  this.detailPageSetup = function () {
    this.clientLogo();
    this.clientAddress();
    this.pdf.fillColor(statement.offsetColour).fontSize(32).font('H2').text('ROYALTY DETAIL', 110, 120, { width: 400, align: 'left' });
    statement.moveY(5);
    this.pdf.lineWidth(1);
    this.pdf.moveTo(110, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.moveY(10);
    this.detailHeaderRow();
  };

  this.detailHeaderRow = function () {
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('SOURCE', 10, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('CHANNEL', 90, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('CONFIG', 160, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('TERR.', 240, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('UNITS', 280, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('REVENUE', 333, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('COLL.', 400, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('PART.', 440, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('RATE', 490, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('ROYALTY', 520, statement.pdf.y, { width: 50, align: 'right' });
    statement.pdf.y += 5;
  };

  this.writeData = function (callback) {
    const standardStatement = this;
    // Group data into works, tracks, releases
    standardStatement.salesData = this.groupData(standardStatement.salesData);
    async.waterfall([
      function (cb) {
        async.eachSeries(Object.keys(standardStatement.salesData.releases), (id, idCb) => {
          // Write item header
          let sum = 0;
          standardStatement.salesData.releases[id].forEach((item) => {
            if (item.contractCurrencyCalculationOutput) {
              sum += statement.displaySeparatedDeductions ? item.contractCurrencyCalculationOutput + item.contractCurrencyDeduction : item.contractCurrencyCalculationOutput;
            }
          });
          standardStatement.catalogueItemHeaderRow(standardStatement.salesData.releases[id], sum, () => {
            // Create summary of lines
            const summarisedData = standardStatement.summariseDetail(standardStatement.salesData.releases[id]);
            // Write each line for the catalogue item
            summarisedData.forEach((item) => {
              standardStatement.writeDetailRow(item);
            });
            idCb();
          });
        }, cb);
      },
      function (cb) {
        async.eachSeries(Object.keys(standardStatement.salesData.tracks), (id, idCb) => {
          // Write item header
          let sum = 0;
          standardStatement.salesData.tracks[id].forEach((item) => {
            if (item.contractCurrencyCalculationOutput) {
              sum += statement.displaySeparatedDeductions ? item.contractCurrencyCalculationOutput + item.contractCurrencyDeduction : item.contractCurrencyCalculationOutput;
            }
          });
          standardStatement.catalogueItemHeaderRow(standardStatement.salesData.tracks[id], sum, () => {
            // Create summary of lines
            const summarisedData = standardStatement.summariseDetail(standardStatement.salesData.tracks[id]);
            // Write each line for the catalogue item
            summarisedData.forEach((item) => {
              standardStatement.writeDetailRow(item);
            });
            idCb();
          });
        }, cb);
      },
      function (cb) {
        async.eachSeries(Object.keys(standardStatement.salesData.works), (id, idCb) => {
          // Write item header
          let sum = 0;
          standardStatement.salesData.works[id].forEach((item) => {
            if (item.contractCurrencyCalculationOutput) {
              sum += statement.displaySeparatedDeductions ? item.contractCurrencyCalculationOutput + item.contractCurrencyDeduction : item.contractCurrencyCalculationOutput;
            }
          });
          standardStatement.catalogueItemHeaderRow(standardStatement.salesData.works[id], sum, () => {
            // Create summary of lines
            const summarisedData = standardStatement.summariseDetail(standardStatement.salesData.works[id]);
            // Write each line for the catalogue item
            summarisedData.forEach((item) => {
              standardStatement.writeDetailRow(item);
            });
            idCb();
          });
        }, cb);
      },
      function (cb) {
        async.eachSeries(Object.keys(standardStatement.salesData.contracts), (id, idCb) => {
          // Write item header
          let sum = 0;
          standardStatement.salesData.contracts[id].forEach((item) => {
            if (item.contractCurrencyCalculationOutput) {
              sum += statement.displaySeparatedDeductions ? item.contractCurrencyCalculationOutput + item.contractCurrencyDeduction : item.contractCurrencyCalculationOutput;
            }
          });
          standardStatement.catalogueItemHeaderRow(standardStatement.salesData.contracts[id], sum, () => {
            // Create summary of lines
            const summarisedData = standardStatement.summariseDetail(standardStatement.salesData.contracts[id]);
            // Write each line for the catalogue item
            summarisedData.forEach((item) => {
              standardStatement.writeDetailRow(item);
            });
            idCb();
          });
        }, cb);
      },
    ], callback);
  };

  this.summariseDetail = function (data) {
    if (data) {
      const groupings = {};
      data.forEach((item) => {
        const itemString = `${item.source}${item.distributionChannel}${item.configuration}${item.territory}${item.objectPercentage}${item.royaltyRate}`;
        if (groupings[itemString]) {
          if (item.units) {
            groupings[itemString].units += item.units;
          }
          if (item.calculationInput) {
            groupings[itemString].calculationInput += item.calculationInput;
          }
          if (item.calculationOutput) {
            groupings[itemString].calculationOutput += item.calculationOutput;
          }
        } else {
          groupings[itemString] = item;
        }
      });
      return Object.keys(groupings).map((itemString) => groupings[itemString]);
    }
    return [];
  };

  this.groupData = function (data) {
    const groupedData = { releases: {}, tracks: {}, works: {}, contracts: {} };
    data.forEach((item) => {
      if (item.catType === 'Release') {
        groupedData.releases[item.catalogueCatNo] = groupedData.releases[item.catalogueCatNo] || [];
        groupedData.releases[item.catalogueCatNo].push(item);
      } else if (item.catType === 'Track') {
        groupedData.tracks[item.catalogueIsrc] = groupedData.tracks[item.catalogueIsrc] || [];
        groupedData.tracks[item.catalogueIsrc].push(item);
      } else if (item.catalogueIdentifier) {
        groupedData.works[item.catalogueIdentifier] = groupedData.works[item.catalogueIdentifier] || [];
        groupedData.works[item.catalogueIdentifier].push(item);
      } else if (item.catType === 'Contract') {
        groupedData.contracts[item.contractName] = groupedData.contracts[item.contractName] || [];
        groupedData.contracts[item.contractName].push(item);
      }
    });
    return groupedData;
  };

  this.catalogueItemHeaderRow = function (data, sum, callback) {
    // If no more space left at the bottom of the page, add a new page manually
    if (statement.pdf.page.height - statement.pdf.y < 80) {
      this.addNewDetailsPage();
    }

    const titleString = this.catalogueHeaderString(data[0]);
    statement.moveY(10);
    statement.pdf.fillColor('black').fontSize(statement.bodyFontSize * 0.8).font('Body').text(titleString, 10, statement.pdf.y, { width: 500 });
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.bodyFontSize * 0.8).font('Body').text(statement.valueToStructuredNumber(sum, 2), 510, statement.pdf.y, { width: 60, align: 'right' });
    callback();
  };

  this.catalogueHeaderString = function (item) {
    let string = '';
    if (item.catType === 'Release') {
      string += item.catalogueReleaseTitle;
      if (item.catalogueReleaseArtist) { string += ` - ${item.catalogueReleaseArtist}`; }
      if (item.catalogueCatNo) { string += ` - ${item.catalogueCatNo}`; }
    } else if (item.catType === 'Track') {
      string += item.catalogueTrackTitle;
      if (item.catalogueTrackArtist) { string += ` - ${item.catalogueTrackArtist}`; }
      if (item.catalogueIsrc) { string += ` - ${item.catalogueIsrc}`; }
    } else if (item.catalogueIdentifier) {
      string += item.catalogueWorkTitle;
      if (item.catalogueWorkComposer) { string += ` - ${item.catalogueWorkComposer}`; }
      if (item.catalogueIdentifier) { string += ` - ${item.catalogueIdentifier}`; }
    }
    return string;
  };

  this.addNewDetailsPage = function () {
    // Add a new page
    statement.pdf.addPage();
    this.addInTrialWaterMark();
    // Add a headers
    statement.moveY(10);
    this.detailHeaderRow();
  };

  this.writeDetailRow = function (item) {
    if (item) {
      // If no more space left at the bottom of the page, add a new page manually
      if (statement.pdf.page.height - statement.pdf.y < 50) {
        this.addNewDetailsPage();
      }

      if (item.source && item.source !== '') {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item.source, 10, statement.pdf.y, { width: 75 });
        statement.pdf.moveUp();
      }
      if (item.distributionChannel && item.distributionChannel !== '') {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item.distributionChannel, 90, statement.pdf.y, { width: 75 });
        statement.pdf.moveUp();
      }
      if (item.configuration && item.configuration !== '') {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item.configuration, 160, statement.pdf.y, { width: 75 });
        statement.pdf.moveUp();
      }
      if (item.territory && item.territory !== '') {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item.territory, 240, statement.pdf.y, { width: 75 });
        statement.pdf.moveUp();
      }
      if (item.units || item.units == 0) {
        const displayUnits = item.units ? statement.valueToStructuredNumber(item.units, 0) : 0;
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(displayUnits, 230, statement.pdf.y, { width: 75, align: 'right' });
        statement.pdf.moveUp();
      }
      const displayInput = item.contractCurrencyCalculationInput ? statement.valueToStructuredNumber(item.contractCurrencyCalculationInput, 4, 4) : 0;
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(displayInput, 300, statement.pdf.y, { width: 75, align: 'right' });
      statement.pdf.moveUp();
      if (item.sharePercentage || item.sharePercentage == 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item.sharePercentage, 400, statement.pdf.y, { width: 75 });
        statement.pdf.moveUp();
      }
      const displayParticipationRate = item.objectPercentage ? statement.valueToStructuredNumber(item.objectPercentage, 2) : 0;
      if (item.objectPercentage || item.objectPercentage == 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(displayParticipationRate, 389, statement.pdf.y, { width: 75, align: 'right' });
        statement.pdf.moveUp();
      }
      const displayRoyaltyRate = item.royaltyRate ? statement.valueToStructuredNumber(item.royaltyRate, 2) : 0;
      if (item.royaltyRate || item.royaltyRate == 0) {
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(displayRoyaltyRate, 438, statement.pdf.y, { width: 75, align: 'right' });
        statement.pdf.moveUp();
      }
      const displayOutput = statement.valueToStructuredNumber(statement.displaySeparatedDeductions ? item.contractCurrencyCalculationOutput + item.contractCurrencyDeduction : item.contractCurrencyCalculationOutput, 4, 4);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(displayOutput, 510, statement.pdf.y, { width: 60, align: 'right' });
    }
  };

  this.getExtendedData = function (callback) {
    const standardStatement = this;
    async.waterfall([
      function (cb) {
        // Check if sales data passed
        if (standardStatement.salesData) {
          cb(null);
        } else {
          // Else get from DB
          standardStatement.getExtendedDataFromDb(cb);
        }
      },
      function (cb) {
        // Organise data
        if (standardStatement.salesData) {
          standardStatement.salesData = standardStatement.salesData.map((item) => standardStatement.lineToTemplate(item, standardStatement.salesTemplate));
        } else {
          standardStatement.salesData = [];
        }
        cb(null);
      },
      function (cb) {
        standardStatement.writeData(cb);
      },
    ], callback);
  };

  this.lineToTemplate = function (item, template) {
    const object = {};
    item.forEach((field, index) => {
      if (field && template[index]) {
        object[template[index].field] = field;
      }
    });
    return object;
  };

  this.getExtendedDataFromDb = function (callback) {
    const standardStatement = this;
    const template = [{ field: 'catType', header: 'Type', type: 'Selector' }, { field: 'source', header: 'Source', type: 'Selector' }, { field: 'territory', header: 'Territory', type: 'Selector' }, { field: 'catalogueBarcode', header: 'Barcode', type: 'Selector' }, { field: 'catalogueCatNo', header: 'Cat No', type: 'Selector' }, { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' }, { field: 'catalogueReleaseArtist', header: 'Release Artist', type: 'Selector' }, { field: 'workId', header: 'Work ID', type: 'Selector' }, { field: 'catalogueWorkTitle', header: 'Work Title', type: 'Selector' }, { field: 'catalogueWorkComposer', header: 'Composer', type: 'Selector' }, { field: 'catalogueWorkIdentifier', header: 'Work Identifier', type: 'Selector' }, { field: 'ppd', header: 'PPD', type: 'Selector' }, { field: 'sharePercentage', header: 'Received Percentage', type: 'Selector' }, { field: 'catalogueIsrc', header: 'ISRC', type: 'Selector' }, { field: 'catalogueTrackTitle', header: 'Track Title', type: 'Selector' }, { field: 'catalogueTrackArtist', header: 'Track Artist', type: 'Selector' }, { field: 'distributionChannel', header: 'Distribution Channel', type: 'Selector' }, { field: 'configuration', header: 'Configuration', type: 'Selector' }, { field: 'priceCategory', header: 'Price Category', type: 'Selector' }, { field: 'units', header: 'Units', type: 'Calculator' }, { field: 'perUnitRate', header: 'Per Unit Rate', type: 'Selector' }, { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' }, { field: 'netAmount', header: 'Net Amount in Currency', type: 'Calculator' }, { field: 'originalCurrency', header: 'Original Currency', type: 'Selector' }, { field: 'exchangeRate', header: 'Exchange Rate', type: 'Selector' }, { field: 'homeCurrencyGrossAmount', header: 'Gross Amount', type: 'Calculator' }, { field: 'homeCurrencyNetAmount', header: 'Net Amount', type: 'Calculator' }, { field: 'calculationType', header: 'Calculation Type', type: 'Selector' }, { field: 'calculationInput', header: 'Calculation Input', type: 'Calculator' }, { field: 'objectPercentage', header: 'Participation Rate', type: 'Selector' }, { field: 'mechanicalType', header: 'Mechanical Deduction Type', type: 'Selector' }, { field: 'mechanicalPercentage', header: 'Mechanical Deduction Rate', type: 'Selector' }, { field: 'mechanicalDeduction', header: 'Mechanical Deduction', type: 'Calculator' }, { field: 'deductionUnitRate', header: 'Deduction Unit Rate', type: 'Calculator' }, { field: 'deductionRate', header: 'Deduction Rate', type: 'Selector' }, { field: 'deduction', header: 'Deduction', type: 'Calculator' }, { field: 'royaltyRate', header: 'Royalty Rate', type: 'Selector' }, { field: 'unitRate', header: 'Unit Rate', type: 'Selector' }, { field: 'reductionRate', header: 'Reduction Rate', type: 'Selector' }, { field: 'calculationOutput', header: 'Net Payable', type: 'Calculator' }, { field: 'reserveRate', header: 'Reserve Rate', type: 'Selector' }, { field: 'reserve', header: 'Reserve', type: 'Calculator' }];
    const sort = { catalogueCatNo: 1, catalogueIsrc: 1, distributionChannel: 1, configuration: 1, source: 1, territory: 1 };
    collectData.getDataBatch(statement.bigQuery, statement.bigQuery.outputTable, standardStatement.dbFilter, standardStatement.salesTemplate, { catalogueCatNo: 1, catalogueIsrc: 1 }, false, null, null, (err, data) => {
      if (err) {
        callback(err);
      } else {
        standardStatement.salesData = data;
        // Remove any zero values in sales data
        if (standardStatement.suppressZeroValue && standardStatement.salesData) {
          // Remove any 0 value lines
          standardStatement.salesData = standardStatement.salesData.map((line) => { if (line.contractCurrencyCalculationOutput != 0) { return line; } }).filter(Boolean);
        }
        callback();
      }
    });
  };

  this.getGroup = function (template) {
    const group = {};
    const selectors = {};
    for (let i = 0; i < template.length; i += 1) {
      if (template[i].field === 'catalogueCatNo') { group[template[i].field] = { $first: '$catalogueCatNo' }; }
      if (template[i].field === 'catalogueIsrc') { group[template[i].field] = { $first: '$catalogueIsrc' }; }
      if (template[i].field === 'source') { group[template[i].field] = { $first: '$source' }; }
      if (template[i].type === 'Selector') {
        selectors[template[i].field] = `$${template[i].field}`;
      } else if (template[i].type === 'Calculator') {
        group[template[i].field] = { $sum: `$${template[i].field}` };
      }
    }
    group._id = selectors;
    return group;
  };

  this.mapData = function (data, template) {
    const standardStatement = this;
    return data.map((line) => standardStatement.flattenLine(line, template));
  };

  this.flattenLine = function (line) {
    const idKeys = Object.keys(line._id);
    for (let i = 0; i < idKeys.length; i += 1) {
      if (idKeys[i] !== '_id') { line[idKeys[i]] = line._id[idKeys[i]]; }
    }
    if (idKeys.includes('_id')) {
      line._id = line._id._id;
    } else {
      delete line._id;
    }
    return line;
  };

  this.extendedCostsDetail = function (callback) {
    // Setup page
    this.pdf.addPage();
    this.addInTrialWaterMark();
    this.costDetailPageSetup();
    this.getExtendedCostData(callback);
  };

  this.costDetailPageSetup = function () {
    this.clientLogo();
    this.clientAddress();
    this.pdf.fillColor(statement.offsetColour).fontSize(32).font('H2').text('COSTS DETAIL', 110, 120, { width: 200, align: 'left' });
    statement.moveY(5);
    this.pdf.lineWidth(1);
    this.pdf.moveTo(110, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.moveY(10);
    this.costDetailHeaderRow();
  };

  this.costDetailHeaderRow = function () {
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('NAME', 10, statement.pdf.y, { width: 180 });
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('DESCRIPTION', 200, statement.pdf.y, { width: 240 });
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('CAT NO', 450, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor('black').fontSize(statement.subHeaderFontSize * 0.8).font('H2').text('AMOUNT', 520, statement.pdf.y, { width: 50, align: 'right' });
    statement.moveY(5);
  };

  this.getExtendedCostData = function (callback) {
    const standardStatement = this;
    // Setup template for query
    const template = [{ field: 'costId', header: 'Cost ID', type: 'Selector' }, { field: 'type', header: 'Type', type: 'Selector' }, { field: 'name', header: 'Name', type: 'Selector' }, { field: 'date', header: 'Date', type: 'Selector' }, { field: 'description', header: 'Description', type: 'Selector' }, { field: 'territory', header: 'Territory', type: 'Selector' }, { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' }, { field: 'catalogueReleaseArtist', header: 'Release Artist', type: 'Selector' }, { field: 'catalogueCatNo', header: 'Cat No', type: 'Selector' }, { field: 'catalogueTrackTitle', header: 'Track Title', type: 'Selector' }, { field: 'catalogueTrackArtist', header: 'Track Artist', type: 'Selector' }, { field: 'catalogueIsrc', header: 'ISRC', type: 'Selector' }, { field: 'amount', header: 'Gross Amount', type: 'Calculator' }, { field: 'objectPercentage', header: 'Participation Rate', type: 'Selector' }, { field: 'rechargeRate', header: 'Recharge Rate', type: 'Selector' }, { field: 'calculationOutput', header: 'Net Amount', type: 'Calculator' }];
    // Get Data
    delete standardStatement.dbFilter.royaltyRate;
    collectData.getDataBatch(statement.bigQuery, statement.bigQuery.costsTable, standardStatement.dbFilter, template, { catalogueCatNo: 1, catalogueIsrc: 1 }, false, null, null, (err, costsData) => {
      if (err) {
        callback(err);
      } else {
        // Write Data to PDF
        standardStatement.writeCostData(costsData, callback);
      }
    });
  };

  this.writeCostData = function (data, callback) {
    const standardStatement = this;
    async.eachSeries(data, (item, cb) => {
      standardStatement.writeCostDetailRow(item, cb);
    }, callback);
  };

  this.addNewCostsDetailsPage = function () {
    // Add a new page
    statement.pdf.addPage();
    this.addInTrialWaterMark();
    // Add a headers
    statement.moveY(10);
    this.costDetailHeaderRow();
  };

  this.writeCostDetailRow = function (item, callback) {
    // If no more space left at the bottom of the page, add a new page manually
    if (statement.pdf.page.height - statement.pdf.y < 50) {
      this.addNewCostsDetailsPage();
    }
    // This doesn't write if data is missing, and so is move up is causing things not to line up properly
    if (item[2] && item[2] !== '') {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item[2], 10, statement.pdf.y, { width: 180 });
      statement.pdf.moveUp();
    }
    if (item[4] && item[4] !== '') {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item[4], 200, statement.pdf.y, { width: 240 });
      statement.pdf.moveUp();
    }
    if (item[8] && item[8] !== '') {
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(item[8], 450, statement.pdf.y, { width: 50 });
      statement.pdf.moveUp();
    }
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize * 0.8).font('Body').text(statement.valueToStructuredNumber(item[15], 4, 2), 510, statement.pdf.y, { width: 60, align: 'right' });
    callback();
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

module.exports = Standard;
