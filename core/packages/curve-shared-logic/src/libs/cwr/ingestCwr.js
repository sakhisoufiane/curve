/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable no-prototype-builtins */
/* eslint-disable eqeqeq */
/* eslint-disable no-shadow */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-param-reassign */
/* eslint-disable radix */
/* eslint-disable consistent-return */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const _ = require('lodash');
const CwrReader = require('./cwrReader');
const CwrUtils = require('./utils');
const lowerCaseString = require('../lowerCaseString');
const { CISAC_APPROVED_COUNTRIES_COUNT } = require('./territories');
const IpChainUtils = require('./ipChain');

const territoryMappings = {
  4: 'AF',
  8: 'AL',
  12: 'DZ',
  20: 'AD',
  24: 'AO',
  28: 'AG',
  31: 'AZ',
  32: 'AR',
  36: 'AU',
  40: 'AT',
  44: 'BS',
  48: 'BH',
  50: 'BD',
  51: 'AM',
  52: 'BB',
  56: 'BE',
  64: 'BT',
  68: 'BO',
  70: 'BA',
  72: 'BW',
  76: 'BR',
  84: 'BZ',
  90: 'SB',
  96: 'BN',
  100: 'BG',
  104: 'MM',
  108: 'BI',
  112: 'BY',
  116: 'KH',
  120: 'CM',
  124: 'CA',
  132: 'CV',
  140: 'CF',
  144: 'LK',
  148: 'TD',
  152: 'CL',
  156: 'CN',
  158: 'TW',
  170: 'CO',
  174: 'KM',
  178: 'CG',
  180: 'CD',
  188: 'CR',
  191: 'HR',
  192: 'CU',
  196: 'CY',
  203: 'CZ',
  204: 'BJ',
  208: 'DK',
  212: 'DM',
  214: 'DO',
  218: 'EC',
  222: 'SV',
  226: 'GQ',
  231: 'ET',
  232: 'ER',
  233: 'EE',
  242: 'FJ',
  246: 'FI',
  250: 'FR',
  258: 'PF',
  262: 'DJ',
  266: 'GA',
  268: 'GE',
  270: 'GM',
  276: 'DE',
  288: 'GH',
  296: 'KI',
  300: 'GR',
  308: 'GD',
  320: 'GT',
  324: 'GN',
  328: 'GY',
  332: 'HT',
  336: 'VA',
  340: 'HN',
  344: 'HK',
  348: 'HU',
  352: 'IS',
  356: 'IN',
  360: 'ID',
  364: 'IR',
  368: 'IQ',
  372: 'IE',
  376: 'IL',
  380: 'IT',
  384: 'CI',
  388: 'JM',
  392: 'JP',
  398: 'KZ',
  400: 'JO',
  404: 'KE',
  408: 'KP',
  410: 'KR',
  414: 'KW',
  417: 'KG',
  418: 'LA',
  422: 'LB',
  426: 'LS',
  428: 'LV',
  430: 'LR',
  434: 'LY',
  438: 'LI',
  440: 'LT',
  442: 'LU',
  446: 'MO',
  450: 'MG',
  454: 'MW',
  458: 'MY',
  462: 'MV',
  466: 'ML',
  470: 'MT',
  478: 'MR',
  480: 'MU',
  484: 'MX',
  492: 'MC',
  496: 'MN',
  498: 'MD',
  499: 'ME',
  504: 'MA',
  508: 'MZ',
  512: 'OM',
  516: 'NA',
  520: 'NR',
  524: 'NP',
  528: 'NL',
  540: 'NC',
  548: 'VU',
  554: 'NZ',
  558: 'NI',
  562: 'NE',
  566: 'NG',
  578: 'NO',
  583: 'FM',
  584: 'MH',
  585: 'PW',
  586: 'PK',
  591: 'PA',
  598: 'PG',
  600: 'PY',
  604: 'PE',
  608: 'PH',
  616: 'PL',
  620: 'PT',
  624: 'GW',
  626: 'TL',
  630: 'PR',
  634: 'QA',
  642: 'RO',
  643: 'RU',
  646: 'RW',
  659: 'KN',
  662: 'LC',
  670: 'VC',
  674: 'SM',
  678: 'ST',
  682: 'SA',
  686: 'SN',
  688: 'RS',
  690: 'SC',
  694: 'SL',
  702: 'SG',
  703: 'SK',
  704: 'VN',
  705: 'SI',
  706: 'SO',
  710: 'ZA',
  716: 'ZW',
  724: 'ES',
  728: 'SS',
  729: 'SD',
  732: 'EH',
  740: 'SR',
  748: 'SZ',
  752: 'SE',
  756: 'CH',
  760: 'SY',
  762: 'TJ',
  764: 'TH',
  768: 'TG',
  776: 'TO',
  780: 'TT',
  784: 'AE',
  788: 'TN',
  792: 'TR',
  795: 'TM',
  798: 'TV',
  800: 'UG',
  804: 'UA',
  807: 'MK',
  818: 'EG',
  826: 'GB',
  834: 'TZ',
  840: 'US',
  854: 'BF',
  858: 'UY',
  860: 'UZ',
  862: 'VE',
  882: 'WS',
  887: 'YE',
  894: 'ZM',
  175: 'YT',
  638: 'RE',
  654: 'SH',
  533: 'AW',
  660: 'AI',
  60: 'BM',
  535: 'BQ',
  92: 'VG',
  136: 'KY',
  531: 'CW',
  238: 'FK',
  254: 'GF',
  304: 'GL',
  312: 'GP',
  474: 'MQ',
  500: 'MS',
  530: 'AN',
  652: 'BL',
  663: 'MF',
  534: 'SX',
  666: 'PM',
  796: 'TC',
  850: 'VI',
  275: 'PS',
  234: 'FO',
  292: 'GI',
  831: 'GG',
  833: 'IM',
  832: 'JE',
  744: 'SJ',
  248: 'AX',
  16: 'AS',
  10: 'AQ',
  74: 'BV',
  86: 'IO',
  162: 'CX',
  166: 'CC',
  184: 'CK',
  260: 'TF',
  316: 'GU',
  334: 'HM',
  570: 'NU',
  574: 'NF',
  580: 'MP',
  612: 'PN',
  239: 'GS',
  772: 'TK',
  581: 'UM',
  876: 'WF',
  2100: [
    'DZ', 'AO', 'BW', 'BI', 'CM', 'CV', 'CF',
    'TD', 'KM', 'CG', 'CD', 'BJ', 'GQ', 'ET',
    'ER', 'DJ', 'GA', 'GM', 'GH', 'GN', 'CI',
    'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML',
    'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG',
    'GW', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO',
    'ZA', 'ZW', 'SS', 'SD', 'EH', 'SZ', 'TG',
    'TN', 'UG', 'EG', 'TZ', 'BF', 'ZM',
  ],
  2101: [
    'AG', 'AR', 'BS', 'BB', 'BO',
    'BR', 'BZ', 'CA', 'CL', 'CO',
    'CR', 'CU', 'DM', 'DO', 'EC',
    'SV', 'GD', 'GT', 'GY', 'HT',
    'HN', 'JM', 'MX', 'NI', 'PA',
    'PY', 'PE', 'PR', 'KN', 'LC',
    'VC', 'SR', 'TT', 'US', 'UY',
    'VE',
  ],
  2102: [
    'AR', 'BO', 'BR', 'BZ',
    'CA', 'CL', 'CO', 'CR',
    'EC', 'SV', 'GT', 'GY',
    'HN', 'MX', 'NI', 'PA',
    'PY', 'PE', 'SR', 'US',
    'UY', 'VE',
  ],
  2103: [
    'AG', 'BB', 'CU',
    'DM', 'DO', 'GD',
    'HT', 'JM', 'PR',
    'KN', 'LC', 'VC',
    'TT',
  ],
  2104: [
    'AU', 'BN', 'CA', 'CL',
    'CN', 'TW', 'HK', 'ID',
    'JP', 'KR', 'MO', 'MY',
    'MX', 'NZ', 'PG', 'PE',
    'PH', 'PR', 'RU', 'SG',
    'VN', 'TH', 'US',
  ],
  2105: [
    'BN', 'MM', 'KH',
    'ID', 'LA', 'MY',
    'PH', 'SG', 'VN',
    'TH',
  ],
  2106: [
    'AF', 'AZ', 'BH', 'BD', 'AM', 'BT',
    'BN', 'MM', 'KH', 'LK', 'CN', 'TW',
    'CY', 'GE', 'HK', 'IN', 'ID', 'IR',
    'IQ', 'IL', 'JP', 'KZ', 'JO', 'KP',
    'KR', 'KW', 'KG', 'LA', 'LB', 'MO',
    'MY', 'MV', 'MN', 'OM', 'NP', 'PK',
    'PH', 'TL', 'QA', 'SA', 'SG', 'VN',
    'SY', 'TJ', 'TH', 'AE', 'TR', 'TM',
    'UZ', 'YE',
  ],
  2107: ['AU', 'SB', 'FJ', 'NC', 'VU', 'NZ'],
  2108: [
    'AL', 'BA', 'BG',
    'HR', 'GR', 'ME',
    'RO', 'RS', 'SI',
    'MK',
  ],
  2109: ['EE', 'LV', 'LT'],
  2110: ['BE', 'LU', 'NL'],
  2111: ['IE', 'GB'],
  2112: [
    'AG', 'BS', 'BB',
    'DM', 'GD', 'JM',
    'KN', 'LC', 'VC',
    'TT',
  ],
  2113: [
    'BZ', 'CR',
    'SV', 'GT',
    'HN', 'NI',
    'PA',
  ],
  2114: [
    'AG', 'AU', 'BS', 'BD', 'BB', 'BW', 'BZ',
    'SB', 'BN', 'CM', 'CA', 'LK', 'CY', 'DM',
    'FJ', 'GM', 'GH', 'KI', 'GD', 'GY', 'HK',
    'IN', 'JM', 'KE', 'LS', 'MW', 'MY', 'MV',
    'MT', 'MU', 'MZ', 'NA', 'NR', 'VU', 'NZ',
    'NG', 'PK', 'PG', 'KN', 'LC', 'VC', 'SC',
    'SL', 'SG', 'ZA', 'ZW', 'SZ', 'TO', 'TT',
    'TV', 'UG', 'GB', 'TZ', 'WS', 'ZM',
  ],
  2115: [
    'BW', 'CM', 'GM', 'GH',
    'KE', 'LS', 'MW', 'MU',
    'MZ', 'NA', 'NG', 'SC',
    'SL', 'ZA', 'ZW', 'SZ',
    'UG', 'TZ', 'ZM',
  ],
  2116: [
    'BD', 'BN', 'LK',
    'CY', 'HK', 'IN',
    'MY', 'MV', 'PK',
    'SG',
  ],
  2117: ['AU', 'SB', 'FJ', 'VU', 'NZ'],
  2118: [
    'AZ', 'AM', 'BY',
    'GE', 'KZ', 'KG',
    'MD', 'RU', 'TJ',
    'TM', 'UA', 'UZ',
  ],
  2119: [
    'AL', 'BG', 'BY',
    'CZ', 'EE', 'HU',
    'LV', 'LT', 'MD',
    'PL', 'RO', 'RU',
    'SK', 'UA',
  ],
  2120: [
    'AL', 'AD', 'AT', 'BE', 'BA', 'BG',
    'BY', 'HR', 'CZ', 'DK', 'EE', 'FI',
    'FR', 'DE', 'GR', 'VA', 'HU', 'IS',
    'IE', 'IT', 'LV', 'LI', 'LT', 'LU',
    'MT', 'MC', 'MD', 'ME', 'NL', 'NO',
    'PL', 'PT', 'RO', 'RU', 'SM', 'RS',
    'SK', 'SI', 'ES', 'SE', 'CH', 'UA',
    'MK', 'GB',
  ],
  2121: [
    'AT', 'BE', 'BG', 'CY', 'CZ',
    'DK', 'EE', 'FI', 'FR', 'DE',
    'GR', 'HU', 'IS', 'IE', 'IT',
    'LV', 'LI', 'LT', 'LU', 'MT',
    'NL', 'NO', 'PL', 'PT', 'RO',
    'SK', 'SI', 'ES', 'SE', 'GB',
  ],
  2122: [
    'AL', 'AD', 'AT', 'BE', 'BA', 'BG',
    'BY', 'HR', 'CZ', 'DK', 'EE', 'FI',
    'FR', 'DE', 'GR', 'VA', 'HU', 'IT',
    'LV', 'LI', 'LT', 'LU', 'MC', 'MD',
    'ME', 'NL', 'NO', 'PL', 'PT', 'RO',
    'RU', 'SM', 'RS', 'SK', 'SI', 'ES',
    'SE', 'CH', 'UA', 'MK',
  ],
  2123: [
    'AT', 'BE', 'BG', 'HR', 'CY',
    'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT',
    'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI',
    'ES', 'SE', 'GB',
  ],
  2124: ['AT', 'DE', 'CH'],
  2125: [
    'AF', 'BH', 'BD', 'BT',
    'LK', 'IN', 'IR', 'IQ',
    'JO', 'KW', 'MV', 'MN',
    'OM', 'NP', 'PK', 'QA',
    'SA', 'AE', 'YE',
  ],
  2126: ['CA', 'MX', 'PR', 'US'],
  2127: ['DK', 'FI', 'IS', 'NO', 'SE'],
  2128: ['DZ', 'LY', 'MA', 'TN', 'EG'],
  2129: ['CA', 'MX', 'US'],
  2130: [
    'AU', 'SB', 'FJ', 'PF',
    'KI', 'NR', 'NC', 'VU',
    'NZ', 'FM', 'MH', 'PW',
    'PG', 'TO', 'TV', 'WS',
  ],
  2131: ['DK', 'NO', 'SE'],
  2132: [
    'AR', 'BO', 'BR',
    'CL', 'CO', 'EC',
    'GY', 'PY', 'PE',
    'SR', 'UY', 'VE',
  ],
  2133: [
    'BN', 'MM', 'KH',
    'ID', 'LA', 'MY',
    'PH', 'TL', 'SG',
    'VN', 'TH',
  ],
  2134: [
    'AG', 'BS', 'BB',
    'CU', 'DM', 'DO',
    'GD', 'HT', 'JM',
    'PR', 'KN', 'LC',
    'VC', 'TT',
  ],
  2136: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS', 'XK'],
};

