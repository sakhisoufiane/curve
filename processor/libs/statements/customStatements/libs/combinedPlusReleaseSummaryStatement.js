const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const Statement = require('../../standardPdf/libs/statementCreator');
const collectData = require('../../../writeCsv/collectData');
const Release = require('../../../../models/release');

const Standard = function (params) {
  // Set params to object
  Statement.call(this, params);
  const statement = this;
  // Save clientId
  const statementClientId = statement.transactions?.[0]?.clientId;

  // Set mechanical type
  statement.mechanicalType = 'Post';
  statement.totalMechanicalAmount = 0;

  // Loop through mechanical terms
  if (params.mechanicalTerms) {
    params.mechanicalTerms.forEach((term) => {
      // Checks if any mechanical term is Pre, and sets the type. This is any one term being pre, making an assumption that there won't be numerous differing terms on the same contract
      if (term?.deductionType === 'Pre-Calculation') {
        statement.mechanicalType = 'Pre';
      }
    });
  }

  // Hold all cat nos on object
  this.allCatNos = [];

  // Set Font Heights
  this.headerFontSize = 18;
  this.subHeaderFontSize = 15;
  this.bodyFontSize = 12;
  this.lineStart = 110;
  this.textStart = 110;
  this.currencyFontSize = 13;

  if (this.clientType === 'Distributor' || this.statementDesign === 'Distribution') {
    this.mapIncomes(this.analysis.gross.configurationByDistributionChannel);
  } else {
    this.mapIncomes(this.analysis.net.configurationByDistributionChannel);
  }

  this.create = function (filePath, callback) {
    const standardStatement = this;
    statement.lineStart = 150;
    statement.textStart = 150;

    async.waterfall([
      function (cb) {
        standardStatement.startPdf(filePath, 20);
        standardStatement.layout(cb);
      },
    ], (err) => {
      standardStatement.closePdf((fileLocation) => {
        callback(err, fileLocation);
      });
    });
  };

  this.layout = function (callback) {
    this.setupPage();
    if (this.statementHeaderType === 'Include Payee Address') {
      this.headerPayeeAddress();
    } else {
      this.header();
    }
    this.body((err) => {
      statement.footer();
      callback(err);
    });
  };

  this.setupPage = function () {
    this.pdf.registerFont('Body', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    this.pdf.registerFont('Neue', `${appRootDir}/assets/fonts/HelveticaNeue.ttf`);
    this.pdf.registerFont('Condensed', `${appRootDir}/assets/fonts/Helvetica-Condensed.ttf`);
    this.pdf.registerFont('H2', `${appRootDir}/assets/fonts/HelveticaNeueCondensedBold.ttf`);
    this.pdf.registerFont('Currency', `${appRootDir}/assets/fonts/texgyreheroscn-regular.otf`);
    this.pdf.font('Condensed');
  };

  // Header
  this.header = function () {
    this.clientLogo();
    this.clientAddress();
    this.pageTitle();
  };

  // Header With Payee Address
  this.headerPayeeAddress = function () {
    this.payeeAddress();
    this.clientLogoPayeeAddress();
    this.clientAddress();
    this.pageTitle();
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

  this.clientLogoPayeeAddress = function () {
    try {
      if (this.logo) { this.pdf.image(this.logo, 250, 20, { height: 80 }); }
    } catch (err) {
      logger.error(err);
      logger.debug(statement.logo);
    }
  };

  this.clientLogo = function () {
    try {
      if (this.logo) { this.pdf.image(this.logo, 20, 20, { height: 80 }); }
    } catch (err) {
      logger.error(err);
      logger.debug(statement.logo);
    }
  };

  this.clientAddress = function () {
    statement.pdf.fillColor(statement.offsetColour).fontSize(12).text(statement.companyName, 180, 25, { width: 400, align: 'right' });
    this.pdf.fillColor(statement.offsetColour).fontSize(12).text(this.address, 180, 40, { width: 400, align: 'right' });
  };

  this.pageTitle = function () {
    if (this.clientType === 'Distributor' || this.statementDesign === 'Distribution') {
      this.pdf.fillColor(statement.offsetColour).fontSize(32).font('H2').text('DISTRIBUTION STATEMENT', 30, 130, { width: 350, align: 'right' });
    } else {
      this.pdf.fillColor(statement.offsetColour).fontSize(32).font('H2').text('ROYALTY STATEMENT', 80, 130, { width: 300, align: 'right' });
    }
    this.pdf.fillColor('black').fontSize(18).font('Condensed').text(this.periodName, 75, 164, { width: 300, align: 'right' });
    this.pdf.fillColor('black').fontSize(18).font('Condensed').text(this.contractName, 380, 164, { width: 200, align: 'right' });
    statement.moveY(10);
    statement.pdf.lineWidth(1);
    statement.pdf.moveTo(this.lineStart, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    statement.moveY(10);
  };

  // Body
  this.body = function (callback) {
    async.waterfall([
      this.opening,
      this.paymentsSection,
      this.income,
      this.costs,
      this.reserves,
      function (cb) {
        if (statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible') {
          statement.profitShareTotals(cb);
        } else {
          cb();
        }
      },
      this.transactionsSection,
      this.advancesSection,
      this.closingBalanceSection,
      function (cb) {
        statement.footerText();
        cb();
      },
      statement.releaseIncome,
    ], callback);
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

  this.transactionsSection = function (callback) {
    // Set end date for comparison to transaction
    const statementDate = new Date(statement.date);
    statementDate.setDate(statementDate.getDate() + 1);
    statementDate.setUTCHours(0, 0, 0, 0);
    // Filter any transactions that aren't required
    const transactions = statement.transactions.map((transaction) => {
      if (!['Payment', 'Reserve Withheld', 'Reserve Released', 'Advance', 'Advance Recoupment', 'Negative Balance Recoupment', 'Negative Balance Adjustment'].includes(transaction.type) && transaction.date >= statement.startDate && transaction.date <= statementDate && (transaction.date != statement.date && transaction.name != statement.periodName)) {
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
    if (statement.profitShareUnrecoupedAdvanceStart) {
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

  this.closingBalanceSection = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('CLOSING', 20, statement.pdf.y, { width: 115, align: 'right' });
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Closing Balance', statement.closingBalance);
    if (statement.homeCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 350, statement.pdf.y, { width: 200, align: 'right' }); }
    callback();
  };

  this.distributionChannel = function (distributionChannel, callback) {
    if (distributionChannel && distributionChannel.value) {
      statement.headerRow(distributionChannel.type, statement.displaySeparatedDeductions ? distributionChannel.value + distributionChannel.deduction : distributionChannel.value, statement.offsetColour);
      let configurations;
      try {
        configurations = statement.configurationsByDistributionChannel[distributionChannel.type].sort(statement.sortByValue);
      } catch (e) { }
      if (!configurations) { configurations = []; }
      async.eachSeries(configurations, (configuration, cb) => {
        if (configuration.value) {
          statement.detailRow(configuration.type, statement.displaySeparatedDeductions ? configuration.value + configuration.deduction : configuration.value);
          cb();
        } else {
          cb();
        }
      }, () => {
        statement.moveDown();
        callback();
      });
    } else {
      callback();
    }
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

  this.combinedTransactions = function (type, callback) {
    if (statement.transactions && statement.transactions.length > 0) {
      statement.moveY(statement.subHeaderFontSize * 1.25);
      statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text(type === 'payments' ? 'PAYMENTS' : 'TRANSACTIONS', 20, statement.pdf.y);
      statement.moveY(0 - (statement.subHeaderFontSize * 1.25));
      let totalTransactions = 0;
      let count = 0;
      const statementDate = new Date(statement.date);
      statementDate.setDate(statementDate.getDate() + 1);
      statementDate.setUTCHours(0, 0, 0, 0);
      async.eachSeries(statement.transactions, (transaction, cb) => {
        // Add a conditon to handle showing transactions or payments based on the type.
        const typeCondition = type === 'payments' ? transaction.type === 'Payment' : transaction.type !== 'Payment';
        if (typeCondition && transaction.date >= statement.startDate && transaction.date <= statementDate && (transaction.date != statement.date && transaction.name != statement.periodName)) {
          totalTransactions += transaction.amount;
          // Only add description row when not a Payment
          if (transaction.type !== 'Payment') {
            const transactionName = `${moment(transaction.date).format(statement.dateFormat)} - ${transaction.name}`;
            statement.detailRow(transactionName, transaction.amount);
            count += 1;
          }
          cb();
        } else {
          cb();
        }
      }, () => {
        if (count > 0) {
          statement.moveY(statement.subHeaderFontSize * 1.25);
        }
        statement.headerRow(type === 'payments' ? 'PAYMENTS THIS PERIOD' : 'TOTAL TRANSACTIONS', totalTransactions);
        statement.moveY(statement.subHeaderFontSize * 1.25);
        statement.pdf.moveTo(statement.lineStart, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
        callback();
      });
    } else {
      callback();
    }
  };

  this.combinedOpeningBalance = function (callback) {
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('OPENING', 20, statement.pdf.y);
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Opening Balance', statement.openingBalance);
    statement.moveY(statement.subHeaderFontSize * 0.7);
    statement.pdf.moveTo(statement.lineStart, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
    callback();
  };

  // Function to create dictionary object for shorted Catalogue Numbers in salesReleases.
  const getShortestReleases = (salesReleases, costsReleases, cb) => {
    let dicObjects;
    // Get array of catalogue titles
    const releaseTitles = [].concat(Object.keys(salesReleases), Object.keys(costsReleases)).filter((value, index, self) => self.indexOf(value) === index);
    // Case all releaseTitles to Uppercase for first letter of each word.
    const releaseTitlesCased = releaseTitles.map((releaseId) => releaseId.toLowerCase().replace(/\b\w/g, (str) => str.toUpperCase()));
    // Check if clientId var is undefined
    if (!statementClientId) {
      let undefinedDicObj;
      releaseTitlesCased.forEach((release) => {
        undefinedDicObj = { ...undefinedDicObj, [release]: 'No CatNo' };
      });
      return cb(null, undefinedDicObj);
    }
    // Mongo Query
    const mongoQuery = { clientId: statementClientId, catNo: { $in: statement.allCatNos } };
    // Find all Releases from mongo that are included in the file
    Release.find(mongoQuery, 'catNo title', { catNo: 1 })
      .then((releases) => {
        // Sort releases by cat no length, so the shortest is first
        releases = releases.sort((a, b) => {
          let response = 0;
          if (a && a.catNo && b && b.catNo) {
            response = a.catNo.length > b.catNo.length ? 1 : -1;
          }
          return response;
        });
        // Organise and remove duplicates
        const filteredReleases = releases.reduce((a, b) => {
          if (!a.some((obj) => obj.title === b.title)) {
            a.push(b);
          }
          return a;
        }, []);
        // Save Dictionary Object
        filteredReleases.forEach((release) => {
          const { title, catNo } = release;
          dicObjects = { ...dicObjects, [title]: catNo };
        });
        // return dicObjects;
        cb(null, dicObjects);
      })
      .catch((err) => {
        logger.error('Error getting shortest releases:', err);
        throw new Error(err);
      });
  };

  this.releaseTitle = (title, version) => {
    let output = '';
    if (title) {
      output += title;
    }
    if (version) {
      output += ` (${version})`;
    }
    return output;
  };

  this.releaseIncome = function (callback) {
    statement.pdf.addPage();
    // Prepare data
    statement.prepareData((err, salesReleases, costsReleases) => {
      // Get Dictionary object of shortest releases
      getShortestReleases(salesReleases, costsReleases, (err, shortReleaseObject) => {
        // Check for errors
        if (err) {
          throw new Error(err);
        }
        // Get unique set of releaseIds from both sales and costs
        const releaseIds = [].concat(Object.keys(salesReleases), Object.keys(costsReleases)).filter((value, index, self) => self.indexOf(value) === index);
        releaseIds.sort((a, b) => {
          let catNoA; let catNoB;
          if (salesReleases[a]) {
          // Default to first line
            catNoA = salesReleases[a][0].catalogueCatNo;
            // Loop through lines to find digital
            salesReleases[a].forEach((line) => {
              if (line.distributionChannel === 'Digital' && line.catalogueCatNo) {
                catNoA = line.catalogueCatNo;
              }
            });
          }
          if (salesReleases[b]) {
          // Default to first line
            catNoB = salesReleases[b][0].catalogueCatNo;
            // Loop through lines to find digital
            salesReleases[b].forEach((line) => {
              if (line.distributionChannel === 'Digital' && line.catalogueCatNo) {
                catNoB = line.catalogueCatNo;
              }
            });
          }
          if (catNoA > catNoB) {
            return 1;
          }
          return -1;
        });
        // Set other costs on statement for reference later
        statement.otherCosts = costsReleases['No Release'];
        // Set top values
        statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('RELEASES', 20, statement.pdf.y);
        statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
        // Put No Release onto end
        const noReleaseIndex = releaseIds.indexOf('No Release');
        if (noReleaseIndex != -1) {
          releaseIds.splice(noReleaseIndex, 1);
          releaseIds.push('No Release');
        }
        // Loop through releases
        releaseIds.forEach((releaseId) => {
          // Prepare data on release
          let total = 0; let costsTotal = 0; const configs = {}; const configUnits = {}; const costsTypes = {}; let releaseTitle;
          const valueToSum = statement.contractType === 'Profit Share' ? 'contractCurrencyCalculationOutput' : 'contractCurrencyProRataAmount';
          if (salesReleases[releaseId]) {
            // Get concatenated release title
            const concatTitle = statement.releaseTitle(salesReleases[releaseId][0].catalogueReleaseTitle, salesReleases[releaseId][0].catalogueReleaseVersion);
            // Set release title - defaulting to first
            releaseTitle = [salesReleases[releaseId][0].catalogueReleaseArtist, concatTitle, salesReleases[releaseId][0].catalogueCatNo].filter(Boolean).join(' - ');
            salesReleases[releaseId].forEach((line) => {
              // Set value
              let saleValue = line[valueToSum];
              // Take away mechanical from royalty deals - is accounted for in profit share as it is on the calculation output
              if (valueToSum === 'contractCurrencyProRataAmount' && line.contractCurrencyMechanicalDeduction && statement.mechanicalType !== 'Post') {
                saleValue -= line.contractCurrencyMechanicalDeduction;
              }
              // Get total mechanical amount for deducting later on
              if (valueToSum === 'contractCurrencyProRataAmount' && line.contractCurrencyMechanicalDeduction) {
                statement.totalMechanicalAmount += line.contractCurrencyMechanicalDeduction;
              }
              // Set title to any digital release if it exists
              if (line.distributionChannel === 'Digital' && line.catalogueCatNo) {
                releaseTitle = [
                  line.catalogueReleaseArtist,
                  line.catalogueReleaseTitle,
                  shortReleaseObject[line.catalogueReleaseTitle]
                    ? shortReleaseObject[line.catalogueReleaseTitle]
                    : line.catalogueCatNo,
                ]
                  .filter(Boolean)
                  .join(' - ');
              }
              if (saleValue) {
              // Add line to total
                total += saleValue;
              }
              // Add config and value
              if (line.configuration) {
                configs[line.configuration] = configs[line.configuration] || 0;
                if (saleValue) {
                  configs[line.configuration] += saleValue;
                }
                configUnits[line.configuration] = configUnits[line.configuration] || 0;
                if (line.units) {
                  configUnits[line.configuration] += line.units;
                }
              }
            });
          }
          if (costsReleases[releaseId]) {
          // If no sales, so title hasn't been created
            if (!releaseTitle || releaseTitle === '') {
              releaseTitle = [costsReleases[releaseId][0].catalogueReleaseArtist, costsReleases[releaseId][0].catalogueReleaseTitle, costsReleases[releaseId][0].catalogueCatNo].filter(Boolean).join(' - ');
            }
            costsReleases[releaseId].forEach((line) => {
              if (line.contractCurrencyAmount) {
              // Get pro rata cost amount
                const proRataCostAmount = line.contractCurrencyAmount * (line.objectPercentage / 100);
                // Add line to total
                costsTotal += proRataCostAmount;
                // Add type and value
                if (line.type) {
                  costsTypes[line.type] = costsTypes[line.type] || 0;
                  costsTypes[line.type] += proRataCostAmount;
                } else {
                  costsTypes.Other = costsTypes.Other || 0;
                  costsTypes.Other += proRataCostAmount;
                }
              }
            });
          }
          // Release Title Row
          if (releaseId === 'No Release') {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.subHeaderFontSize).font('H2').text('Other Tracks', 110, statement.pdf.y);
            statement.moveY(5);
          } else {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.subHeaderFontSize).font('H2').text(releaseTitle, 110, statement.pdf.y);
            statement.moveY(5);
          }
          // Sales
          if (configs && Object.keys(configs).length > 0) {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text('INCOME', 110, statement.pdf.y, { width: 310 });
            statement.pdf.moveUp();
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text('UNITS', 330, statement.pdf.y, { width: 100 });
            statement.pdf.moveUp();
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text('REVENUE', 350, statement.pdf.y, { width: 200, align: 'right' });
            statement.moveY(2);
          }
          Object.keys(configs).sort((a, b) => {
            if (configs[a] > configs[b]) {
              return -1;
            } if (configs[b] > configs[a]) {
              return 1;
            }
            return 0;
          }).forEach((config) => {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(config, 110, statement.pdf.y, { width: 310 });
            statement.pdf.moveUp();
            if (configUnits[config]) {
              const units = configUnits[config].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
              statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(units, 330, statement.pdf.y, { width: 100 });
              statement.pdf.moveUp();
            }
            const value = statement.valueToCurrency(configs[config]);
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(value, 350, statement.pdf.y, { width: 200, align: 'right' });
            statement.moveY(2);
          });
          // Sales Total
          if (configs && Object.keys(configs).length > 0) {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text('Total', 110, statement.pdf.y, { width: 310 });
            statement.pdf.moveUp();
            total = statement.valueToCurrency(total);
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text(total, 350, statement.pdf.y, { width: 200, align: 'right' });
            statement.moveY(5);
          }
          // Costs
          if (costsTypes && Object.keys(costsTypes).length > 0) {
            statement.moveY(10);
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text('COSTS', 110, statement.pdf.y, { width: 310 });
            statement.moveY(2);
          }
          Object.keys(costsTypes).sort((a, b) => {
            if (costsTypes[a] > costsTypes[b]) {
              return -1;
            } if (costsTypes[b] > costsTypes[a]) {
              return 1;
            }
            return 0;
          }).forEach((config) => {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(config, 110, statement.pdf.y, { width: 310 });
            statement.pdf.moveUp();
            const value = statement.valueToCurrency(0 - costsTypes[config]);
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(value, 350, statement.pdf.y, { width: 200, align: 'right' });
            statement.moveY(2);
          });
          // Costs Total
          if (costsTypes && Object.keys(costsTypes).length > 0) {
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text('Total', 110, statement.pdf.y, { width: 310 });
            statement.pdf.moveUp();
            costsTotal = statement.valueToCurrency(0 - costsTotal);
            statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('H2').text(costsTotal, 350, statement.pdf.y, { width: 200, align: 'right' });
            statement.moveY(5);
          }
          statement.moveY(10);
          statement.pdf.moveTo(110, statement.pdf.y).lineTo(630, statement.pdf.y).stroke();
          statement.moveY(20);
        });
        callback();
      });
    });
  };

  this.prepareData = function (callback) {
    async.waterfall([
      function (cb) {
        if (!statement.salesData) {
        // Get data when none passed
          statement.getSalesData(cb);
        } else {
        // Continue when sales data already exists
        // Sales Data to Template
          statement.salesData = statement.salesData.map((item) => statement.lineToTemplate(item, statement.salesTemplate));
          cb();
        }
      },
      function (cb) {
        if (!statement.costsData) {
        // Get data when none passed
          statement.getCostsData(cb);
        } else {
        // Continue when sales data already exists
          cb();
        }
      },
      function (cb) {
      // Convert sales lines into releases objects
        const salesReleases = statement.organiseSalesCostsData(statement.salesData);
        const costReleases = statement.organiseSalesCostsData(statement.costsData);
        cb(null, salesReleases, costReleases);
      },
    ], callback);
  };

  this.getSalesData = function (callback) {
    async.waterfall([
      function (cb) {
        if (!statement.salesData && !Array.isArray(statement.salesData)) {
        // For large statements, get data from DB
          const columns = collectData.getSelectAndSumColumnArray(statement.salesTemplate, statement.dbFilter);
          statement.bigQuery.getAggregate(statement.bigQuery.outputTable, columns.selectCols, columns.sumCols, 'lines', statement.dbFilter, {}, (err, res) => {
            if (err) {
              cb(err);
            } else {
              statement.salesData = res;
              cb();
            }
          });
        } else {
          cb();
        }
      },
      function (cb) {
      // Sales Data to Template
        statement.salesData = statement.salesData.map((item) => statement.lineToTemplate(item, statement.salesTemplate));
        cb();
      },
    ], callback);
  };

  this.lineToTemplate = function (item, template) {
    if (Array.isArray(item)) {
      const object = {};
      item.forEach((field, index) => {
        if (field && template[index]) {
          object[template[index].field] = field;
        }
      });
      return object;
    }
    return item;
  };

  this.organiseSalesCostsData = function (salesData) {
  // Create an object for release IDs
    const object = {};
    // Loop through sales lines
    salesData.forEach((line) => {
      if (line.catalogueCatNo && !statement.allCatNos.includes(line.catalogueCatNo)) {
        statement.allCatNos.push(line.catalogueCatNo);
      }
      if (line.catalogueReleaseTitle) {
      // When releaseId exists, store all lines against release
        const title = String(line.catalogueReleaseTitle).toUpperCase();
        object[title] = object[title] || [];
        object[title].push(line);
      } else {
      // When no release exists, store against No Release
        object['No Release'] = object['No Release'] || [];
        object['No Release'].push(line);
      }
    });
    // Return object
    return object;
  };

  this.getCostsData = function (callback) {
    const costFilter = { ...statement.dbFilter };
    delete costFilter.royaltyRate;
    const columns = collectData.getSelectAndSumColumnArray(statement.costsTemplate, costFilter);
    statement.bigQuery.getAggregate(statement.bigQuery.costsTable, columns.selectCols, columns.sumCols, 'lines', costFilter, {}, (err, res) => {
      if (err) {
        callback(err);
      } else {
        statement.costsData = res;
        callback();
      }
    });
  };

  this.headerRow = function (type, value, colour) {
    if (!type || type === '') { type = 'Other'; }
    if (!colour || colour === '') { colour = 'black'; }
    statement.pdf.fillColor(colour).fontSize(statement.subHeaderFontSize).font('H2').text(type.toUpperCase(), this.textStart, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor(colour).fontSize(statement.subHeaderFontSize).font('H2').text(statement.valueToCurrency(value), 350, statement.pdf.y, { width: 200, align: 'right' });
    statement.moveY(5);
  };

  this.detailRow = function (type, value, notMoney) {
    if (!type || type === '') { type = 'Other'; }
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(type, this.textStart, statement.pdf.y, { width: 310 });
    statement.pdf.moveUp();
    if (!notMoney) { value = statement.valueToCurrency(value); }
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.bodyFontSize).font('Body').text(value, 350, statement.pdf.y, { width: 200, align: 'right' });
    statement.moveY(2);
  };

  this.totals = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 1.25);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('NET AMOUNT', 20, statement.pdf.y);
    statement.pdf.moveUp();
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text(statement.valueToCurrency(statement.netOutput), 350, statement.pdf.y, { width: 200, align: 'right' });
    if (statement.homeCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 350, statement.pdf.y, { width: 200, align: 'right' }); }
    callback();
  };

  this.combinedTotals = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 1.25);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('BALANCE', 20, statement.pdf.y);
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Closing Balance', statement.closingBalance);
    if (statement.homeCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 350, statement.pdf.y, { width: 200, align: 'right' }); }
    callback();
  };

  this.distributorCombinedTotals = function (callback) {
    statement.moveY(statement.subHeaderFontSize * 1.25);
    statement.pdf.fillColor(statement.offsetColour).fontSize(statement.headerFontSize).font('H2').text('BALANCE', 20, statement.pdf.y);
    statement.moveY(0 - (statement.subHeaderFontSize * 1.4));
    statement.headerRow('Closing Balance', statement.transactionalClosingBalance);
    if (statement.homeCurrency) { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`All amounts are in ${statement.homeCurrency}`, 350, statement.pdf.y, { width: 200, align: 'right' }); }
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

  // Footer
  this.footer = function () {
    try {
      if (!this.removeFooterImage) { this.pdf.image(`${appRootDir}/assets/images/Produced-By-Logo.jpg`, 270, 800, { height: 30 }); }
    } catch (err) {
      logger.error(err);
      logger.debug(statement.logo);
    }
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(`Run No: ${statement.runNo}`, 10, 800, { width: 300, align: 'left' });
    statement.pdf.fillColor(statement.offsetColour).fontSize(9).font('Body').text(moment().format(`${statement.dateFormat} HH:mm:SS`), 10, 810, { width: 300, align: 'left' });
  };

  // Footer text
  this.footerText = function () {
    if (this.customText && this.customText !== '') {
      statement.moveY(30);
      this.customText.split('\n').forEach((customTextElement) => {
        statement.pdf.fillColor(statement.offsetColour).fontSize(12.5).font('Body').text(customTextElement, 70, statement.pdf.y, { width: 450, align: 'center' });
        statement.moveY(6);
      });
    }
    if (this.contactEmail && this.contactEmail !== '') { statement.pdf.fillColor(statement.offsetColour).fontSize(12).font('Body').text(`Any questions, please contact ${this.contactEmail}`, 145, 760, { width: 300, align: 'center' }); }
  };

  // Catalogue Summary
  this.catalogueSummaryPage = function () {
    // Add page
    this.pdf.addPage();
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
    const territoryMappings = {
      WW: 'World', Europe: 'All Europe', Africa: 'All Africa', Asia: 'All Asia', Americas: 'All Americas', Oceania: 'All Oceania', DZ: 'Algeria', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', KM: 'Comoros', CG: 'Congo, Republic of the', CD: 'Congo, The Democratic Republic Of The', CI: 'Cote d\'Ivoire', DJ: 'Djibouti', EG: 'Egypt', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia', GA: 'Gabon', GM: 'Gambia, The', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenya', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', MA: 'Morocco', MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RE: 'Reunion', RW: 'Rwanda', SH: 'Saint Helena', ST: 'Sao Tome and Principe', SN: 'Senegal', SC: 'Seychelles', SL: 'Sierra Leone', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', SD: 'Sudan', SZ: 'Swaziland', TZ: 'Tanzania', TG: 'Togo', TN: 'Tunisia', UG: 'Uganda', EH: 'Western Sahara', ZM: 'Zambia', ZW: 'Zimbabwe', AW: 'Aruba', AI: 'Anguilla', AG: 'Antigua and Barbuda', AR: 'Argentina', BS: 'Bahamas, The', BB: 'Barbados', BZ: 'Belize', BM: 'Bermuda', BO: 'Bolivia', BR: 'Brazil', VG: 'British Virgin Islands', CA: 'Canada', KY: 'Cayman Islands', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CW: 'Curacao', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador', SV: 'El Salvador', FK: 'Falkland Islands (Islas Malvinas)', GF: 'French Guiana', GL: 'Greenland', GD: 'Grenada', GP: 'Guadeloupe', GT: 'Guatemala', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaica', MQ: 'Martinique', MX: 'Mexico', MS: 'Montserrat', AN: 'Netherlands Antilles', NI: 'Nicaragua', PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PR: 'Puerto Rico', BL: 'Saint Barthelemy', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines', SR: 'Suriname', TT: 'Trinidad and Tobago', TC: 'Turks and Caicos Islands', US: 'United States', UY: 'Uruguay', VE: 'Venezuela', VI: 'Virgin Islands', AF: 'Afghanistan', AM: 'Armenia', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh', BT: 'Bhutan', BN: 'Brunei', KH: 'Cambodia', CN: 'China', GE: 'Georgia', HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KP: 'Korea, North', KR: 'Korea, South', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', MO: 'Macao', MY: 'Malaysia', MV: 'Maldives', MN: 'Mongolia', MM: 'Myanmar (Burma)', NP: 'Nepal', OM: 'Oman', PK: 'Pakistan', PS: 'Palestinian Territories', PH: 'Philippines', QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', LK: 'Sri Lanka', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan', TH: 'Thailand', TL: 'Timor-Leste', TR: 'Turkey', TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan', VN: 'Vietnam', YE: 'Yemen', AL: 'Albania', AD: 'Andorra', AT: 'Austria', BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BG: 'Bulgaria', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland', FR: 'France', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece', GG: 'Guernsey', VA: 'Holy See (Vatican City)', HU: 'Hungary', IS: 'Iceland', IE: 'Ireland', IM: 'Isle Of Man', IT: 'Italy', JE: 'Jersey', LV: 'Latvia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'Macedonia', MT: 'Malta', MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SM: 'San Marino', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SJ: 'Svalbard', SE: 'Sweden', CH: 'Switzerland', UA: 'Ukraine', GB: 'United Kingdom', AX: 'Aland Islands', AS: 'American Samoa', AQ: 'Antarctica', AU: 'Australia', BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CK: 'Cook Islands', FJ: 'Fiji', PF: 'French Polynesia', TF: 'French Southern Territories', GU: 'Guam', HM: 'Heard and McDonald Islands', KI: 'Kiribati', MH: 'Marshall Islands', FM: 'Micronesia, Federated States of', NR: 'Nauru', NC: 'New Caledonia', NZ: 'New Zealand', NU: 'Niue', NF: 'Norfolk Island', MP: 'Northern Mariana Islands', PW: 'Palau', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', SB: 'Solomon Islands', GS: 'South Georgia and South Sandwich Island', TK: 'Tokelau', TO: 'Tonga', TV: 'Tuvalu', UM: 'US Minor Outlying Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', WS: 'Western Samoa',
    };
    let territories = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.territories : statement.analysis.net.territories;
    if (!territories) { territories = []; }
    territories = territories.map((item) => {
      item.type = territoryMappings[item.type];
      return item;
    });
    this.topItems(territories, 'TOP TERRITORIES', 10, false);
    // Add page
    this.pdf.addPage();
    this.summaryPageSetup();
    let sources = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.sources : statement.analysis.net.sources;
    if (!sources) { sources = []; }
    this.topItems(sources, 'TOP SOURCES', 10, true);
    let subSources = statement.clientType === 'Distributor' || statement.statementDesign === 'Distribution' ? statement.analysis.gross.subSources : statement.analysis.net.subSources;
    if (!subSources) { subSources = []; }
    this.topItems(subSources, 'TOP SUBSOURCES', 10, true);
  };
};

module.exports = Standard;