module.exports = {
  ingest({ Work, Track, Release, Publisher, Composer, s3Key, bucket, clientId, defaults, submitter, Import }, callback) {
    const ingestCwr = this;
    if (!s3Key) {
      // Handle no S3Key Error
      callback(new Error('No file passed'));
    } else if (!bucket) {
      // Handle no Bucket Error
      callback(new Error('No S3 bucket passed'));
    } else if (!clientId) {
      // Handle no Client ID Error
      callback(new Error('ClientId must be passed'));
    } else {
      async.waterfall([
        function (cb) {
          // Download File
          fileManager.downloadFromS3(s3Key, bucket, cb);
        },
        function (localFile, cb) {
          // Handle no file found error
          if (!localFile) {
            cb(new Error(`No file was found at location ${s3Key}`));
          } else {
            // Setup instance of cwrReader
            const cwrReader = new CwrReader();
            // Read CWR
            cwrReader.readFile(localFile, (err) => {
              // Return found works and any reported works with issues
              cb(err, cwrReader.works, cwrReader.errors);
            });
          }
        },
        function (data, errors, cb) {
          // Ingest Data
          ingestCwr.ingestData({ Work, Track, Release, Publisher, Composer, data, errors, clientId, defaults, submitter, Import }, cb);
        },
      ], callback);
    }
  },
  async ingestData({ Work, Track, Release, Publisher, Composer, data, errors, clientId, defaults, submitter, Import }, callback) {
    const ingestCwr = this;
    if (!data) {
      // Handle no data Error
      callback(new Error('No data passed'));
    } else if (!clientId) {
      // Handle no Client ID Error
      callback(new Error('ClientId must be passed'));
    } else {
      // Setup count
      let count = 0;
      let errorCount = errors.length ?? 0;

      // Loop through data array
      async.eachSeries(data, (workData, cb) => {
        // Check for object and not null
        if (workData) {
          // Ingest work object
          ingestCwr.ingestWork({ Work, Track, Release, Publisher, Composer, workData, clientId, defaults, submitter, errors, Import }, async (err) => {
            // Only save if the error count increased and every 100
            if (errorCount !== errors.length && count % 100 === 0) {
              errorCount = errors.length;
              Import.errors = errors;
              await Import.save();
            }

            if (!err) {
              // Increment when no error
              count += 1;

              if (count % 100 === 0) {
                Import.ingestedWorks = count;
                await Import.save();
              }

              if (count % 1000 === 0) {
                logger.info(`${clientId} - ${count} records imported.`);
              }
            } else {
              errors.push({ error: err.toString(), title: workData?.title, identifier: workData?.submitterWorkNo });
            }
            cb();
          });
        } else {
          cb();
        }
      }, (err) => {
        // Return any errors and count
        callback(err, count, errors);
      });
    }
  },
  ingestWork({ Work, Track, Release, Publisher, Composer, workData, clientId, defaults, submitter, errors, Import }, callback) {
    const ingestCwr = this;
    if (!workData) {
      // Handle no data Error
      callback(new Error('No data passed'));
    } else if (!clientId) {
      // Handle no Client ID Error
      callback(new Error('ClientId must be passed'));
    } else {
      async.waterfall([
        function (cb) {
          // Only import work if Ingestion Territory is part of publisher territories
          if (defaults.ingestionTerritory && workData?.publisherTerritories) {
            // Split the territories into individual arrays by publisher - Merging territories by chain as you go
            const splitTerritories = ingestCwr.splitTerritoriesByLineNo(workData.publisherChains, workData.publisherTerritories);

            // Return an object of unique teritory groups - this gives us the top rights chains
            const splitByTerritoryGroups = ingestCwr.splitTerritoryGroups(splitTerritories, workData.publisherChains, defaults);
            if (!_.isEmpty(splitByTerritoryGroups)) {
              cb();
            } else {
              cb(new Error('Ingestion Territory is not part of publisher territories'));
            }
          } else {
            // If Ingestion Territory is not set, import all works
            cb();
          }
        },
        function (cb) {
          // Find or create work
          ingestCwr.findPreviousWork({ Work, data: workData, clientId, Import }, (err, foundWork) => {
            const importSource = {
              importId: Import._id,
              importPartnerId: Import.importPartnerId._id,
              action: foundWork ? 'Updated' : 'Created',
              date: new Date(),
            };

            if (foundWork) {
              if (!foundWork.source) foundWork.source = [];
              foundWork.source.push(importSource);
            }

            if (!foundWork) {
              foundWork = new Work({ clientId, source: [importSource] });
            }

            cb(err, foundWork);
          });
        },
        function (work, cb) {
          // Set Data
          ingestCwr.setWorkData({ Track, Release, Publisher, Composer, work, workData, defaults, submitter, errors, Import }, cb);
        },
        function (work, cb) {
          // Save
          work.save()
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error('Error saving work ', err);
              cb(err);
            });
        },
      ], callback);
    }
  },
  findPreviousWork({ Work, data, clientId, Import }, callback) {
    const filter = {
      clientId,
      'source.importPartnerId': Import.importPartnerId,
      $or: [{ identifier: data.submitterWorkNo }, { foreignId: data.submitterWorkNo }],
    };
    Work.findOne(filter)
      .then((foundWork) => {
        callback(null, foundWork);
      })
      .catch((err) => {
        logger.error('Error finding work ', err);
        callback(err);
      });
  },
  setWorkData({ Track, Release, Publisher, Composer, work, workData, defaults, submitter, errors, Import }, callback) {
    const ingestCwr = this;
    async.waterfall([
      function (cb) {
        // Set work level values
        ingestCwr.setMainWorkParams(work, workData, defaults, submitter);
        cb();
      },
      function (cb) {
        // Set IP chain
        ingestCwr.setIpChain({ Publisher, Composer, work, workData, defaults, errors, Import }, cb);
      },
      function (cb) {
        // Set Rights
        ingestCwr.setRights(work, defaults, cb);
      },
      function (cb) {
        // Set Recordings
        ingestCwr.setRecordings({ Track, Release, work, workData }, cb);
      },
    ], (err) => {
      callback(err, work);
    });
  },
  setMainWorkParams(work, workData, defaults, submitter) {
    const ingestCwr = this;
    // Title
    if (workData && workData.title) { work.title = workData.title; }
    // Submitter Work No
    work.submitterWorkNos = work.submitterWorkNos || {};
    if (workData && workData.submitterWorkNo) { work.submitterWorkNos[submitter] = workData.submitterWorkNo; }
    // Main Identifier
    if (defaults.setMainIdentifier && workData && workData.submitterWorkNo) {
      work.identifier = workData.submitterWorkNo;
    } else if (!defaults.setMainIdentifier && workData && workData.submitterWorkNo && !work.foreignId) {
      work.foreignId = workData.submitterWorkNo;
    }
    // ISWC
    if (workData && workData.iswc && workData.iswc !== '00000000000') { work.iswc = workData.iswc; }
    // Tunecode
    if (workData && workData.tunecode && workData.tunecode !== '000000000000') { work.tunecode = workData.tunecode; }
    // Grand Rights
    if (workData && typeof workData.grandRights === 'boolean') { work.grandRights = workData.grandRights; }
    // Priority
    if (workData && typeof workData.priorityFlag === 'boolean') { work.priority = workData.priorityFlag; }
    // Work Distribution Category
    if (workData && workData.musicalWorkDistributionCategory) { work.workDescriptionCategory = ingestCwr.mapWorkDescription(workData.musicalWorkDistributionCategory); }
    // Language
    if (workData && workData.language) { work.workLanguage = ingestCwr.mapLanguage(workData.language); }
    // Composite Type
    if (workData && workData.compositeType) { work.compositeType = ingestCwr.mapCompositeType(workData.compositeType); }
    // Composite Count
    if (workData && workData.compositeComponentCount) { work.compositeCount = ingestCwr.toNumber(workData.compositeComponentCount); }
    // Composite Works
    if (workData && workData.compositeWorks?.length) { work.compositeWorks = workData.compositeWorks; }
    // Existing work has composite works AND newly imported has none, clear the composite works
    if (work.compositeType !== 'None' && !workData.compositeType) {
      work.compositeType = 'None';
      work.compositeWorks = [];
    }
    // Production Library
    if (workData && workData.productionLibrary) {
      work.productionLibrary = workData.productionLibrary;
      work.productionTitle = workData.productionTitle;
      work.cdIdentifier = workData.cdIdentifier;
      work.cutNo = workData.cutNo;
      work.libraryTitle = workData.libraryTitle;
    }
    // Version Type
    if (workData && workData.versionType) { work.versionType = ingestCwr.mapVersionType(workData.versionType); }
    // Music Arrangement Type
    if (workData && workData.musicArrangement) { work.arrangementType = ingestCwr.mapArrangementType(workData.musicArrangement); }
    // Lyric Adaption Type
    if (workData && workData.lyricAdaption) { work.lyricAdaptionType = ingestCwr.mapLyricAdaptionType(workData.lyricAdaption); }
    // Alternate Titles
    if (workData && workData.alternateTitles) {
      // Get Alt Titles as strings
      const newAltTitles = workData.alternateTitles.map((alt) => { if (alt) { return { title: alt.alternateTitle, language: ingestCwr.mapLanguage(alt.languageCode) }; } }).filter(Boolean);
      // Add to previous alt titles and get only unique values
      work.alternateTitles = [].concat(work.alternateTitles, newAltTitles).filter(onlyUnique);
    }
    // Catalogue Groups
    if (defaults && defaults.catalogueGroups) {
      // Add to previous catalogue groups
      work.catalogueGroups = [].concat(work.catalogueGroups, defaults.catalogueGroups).filter(onlyUnique);
    }
    // Performers
    if (workData && workData.performingArtists) {
      // Loop through performing artists
      workData.performingArtists.forEach((performer) => {
        // When performer exists
        if (performer) {
          // Create name string
          let performerName = `${performer.performingArtistFirstName} ${performer.performingArtistLastName}`;
          // Strip any white space
          performerName = performerName.trim();
          // Add to performers array
          work.performers.push(performerName);
          // Get only unique performers
          work.performers = work.performers.filter(onlyUnique);
        }
      });
    }
    // Reset IP Chain
    work.rightsChain = [];
    // Set territories
    work.territories = defaults.territories;
  },
  mapWorkDescription(value) {
    switch (value) {
      case 'POP':
        return 'Pop';
      case 'JAZ':
        return 'Jazz';
      case 'SER':
        return 'Classical';
      case 'UNC':
        return 'Undefined';
      default:
        return null;
    }
  },
  mapLanguage(value) {
    const languages = {
      // eslint-disable-next-line max-len
      AR: 'Arabic', AS: 'Assamese', AY: 'Aymara', AZ: 'Azerbaijani', BA: 'Bashkir', EU: 'Basque', BN: 'Bengali', DZ: 'Bhutani', BH: 'Bihari', BI: 'Bislama', BR: 'Breton', BG: 'Bulgarian', MY: 'Burmese', BE: 'Byelorussian', KM: 'Cambodian', CA: 'Catalan', ZH: 'Chinese', CO: 'Corsican', HR: 'Croatian', CS: 'Czech', DA: 'Danish', NL: 'Dutch', EN: 'English', EO: 'Esperanto', ET: 'Estonian', FO: 'Faeroese', FA: 'Farsi', FJ: 'Fiji', FI: 'Finnish', FR: 'French', FY: 'Frisian', GL: 'Galician', KA: 'Georgian', DE: 'German', EL: 'Greek', KL: 'Greenlandic', GN: 'Guarani', GU: 'Gujarati', HA: 'Hausa', HW: 'Hawaii', IW: 'Hebrew', HI: 'Hindi', HU: 'Hungarian', IS: 'Icelandic', IN: 'Indonesian', IA: 'Interlingua', IE: 'Interlingue', IK: 'Inupiak', GA: 'Irish', IT: 'Italian', JA: 'Japanese', JW: 'Javanese', KN: 'Kannada', KS: 'Kashmiri', KK: 'Kazakh', RW: 'Kinyarwanda', KY: 'Kirghiz', RN: 'Kirundi', KO: 'Korean', KU: 'Kurdish', LO: 'Laothian', LA: 'Latin', LV: 'Latvian', LN: 'Lingala', LT: 'Lithuanian', MK: 'Macedonian', MG: 'Malagasy', MS: 'Malay', ML: 'Malayalam', MT: 'Maltese', MI: 'Maori', MR: 'Marathi', MO: 'Moldavian', MN: 'Mongolian', NA: 'Nauru', ND: 'Ndebele', NE: 'Nepali', 'otho NS': 'North', NO: 'Norwegian', OC: 'Occitan', OR: 'Oriya', OM: 'Oromo', PM: 'Papiamento', PS: 'Pashto', PL: 'Polish', PT: 'Portuguese', PA: 'Punjabi', QU: 'Quechua', 'omance RM': 'Rhaeto', RO: 'Romanian', RU: 'Russian', SM: 'Samoan', SG: 'Sangro', SA: 'Sanskrit', 'aelic GD': 'Scots', SR: 'Serbian', 'roatian SH': 'Serbo', ST: 'Sesotho', TN: 'Setswana', SN: 'Shona', SD: 'Sindhi', SI: 'Singhalese', SS: 'Siswati', SK: 'Slovak', SL: 'Slovenian', SO: 'Somali', ES: 'Spanish', SU: 'Sudanese', SW: 'Swahili', SV: 'Swedish', TL: 'Tagalog', TG: 'Tajik', TA: 'Tamil', TT: 'Tatar', TE: 'Telugu', TH: 'Thai', BO: 'Tibetan', TI: 'Tigrinya', TO: 'Tonga', TS: 'Tsonga', TR: 'Turkish', TK: 'Turkmen', TW: 'Twi', UK: 'Ukranian', UR: 'Urdu', UZ: 'Uzbek', VE: 'Venda', VI: 'Vietnamese', VO: 'Volapuk', CY: 'Welsh', WO: 'Wolof', XH: 'Xhosa', JI: 'Yiddish', YO: 'Yoruba', ZU: 'Zulu',
    };
    return languages[value] || '';
  },
  mapVersionType(value) {
    switch (value) {
      case 'MOD':
        return 'Modification';
      default:
        return 'Original Work';
    }
  },
  mapCompositeType(value) {
    switch (value) {
      case 'COS':
        return 'Composite of Samples';
      case 'MED':
        return 'Medley';
      case 'POT':
        return 'Potpourri';
      case 'UCO':
        return 'Unspecified';
      default:
        return null;
    }
  },
  mapArrangementType(value) {
    switch (value) {
      case 'ORI':
        return 'Original';
      case 'NEW':
        return 'New Music Added';
      case 'ARR':
        return 'Arrangement';
      case 'ADM':
        return 'Addition of Music to Text';
      case 'UNS':
        return 'Unspecified';
      default:
        return null;
    }
  },
  mapLyricAdaptionType(value) {
    switch (value) {
      case 'ORI':
        return 'Original';
      case 'NON':
        return 'None';
      case 'NEW':
        return 'New Lyrics Added';
      case 'MOD':
        return 'Modification';
      case 'REP':
        return 'Replaced';
      case 'ADL':
        return 'Addition of Lyrics to Music';
      case 'TRA':
        return 'Translation';
      case 'UNS':
        return 'Unspecified';
      default:
        return null;
    }
  },
  toNumber(value) {
    // Force into number
    value = parseInt(value);
    // Check if failed to turn into integer
    if (!isNaN(value)) {
      return value;
    }
  },
  setRights(work, defaults, callback) {
    if (defaults && defaults.contracts) {
      // Set display percentages
      defaults.contracts = defaults.contracts.map((contract) => ({ contractId: contract.contractId, percentage: contract.percentage, displayPercentage: contract.percentage }));
      // Add to previous sales rights
      work.salesReturnsRights = [].concat(work.salesReturnsRights, defaults.contracts).map(onlyUniqueContracts).filter(Boolean);
      // Rebuild display rights
      work.salesReturnsRightsDisplay = [].concat(work.salesReturnsRightsDisplay, defaults.contracts).map(onlyUniqueContracts).filter(Boolean);
    }
    callback();
  },
  setRecordings({ Track, Release, work, workData }, callback) {
    const ingestCwr = this;
    // Only when recordings are included
    if (workData && workData.recordings) {
      // Loop thoruhg each recording
      async.eachSeries(workData.recordings, (recording, cb) => {
        // Only when recording has isrc
        if (recording && recording.isrc) {
          async.waterfall([
            function (waterfallCb) {
              // Find track
              Track.findOne({ isrc: recording.isrc, clientId: work.clientId })
                .then((foundTrack) => {
                  waterfallCb(null, foundTrack);
                })
                .catch((err) => {
                  logger.error('Error finding track: ', err);
                  waterfallCb(err);
                });
            },
            function (track, waterfallCb) {
              if (track) {
                // Return track if found
                waterfallCb(null, track);
              } else {
                // Create new track
                const track = new Track({
                  clientId: work.clientId, artist: recording.displayArtist, label: recording.recordingLabel, isrc: recording.isrc, duration: ingestCwr.toNumber(recording.releaseDuration), version: recording.versionTitle,
                });
                track.title = recording.recordingTitle ? recording.recordingTitle : work.title;
                track.save()
                  .then((foundTrack) => {
                    waterfallCb(null, foundTrack);
                  })
                  .catch((err) => {
                    logger.error('Error saving track: ', err);
                    waterfallCb(err);
                  });
              }
            },
            function (track, waterfallCb) {
              // Attach track to work
              if (track) {
                work.trackIds.push(track._id.toString());
                work.trackIds = work.trackIds.filter(onlyUnique);
              }
              waterfallCb(null, track);
            },
            function (track, waterfallCb) {
              // When cat no exists
              if (recording.catNo && recording.catNo !== '') {
                // Set Release
                ingestCwr.setReleases({ Release, track, recording, clientId: work.clientId }, waterfallCb);
              } else {
                // Return callback
                waterfallCb();
              }
            },
          ], cb);
        } else {
          // Return callback
          cb();
        }
      }, callback);
    } else {
      // Return callback
      callback();
    }
  },
  setReleases({ Release, track, recording, clientId }, callback) {
    if (recording && recording.catNo) {
      async.waterfall([
        function (cb) {
          // Find release by cat no
          Release.findOne({ clientId, catNo: recording.catNo })
            .then((foundRelease) => {
              cb(null, foundRelease);
            })
            .catch((err) => {
              logger.error('Error finding release: ', err);
              cb(err);
            });
        },
        function (release, cb) {
          // Create release if one not found
          if (!release) {
            release = new Release({
              clientId, title: recording.albumTitle, label: recording.albumLabel, artist: recording.displayArtist, catNo: recording.catNo, barcode: recording.barcode,
            });
          }
          cb(null, release);
        },
        function (release, cb) {
          // Add track to release
          release.trackIds.push(track._id.toString());
          release.trackIds = release.trackIds.filter(onlyUnique);
          // Save Release
          release.save()
            .then((savedRelease) => {
              cb(null, savedRelease);
            })
            .catch((err) => {
              logger.error('Error saving release: ', err);
              cb(err);
            });
        },
      ], callback);
    }
  },
  setIpChain({ Publisher, Composer, work, workData, defaults, errors, Import }, callback) {
    const ingestCwr = this;
    let territoryCodeError = false;
    async.waterfall([
      function (cb) {
        // Publisher chains
        const { publisherChains, publisherTerritories } = ingestCwr.combinePublisherChains(workData.publisherChains, workData.publisherTerritories);
        if (publisherChains) {
          // Split the territories into individual arrays by publisher - Merging territories by chain as you go
          const splitTerritories = ingestCwr.splitTerritoriesByLineNo(workData.publisherChains, workData.publisherTerritories);

          const originalTerritoryGroups = ingestCwr.splitTerritoryGroups(splitTerritories, publisherChains, defaults);
          // Remove duplicate territories from groups (if found), leaving us with the most specific unique territories
          const splitByTerritoryGroups = CwrUtils.consolidateGroups(originalTerritoryGroups);

          // Consolidate territories now that we have the correct chain groupings from the previous step
          const consolidatedTerritories = CwrUtils.consolidatePublisherTerritories(splitTerritories, splitByTerritoryGroups);

          let reversePublisherChains = true;
          async.eachSeries(Object.keys(splitByTerritoryGroups), (territoryGroupKey, territoryGroupCb) => {
            let rightsChain = {};
            // Keep 2136 as World rather than splitting into individual territories
            if (territoryGroupKey === 'WW') {
              rightsChain = { territory: 'WW', children: [] };
            } else {
              rightsChain = { territory: 'specific', territoryCodes: { name: splitByTerritoryGroups[territoryGroupKey].join(), codes: splitByTerritoryGroups[territoryGroupKey] }, children: [] };
            }
            async.eachSeries(Object.keys(publisherChains), (key, keyCb) => {
              // Reverse to get the collector first, original publisher last - Do this only once!
              if (reversePublisherChains) {
                publisherChains[key] = publisherChains[key].reverse();
              }
              const seenPublisher = {};
              async.eachSeries(publisherChains[key], (publisherData, publisherCb) => {
                // Check if last in chain

                // Have we merged this publisher down by territory - check the chain publisher identifier and store if not seen already
                const publisherKey = `${key}-${publisherData.interestedPartyNo}-${publisherData.publisherType}-${publisherData.lineType}`;
                if (!seenPublisher[publisherKey]) {
                  seenPublisher[publisherKey] = true;

                  // get the list of territories by chain e.g. "01"
                  const territoriesKey = consolidatedTerritories[key];

                  // does the current publisher have a list of territories
                  const territoriesInterestedPartyNo = territoriesKey?.find((territory) => territory[publisherData.interestedPartyNo]);

                  // When the publisher has a list of territories, get the list
                  const territoriesArray = territoriesInterestedPartyNo ? territoriesInterestedPartyNo[publisherData.interestedPartyNo] : [];

                  // return the first included 'I' territory as a object for use when creating publisher shares
                  const territoryShares = territoriesArray.find((territory) => territory.includeExclusionIndicator === 'I');

                  // take the array of Included and Excluded territories and retun the mapped ISO codes e.g. ['GB','IE']
                  const mappedTerritories = ingestCwr.mapTerritories(territoriesArray);

                  // take the list of territories on the rights chain and return the common list of territories with this publisher - used when assigning Collection shares and creating publishers
                  let commonTerritories = [];

                  if (territoriesArray.length > 0 && mappedTerritories.length === 0) {
                    if (!territoryCodeError) errors.push(`Invalid territory code in work ${work.title}`);
                    territoryCodeError = true;
                  }
                  if (mappedTerritories[0] === 'WW') {
                    if (rightsChain.territory === 'WW') commonTerritories = ['WW'];
                  } else if (rightsChain.territoryCodes) {
                    commonTerritories = mappedTerritories.filter((territory) => rightsChain.territoryCodes.codes.includes(territory));
                  }

                  if (!territoryCodeError) {
                    // Is the publisher the last in the chain - this is used later to attach composers to the last in the chain
                    const lastInChain = workData.publisherChains[key].indexOf(publisherData) == publisherChains[key].length - 1;

                    // ** Marco what is happening here - this needs clarification **
                    if (publisherTerritories && publisherData.controlled && !checkInterestedPartyTerritory(publisherTerritories, publisherData.publisherSequence, publisherData.interestedPartyNo)) {
                      // Include when there are no territories set, as this means there are more items in the row
                      publisherData.includePublisher = true;
                    }

                    // Check if a publisher should be created for the current territory chain
                    const createPublisherForChain = IpChainUtils.createPublisherForChain(publisherData, commonTerritories);

                    if (createPublisherForChain) {
                      // Create publisher data
                      ingestCwr.createPublisher({ Publisher, Composer, publisherData, workData, defaults, clientId: work.clientId, lastInChain, key, shares: territoryShares, commonTerritories, mainChainTerritoriesArray: splitByTerritoryGroups[territoryGroupKey], Import }, (err, publisher) => {
                        if (err) {
                          publisherCb(err);
                        } else {
                          // Create children if they don't exist
                          publisher.children = publisher.children || [];
                          // Add onto chain
                          const numKey = Number(key) - 1;
                          // are we the first child publisher in the chain? if so add as first child, if not, add to deepest child
                          if (!rightsChain.children[numKey]) {
                            ingestCwr.addPublisherToChain(publisher, rightsChain, numKey);
                          } else {
                            ingestCwr.addPublisherToChain(publisher, rightsChain.children[numKey]);
                          }
                          publisherCb();
                        }
                      });
                    } else {
                      publisherCb();
                    }
                  } else {
                    publisherCb();
                  }
                } else {
                  publisherCb();
                }
              }, (err) => {
                // Set Territories
                // Check if claiming party is set in defaults to be added to the top of each controlled chain
                if (defaults.claimingParty && defaults.claimingParty.publisherId) {
                  // Add default publisher to controlled chain
                  rightsChain.children = rightsChain.children.filter(Boolean);
                  rightsChain.children = rightsChain.children.map((child) => {
                    if (child && child.controlled && child.publisherId !== defaults.claimingParty.publisherId) {
                      // Setup publisher
                      const newChild = {
                        type: 'Publisher',
                        publisherId: defaults.claimingParty.publisherId,
                        contractType: defaults.claimingParty.contractType,
                        controlled: true,
                        performanceOwnership: 0,
                        mechanicalOwnership: 0,
                        performanceCollection: child.performanceCollection,
                        mechanicalCollection: child.mechanicalCollection,
                        children: [],
                      };
                      // Zero out collections from top of chain
                      child.performanceCollection = 0;
                      child.mechanicalCollection = 0;
                      // Add rest of chain to this
                      newChild.children.push(child);
                      child = newChild;
                    }
                    return child;
                  });
                }

                keyCb(err);
              });
            }, () => {
              // Add chain to work
              work.rightsChain.push(rightsChain);
              reversePublisherChains = false;
              territoryGroupCb();
            });
          }, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // Other Writers
        if (workData.composers) {
          const composerIds = Object.keys(workData.composers);
          async.eachSeries(composerIds, (composerId, composerIdCb) => {
            // Only add composers that arent's part of a publisher's chain
            if (workData.composers?.[composerId]?.lineType === 'OWR' && !workData.composers?.[composerId]?.publishers?.length) {
              // Get composer data
              ingestCwr.createComposer({ Composer, composerData: workData.composers[composerId], defaults, clientId: work.clientId, key: composerId, mainChainTerritoriesArray: null, Import }, (err, composer) => {
                // Loop through each rights chain to add unknown composers
                work.rightsChain = work.rightsChain.map((rightsChain) => {
                  if (rightsChain && rightsChain.children && composer) {
                    // Add composer to rights chain
                    rightsChain.children.push(composer);
                  }
                  return rightsChain;
                });
                composerIdCb();
              });
            } else {
              composerIdCb();
            }
          }, cb);
        } else {
          cb();
        }
      },
    ], callback);
  },
  territoryCodeToTerritoriesArray(territoryCode, includeExclude) {
    let result = [];
    if (includeExclude === 'I') {
      result = territoryMappings[parseInt(territoryCode)];
      if (result && typeof result === 'string') {
        result = [result];
      }
    }
    return result;
  },
  combinePublisherChains(publisherChains, publisherTerritories) {
    const ingestCwr = this;
    if (publisherChains && Object.keys(publisherChains).length > 1) {
      const tempChains = {};
      // Loop through each chain
      Object.values(publisherChains).forEach((chain) => {
        // Create a unique key combining publisherSequence and interestedPartyNo
        let chainKey = '';
        chain.forEach((item) => {
          chainKey += `${item.publisherSequence}-${item.interestedPartyNo}|`; // Unique identifier
        });

        // Use the unique key to group chains
        if (!tempChains[chainKey]) {
          tempChains[chainKey] = chain;
        } else {
          // Get publisherSequence for comparison
          const chainNoA = tempChains[chainKey][0].publisherSequence;
          const chainNoB = chain[0].publisherSequence;

          if (chainNoA === chainNoB) {
            // Merge shares only if publisherSequence matches
            tempChains[chainKey].map((tempChainItem) => {
              chain.forEach((item) => {
                if (item.interestedPartyNo === tempChainItem.interestedPartyNo) {
                  // Combine shares
                  tempChainItem.prOwnershipShare += item.prOwnershipShare;
                  tempChainItem.mrOwnershipShare += item.mrOwnershipShare;
                  tempChainItem.srOwnershipShare += item.srOwnershipShare;
                }
              });
              return tempChainItem;
            });

            // Merge territories for matching publisherSequence
            publisherTerritories = ingestCwr.mergePublisherTerritories(publisherTerritories, chainNoA, chainNoB);
          }
        }
      });

      // Reformat to original object shape
      const returnPublisherChains = {};
      Object.values(tempChains).forEach((chain) => {
        if (chain[0]) {
          returnPublisherChains[chain[0].publisherSequence] = chain;
        }
      });
      return { publisherChains: returnPublisherChains, publisherTerritories };
    }

    // Return original if only 1 chain
    return { publisherChains, publisherTerritories };
  },
  mergePublisherTerritories(publisherTerritories, itemA, itemB) {
    if (publisherTerritories && publisherTerritories[itemA] && publisherTerritories[itemB]) {
      // Loop through A
      publisherTerritories[itemA] = publisherTerritories[itemA].map((territoryA) => {
        // Loop through B looking for matches
        publisherTerritories[itemB].forEach((territoryB) => {
          // Check territory B matches the same territory code as territory A
          if (territoryA && territoryB && territoryA.territories === territoryB.territories) {
            territoryA.mrCollectionShare += territoryB.mrCollectionShare;
            territoryA.prCollectionShare += territoryB.prCollectionShare;
            territoryA.srCollectionShare += territoryB.srCollectionShare;
          }
        });
        return territoryA;
      });
      // Remove itemB from publisherTerritories object
      delete publisherTerritories[itemB];
    }
    return publisherTerritories;
  },
  splitTerritoriesByLineNo(publishers, territories) {
    const result = {};

    // Iterate through each key in the publishers object
    for (const publisherKey in publishers) {
      if (territories && territories.hasOwnProperty(publisherKey)) {
        // Find the corresponding key in the territories object

        // Get the arrays of publishers and territories
        const publisherArray = publishers[publisherKey];
        let territoriesArray = territories[publisherKey];

        // Initialize an array to store the split territories
        const splitTerritories = [];

        // Iterate through the territories array
        if (territoriesArray) {
          publisherArray.forEach((publisher) => {
            const cwrLineNo = Number(publisher.cwrLineNo);

            // Find the corresponding territories with cwrLineNo + 1 in the publisher array
            const matchingPublisher = territoriesArray.find((territory) => Number(territory.cwrLineNo) === cwrLineNo + 1);

            // If a matching publisher is found, split by publisher
            if (matchingPublisher) {
              const index = territoriesArray.indexOf(matchingPublisher);
              const afterSplit = territoriesArray.slice(index);
              // lets get the territories up to the next 001 sequence
              const currentArray = [];

              for (const item of afterSplit) {
                if (item.sequenceNo === '001' && currentArray.length > 0) {
                  break; // Stop after the first array is created
                }
                currentArray.push(item);
              }
              territoriesArray = afterSplit;

              // Check if splitTerritories already has an object with the key publisher.interestedPartyNo ** Marco Maybe we need to be more specific here? Check contractType? controlled?
              const existingObjectIndex = splitTerritories.findIndex((obj) => obj.hasOwnProperty(publisher.interestedPartyNo));

              if (existingObjectIndex !== -1) {
                // If the key already exists, concatenate currentArray to the existing value
                const existingKey = Object.keys(splitTerritories[existingObjectIndex])[0];
                splitTerritories[existingObjectIndex][existingKey] = splitTerritories[existingObjectIndex][existingKey].concat(currentArray);
              } else {
                // If the key doesn't exist, create a new object with the key publisher.interestedPartyNo
                const newObject = { [publisher.interestedPartyNo]: currentArray };
                splitTerritories.push(newObject);
              }
            }
          });
        }
        // Store the split territories in the result object
        result[publisherKey] = splitTerritories;
      }
    }

    return result;
  },
  splitTerritoryGroups(splitTerritories, publisherChains, defaults) {
    const ingestCwr = this;
    const splitByTerritoryGroups = {};

    if (!publisherChains) {
      return splitByTerritoryGroups;
    }

    const publisherChainKeys = Object.keys(publisherChains);

    publisherChainKeys.map((key) => {
      if (splitTerritories[key]) {
        // get the array of publishers for each chain e.g. key = "01"
        const splitTerritoriesPublishers = Object.values(splitTerritories[key]);
        // for each interestedPartyNo get the array of territories "I" and "E"
        splitTerritoriesPublishers.map((splitTerritoriesPublisher) => {
          Object.keys(splitTerritoriesPublisher).map((splitTerritoriesPublisherPartyNo) => {
            // for each interestedPartyNo territories "I" and "E" map to ISO Territories
            const mappedTerritories = ingestCwr.mapTerritories(
              splitTerritoriesPublisher[splitTerritoriesPublisherPartyNo],
            );

            const sortedTerritories = [...mappedTerritories].sort().join('');
            // if default territoryIngestion only add the territory chain if it includes the territoryIngestion
            if (!splitByTerritoryGroups[sortedTerritories] && (!defaults.ingestionTerritory || mappedTerritories.includes(defaults.ingestionTerritory))) {
              splitByTerritoryGroups[sortedTerritories] = mappedTerritories;
            }
          });
        });
      }
    });

    return splitByTerritoryGroups;
  },
  createPublisher({ Publisher, Composer, publisherData, workData, defaults, clientId, lastInChain, key, shares, commonTerritories, mainChainTerritoriesArray, Import }, callback) {
    const ingestCwr = this;
    if (publisherData) {
      // Deal with unknown publisher
      if (publisherData.publisherUnknownIndicator === 'Y' || publisherData.publisherName === '') {
        publisherData.publisherName = 'Unknown Publisher';
      }
      async.waterfall([
        function (cb) {
          if (publisherData?.publisherIpiName && removeLeadingZeros(publisherData.publisherIpiName)) {
            // If publisherIpiName exists, try to find existing Publisher by CAE
            const caeWithoutLeadingZeros = removeLeadingZeros(publisherData.publisherIpiName);
            Publisher.findOne({
              clientId,
              $or: [
                { cae: publisherData.publisherIpiName },
                { cae: caeWithoutLeadingZeros },
                { caeWithoutLeadingZeros },
              ],
            })
              .then((foundPublisher) => {
                cb(null, foundPublisher);
              })
              .catch((err) => {
                logger.error('Error finding publisher: ', err);
                cb(err);
              });
          } else {
            cb(null, null);
          }
        },
        function (publisher, cb) {
          if (publisher) {
            // Return publisher if found by CAE
            cb(null, publisher);
          } else {
            // Find publisher by name if not found by CAE
            Publisher.findOne({ clientId, lowerCaseName: lowerCaseString(publisherData.publisherName) })
              .then((foundPublisher) => {
                cb(null, foundPublisher);
              })
              .catch((err) => {
                logger.error('Error finding publisher by name: ', err);
                cb(err);
              });
          }
        }, function (publisher, cb) {
          if (publisher) {
            // Return publisher if found by name
            // NOTE: if users import a publisher with a duplicate name but different CAE, the new CAE will be ignored. See ticket CUR-1238
            cb(null, publisher);
          } else {
            // Create new publisher if not found by either CAE or name
            publisher = new Publisher({
              clientId,
              name: publisherData.publisherName,
              cae: padLeadingZeros(publisherData.publisherIpiName, 11),
              performancePro: ingestCwr.mapSociety(publisherData.prSociety),
              mechanicalPro: ingestCwr.mapSociety(publisherData.mrSociety),
              syncPro: ingestCwr.mapSociety(publisherData.srSociety),
              controlled: publisherData.lineType === 'SPU',
              ...(Import?.defaults?.setPublisherInterestedParty && publisherData.interestedPartyNo && { interestedPartyId: publisherData.interestedPartyNo }),
            });
            publisher.save()
              .then((savedPublisher) => {
                cb(null, savedPublisher);
              })
              .catch((err) => {
                logger.error('Error saving publisher: ', err);
                cb(err);
              });
          }
        },
        function (publisher, cb) {
          let prCollectionShare = 0;
          let mrCollectionShare = 0;
          // does the publisher collect in this territory
          if (commonTerritories?.length) {
            prCollectionShare = publisherData.prCollectionShare || publisherData.prCollectionShare === 0 ? publisherData.prCollectionShare : 0;
            mrCollectionShare = publisherData.mrCollectionShare || publisherData.mrCollectionShare === 0 ? publisherData.mrCollectionShare : 0;
          }
          if (publisherData.lineType !== 'SPU') {
            prCollectionShare = publisherData.prOwnershipShare;
            mrCollectionShare = publisherData.mrOwnershipShare;
          }
          // does the publisher have territory shares
          if (shares && commonTerritories?.length) {
            prCollectionShare = shares.prCollectionShare;
            mrCollectionShare = shares.mrCollectionShare;
          }
          const result = {
            type: 'Publisher',
            publisherId: publisher._id.toString(),
            contractType: ingestCwr.mapPublisherType(publisherData.publisherType),
            controlled: publisherData.lineType === 'SPU',
            performanceOwnership: publisherData.prOwnershipShare,
            performanceCollection: prCollectionShare,
            mechanicalOwnership: publisherData.mrOwnershipShare,
            mechanicalCollection: mrCollectionShare,
            interestedPartyNo: publisherData.interestedPartyNo,
            children: [],
          };
          cb(null, result);
        },
        function (result, cb) {
          // Only if last in chain
          if (lastInChain) {
            ingestCwr.getComposersForPublisher({ Composer, publisher: result, defaults, clientId, workData, key, mainChainTerritoriesArray, Import }, cb);
          } else {
            cb(null, result);
          }
        },
      ], callback);
    } else {
      callback();
    }
  },
  mapPublisherType(publisherType) {
    switch (publisherType) {
      case 'AM':
        return 'Admin';
      case 'E':
        return 'Original Publisher';
      case 'SE':
        return 'Sub Publisher';
      case 'AQ':
        return 'Acquirer';
      case 'PA':
        return 'Income Participant';
      default:
        return null;
    }
  },
  mapSociety(societyCode) {
    if (societyCode) {
      societyCode = parseInt(societyCode).toString();
      const mappings = {
        0: 'DP',
        1: 'ACUM',
        2: 'ADDAF',
        3: 'AEPI',
        4: 'AGADU',
        5: 'AKM',
        6: 'BUCUDA',
        7: 'APDAYC',
        8: 'APRA',
        9: 'ARTISJUS',
        10: 'ASCAP',
        11: 'AUSTRO-MECHANA',
        12: 'AMCOS',
        13: 'AWA',
        14: 'ARGENTORES',
        15: 'APA',
        16: 'BUMDA',
        17: 'AMRA',
        18: 'BGDA',
        19: 'BMDA',
        20: 'SODRAC',
        21: 'BMI',
        22: 'MCSN',
        23: 'BUMA',
        24: 'BURIDA',
        25: 'BSDA',
        26: 'CASH',
        27: 'CAPAC',
        28: 'LITA',
        29: 'SCD',
        30: 'AMAR',
        31: 'DILIA',
        32: 'FILSCAP',
        33: 'OMDA',
        34: 'HARRY FOX',
        35: 'GEMA',
        36: 'IPRS',
        37: 'BUBEDRA',
        38: 'JASRAC',
        39: 'MUSICAUTOR',
        40: 'KODA',
        41: 'LITERAR-MECHANA',
        42: 'LVG',
        43: 'MCSK',
        44: 'MCPS',
        45: 'BBDA',
        46: 'MRS',
        47: 'BCDA',
        48: 'NCB',
        49: 'ONDA',
        50: 'OSA',
        51: 'PROLITTERIS',
        52: 'PRS',
        53: 'PROCAN',
        54: 'ALCS',
        55: 'SABAM',
        56: 'SACD',
        57: 'SACERAU',
        58: 'SACEM',
        59: 'SACM',
        60: 'SACVEN',
        61: 'SADAIC',
        62: 'SADEMBRA',
        63: 'SAMRO',
        64: 'SOKOJ',
        65: 'SAYCE',
        66: 'SBACEM',
        67: 'SBAT',
        68: 'SDRM',
        69: 'SPA',
        70: 'SOGEM',
        71: 'SESAC',
        72: 'SGAE',
        73: 'SCAM',
        74: 'SIAE',
        75: 'SUISSIMAGE',
        76: 'ACEMLA',
        77: 'STEF',
        78: 'STEMRA',
        79: 'STIM',
        80: 'SUISA',
        81: 'SARRAL',
        82: 'OTPDA',
        83: 'SONECA',
        84: 'SAYCO',
        85: 'SOZA',
        86: 'SICAM',
        87: 'SPACEMF',
        88: 'CMRRA',
        89: 'TEOSTO',
        90: 'TONO',
        91: 'SSA',
        92: 'SOCINADA',
        93: 'UBC',
        94: 'RAO',
        95: 'VG WORT',
        96: 'COTT',
        97: 'ZAIKS',
        98: 'ZIMRA',
        99: 'NS',
        101: 'SOCAN',
        102: 'NASCAM',
        103: 'ACDAM',
        104: 'MACP',
        105: 'MASA',
        106: 'COMPASS',
        107: 'ACAM',
        108: 'CHA',
        109: 'KCI',
        110: 'LATGA-A',
        111: 'HDS-ZAMP',
        112: 'SAZAS',
        113: 'LAA',
        114: 'AGAYC',
        115: 'UCMR-ADA',
        116: 'EAU',
        117: 'MESAM',
        118: 'KOMCA',
        119: 'MCSC',
        120: 'LIRA',
        121: 'VDFS',
        122: 'AKKA/LAA',
        123: 'COSGA',
        124: 'COSOMA',
        125: 'BNDA',
        126: 'MCT',
        127: 'ALBAUTOR',
        128: 'IMRO',
        129: 'SOBODAYCOM',
        130: 'BUTODRA',
        131: 'SADA',
        132: 'BILD-KUNST',
        133: 'ZAMCOPS',
        134: 'SLPRS',
        135: 'SADH',
        136: 'ZAMP - MACÉDOINE',
        137: 'SOFAM',
        138: 'KOPIOSTO',
        139: 'COPY-DAN BILLEDKUNST',
        140: 'UACRR',
        142: 'DALRO',
        143: 'TEATERAUTOR',
        144: 'HAA',
        145: 'DPRS',
        146: 'SPAC',
        147: 'FILMAUTOR',
        148: 'ADAGP',
        149: 'ARS',
        150: 'BEELDRECHT',
        151: 'BONO',
        152: 'BUS',
        153: 'DACS',
        154: 'HUNGART',
        155: 'SOMAAP',
        156: 'VAGA',
        157: 'VBK',
        158: 'VEGAP',
        159: 'VISCOPY',
        160: 'RUPIS',
        161: 'MUST',
        162: 'AMPAL',
        163: 'APG-JAPAN',
        164: 'APSAV',
        165: 'ATN',
        166: 'AUTORARTE',
        167: 'BURAFO',
        168: 'CAL',
        169: 'COSCAP',
        170: 'CPSN',
        171: 'CREAIMAGEN',
        172: 'DGA',
        173: 'DIRECTORES',
        174: 'FLIM JUS',
        175: 'COPYRO',
        176: 'JACAP',
        177: 'KAZAK',
        178: 'KOSA',
        179: 'KUVASTO',
        180: 'MUSIKEDITION',
        181: 'NMPA',
        182: 'PAPPRI',
        183: 'SACK',
        184: 'SARTEC',
        185: 'SESAM',
        186: 'SGDL',
        187: 'SNAC',
        188: 'SOCIETE DE L’IMAGE',
        189: 'SOCINPRO',
        190: 'SOPE',
        191: 'SPACQ',
        192: 'SFF',
        193: 'THE SOCIETY OF AUTHORS',
        194: 'UFFICIO LEGALE',
        195: 'VEVAM',
        196: 'WGA',
        197: 'WGJ',
        198: 'ZAMP ASSOCIATION OF SLOVENIA',
        199: 'ZAPA',
        200: 'MSG',
        201: 'ABRAMUS',
        202: 'ASDAC',
        203: 'AWGACS',
        204: 'SAS',
        205: 'SODART',
        206: 'SUOMEN KIRJAILIJALIITTO',
        207: 'THE AUTHOR\'S REGISTRY INC.',
        208: 'SGA',
        209: 'ARMAUTHOR',
        210: 'ACCESS',
        212: 'CSCS',
        213: 'DRCC',
        214: 'ECCO',
        215: 'KYRGYZPATENT',
        216: 'SQN',
        217: 'ABRAC',
        218: 'ANACIM',
        219: 'ASSIM',
        220: 'ATIDA',
        221: 'SABEM',
        222: 'FONOPERU',
        223: 'COSOTA',
        224: 'SOMAS',
        225: 'SAIF',
        226: 'AACIMH',
        227: 'SGACEDOM',
        228: 'ROMS',
        229: 'ICG',
        230: 'ADAVIS',
        231: 'AUTVIS',
        232: 'GESTOR',
        233: 'SACEMLUXEMBOURG',
        234: 'UCOSO',
        235: 'SACENC',
        273: 'AMUS',
        300: 'WID CENTRE',
        301: 'GESAC',
        302: 'LATINAUTOR',
        303: 'NORD-DOC',
        304: 'SONGCODE',
        305: 'IMJV',
        306: 'CCL',
        307: 'MISASIA',
        308: 'ECAD',
        309: 'LATINNET',
        310: 'DIVA',
        338: 'EDEM',
        707: 'MUSICMARK',
        708: 'MLC',
        778: 'GMR',
        319: 'ICE',
        275: 'AUTODIA',
        312: 'CISAC',
      };
      return mappings[societyCode];
    }
  },
  mapTerritories(sptRows) {
    let territories = [];
    if (Array.isArray(sptRows)) {
      sptRows.forEach((sptRow) => {
        let mapping = territoryMappings[parseInt(sptRow.territories).toString()];
        if (mapping && !Array.isArray(mapping)) {
          mapping = [mapping];
        }
        if (mapping?.length && sptRow.includeExclusionIndicator === 'I') {
          // Add to territories
          territories = [].concat(territories, mapping);
        } else if (sptRow.includeExclusionIndicator === 'E') {
          // Remove from territories (if included)
          mapping.forEach((mappingItem) => {
            const index = territories.indexOf(mappingItem);
            if (index > -1) territories.splice(index, 1);
          });
        }
      });
    }
    territories = CwrUtils.removeUnsupportedTerritories({ territories });
    // keep 2136 as WW and not split down to individual ISO codes
    if (territories.length >= CISAC_APPROVED_COUNTRIES_COUNT) {
      territories = ['WW'];
    }
    return territories;
  },
  getComposersForPublisher({ Composer, publisher, defaults, clientId, workData, key, mainChainTerritoriesArray, Import }, callback) {
    const ingestCwr = this;
    // Loop through Composers
    if (workData.composers) {
      async.eachSeries(Object.keys(workData.composers), (composerId, cb) => {
        const composerData = workData.composers[composerId];
        // Check if composer has publisher included
        const includedPublisher = IpChainUtils.getPublisherFromComposer(composerData, publisher, key);
        if (includedPublisher) {
          // Add composer to publisher and territories
          ingestCwr.createComposer({ Composer, composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }, (err, composer) => {
            if (composer) {
              publisher.children = publisher.children || [];
              publisher.children.push(composer);
            }
            cb();
          });
        } else {
          cb();
        }
      }, (err) => {
        callback(err, publisher);
      });
    } else {
      callback(null, publisher);
    }
  },
  createComposer({ Composer, composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }, callback) {
    const ingestCwr = this;
    if (composerData) {
      // Deal with unknown composers
      composerData.name = (`${composerData.writerFirstName} ${composerData.writerLastName}`).trim();
      if (composerData.writerUnknownIndicator === 'Y' || composerData.name === ' ') {
        composerData.name = 'Unknown Composer';
      }
      async.waterfall([
        function (cb) {
          if (composerData?.writerIpiNameNo && removeLeadingZeros(composerData.writerIpiNameNo)) {
            const caeWithoutLeadingZeros = removeLeadingZeros(composerData.writerIpiNameNo);
            // If writerIpiNameNo exists, find Composer by CAE
            const caeFilter = {
              clientId,
              $or: [
                { cae: composerData.writerIpiNameNo },
                { cae: caeWithoutLeadingZeros },
                { caeWithoutLeadingZeros },
              ],
            };
            Composer.findOne(caeFilter)
              .then((foundComposer) => {
                cb(null, foundComposer);
              })
              .catch((err) => {
                logger.error('Error finding composer by CAE: ', err);
                cb(err);
              });
          } else {
            cb(null, null);
          }
        },
        function (composer, cb) {
          if (composer) {
            // Return composer if found by CAE
            cb(null, composer);
          } else {
            // Find by name if not found by CAE
            const nameFilter = {
              clientId,
              lowerCaseName: lowerCaseString(composerData.name),
              $or: [
                { cae: { $eq: null } },
                { cae: { $eq: '00000000000' } },
              ],
            };
            Composer.findOne(nameFilter)
              .then((foundComposer) => {
                cb(null, foundComposer);
              })
              .catch((err) => {
                logger.error('Error finding composer by name: ', err);
                cb(err);
              });
          }
        },
        function (composer, cb) {
          if (composer) {
            // If composer is found by name, check CAE is unique
            if (removeLeadingZeros(composer.cae) !== removeLeadingZeros(composerData.writerIpiNameNo)) {
              // If there is an existing composer with the same name but different CAE, create new composer with same name but unique CAE
              composer = new Composer({
                clientId,
                name: composerData.name,
                cae: padLeadingZeros(composerData?.writerIpiNameNo, 11),
                performancePro: ingestCwr.mapSociety(composerData.prSociety),
                mechanicalPro: ingestCwr.mapSociety(composerData.mrSociety),
                syncPro: ingestCwr.mapSociety(composerData.srSociety),
                controlled: composerData.lineType === 'SWR',
                ...(Import?.defaults?.setComposerInterestedParty && composerData.interestedPartyNo && { interestedPartyId: composerData.interestedPartyNo }),
              });
              composer.save()
                .then((savedComposer) => {
                  cb(null, savedComposer);
                })
                .catch((err) => {
                  logger.error('Error saving composer: ', err);
                  cb(err);
                });
            } else {
              // CAE and name are the same, return found composer
              cb(null, composer);
            }
          } else {
            // Composer not found by CAE or name - Create new composer
            composer = new Composer({
              clientId,
              name: composerData.name,
              cae: padLeadingZeros(composerData.writerIpiNameNo, 11),
              performancePro: ingestCwr.mapSociety(composerData.prSociety),
              mechanicalPro: ingestCwr.mapSociety(composerData.mrSociety),
              syncPro: ingestCwr.mapSociety(composerData.srSociety),
              controlled: composerData.lineType === 'SWR',
              ...(Import?.defaults?.setComposerInterestedParty && composerData.interestedPartyNo && { interestedPartyId: composerData.interestedPartyNo }),
            });
            composer.save()
              .then((savedComposer) => {
                cb(null, savedComposer);
              })
              .catch((err) => {
                logger.error('Error saving composer: ', err);
                cb(err);
              });
          }
        }, function (composer, cb) {
          // Set no of publishers associated, defaulting to 1 if none present - used to prorata the shares
          const noOfPublishers = composerData.publishers ? composerData.publishers.length : 1;
          // Setup object for IP Chain
          const result = {
            type: 'Composer',
            composerId: composer._id.toString(),
            contractType: ingestCwr.mapComposerType(composerData.writerDesignationCode),
            controlled: composerData.lineType === 'SWR',
            performanceOwnership: composerData.prOwnershipShare / noOfPublishers,
            performanceCollection: composerData.prOwnershipShare / noOfPublishers,
            mechanicalOwnership: composerData.mrOwnershipShare / noOfPublishers,
            mechanicalCollection: composerData.mrOwnershipShare / noOfPublishers,
          };
          if (composerData.territories && Array.isArray(composerData.territories)) {
            // Loop through territories
            composerData.territories.forEach((swt) => {
              const territories = ingestCwr.mapTerritories([swt]);
              const isIngestionTerritory = !defaults.ingestionTerritory || territories.includes(defaults.ingestionTerritory);
              const isTerritoryMatch = territories.some((territory) => mainChainTerritoriesArray?.includes(territory));
              if (isIngestionTerritory && isTerritoryMatch) {
                result.performanceCollection = swt.prCollectionShare / noOfPublishers;
                result.mechanicalCollection = swt.mrCollectionShare / noOfPublishers;
              }
            });
          }
          cb(null, result);
        },
      ], callback);
    } else {
      callback();
    }
  },
  mapComposerType(composerType) {
    switch (composerType) {
      case 'A': return 'Lyrics';
      case 'C': return 'Music';
      case 'CA': return 'Lyrics and Music';
      case 'AR': return 'Arranger';
      case 'SR': return 'Sub Arranger';
      case 'AD': return 'Adapter';
      case 'SA': return 'Sub Author';
      case 'TR': return 'Translator';
      case 'PA': return 'Income Participant';
      default: return 'Unknown';
    }
  },
  addPublisherToChain(publisher, rightsChain, numKey) {
    if (numKey) {
      return rightsChain.children.push(publisher);
    }
    return addToDeepestChild(publisher, rightsChain);

    function addToDeepestChild(publisher, item) {
      if (item && Array.isArray(item.children) && item.children[0]) {
        return addToDeepestChild(publisher, item.children[0]);
      } if (item && Array.isArray(item.children)) {
        item.children.push(publisher);
        return item;
      }
    }
  },
  combineChains(work, callback) {
    if (work && work.rightsChain) {
      const territories = {};
      // Loop through each chain and map to territory
      work.rightsChain.forEach((rightsChain) => {
        territories[rightsChain.territory] = territories[rightsChain.territory] || [];
        territories[rightsChain.territory] = [].concat(territories[rightsChain.territory], rightsChain.children);
      });
      // Reset rightschain
      work.rightsChain = [];
      Object.keys(territories).forEach((territory) => {
        work.rightsChain.push({ territory, children: territories[territory] });
      });
      callback();
    } else {
      callback();
    }
  },
  mergeChains(work) {
    // do we need to merge chains here - if we have two chains that match, merge them down
    if (work && work.rightsChain) {
      let currentTerritoryIndex = -1;
      work.rightsChain.forEach((territory) => {
        const mergedChain = [];
        const seenChains = {};
        currentTerritoryIndex++;
        territory.children.forEach((chain) => {
          const key = `${chain.type}-${chain.controlled}-${chain.contractType}-${chain.interestedPartyNo}`;

          if (!seenChains[key]) {
            seenChains[key] = true;
            mergedChain.push(chain);
          } else {
            // Find the existing chain with the same key
            const existingChain = mergedChain.find((existingItem) => {
              const existingKey = `${existingItem.type}-${existingItem.controlled}-${existingItem.contractType}-${existingItem.interestedPartyNo}`;
              return existingKey === key;
            });

            // Merge the children arrays
            existingChain.children = existingChain.children.concat(chain.children);
            // add the shares from the territory
            existingChain.performanceOwnership += chain.performanceOwnership;
            existingChain.performanceCollection += chain.performanceCollection;
            existingChain.mechanicalOwnership += chain.mechanicalOwnership;
            existingChain.mechanicalCollection += chain.mechanicalCollection;
          }
        });
        // Reset rightschain to the merged chain
        work.rightsChain[currentTerritoryIndex].children = mergedChain;
      });
    }
  },
};

function removeLeadingZeros(value) {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
}

function padLeadingZeros(value, num) {
  if (value) {
    return String(value).padStart(num, '0');
  }
  return ''.padStart(num, '0');
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function onlyUniqueContracts(value, index, array) {
  const ids = [];
  // Get array of IDs
  array.forEach((item) => { if (item) { ids.push(item.contractId); } });
  if (ids.indexOf(value.contractId) === index) {
    return value;
  }
}

function checkInterestedPartyTerritory(territories, seq, interestedPartyNo) {
  // Check if key exists and it is an array
  if (seq in territories && Array.isArray(territories[seq])) {
    // Check if any object in the array has 'interestedPartyNo'
    const partyExists = territories[seq].some((item) => item.interestedPartyNo === interestedPartyNo);
    return partyExists;
  }
  return false;
}
