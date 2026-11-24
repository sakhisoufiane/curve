/* eslint-disable max-len */
/* eslint-disable eqeqeq */
/* eslint-disable no-shadow */
/* eslint-disable no-restricted-globals */
/* eslint-disable radix */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const _ = require('lodash');
const CsReader = require('./csReader');
const lowerCaseString = require('../lowerCaseString');

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
  2136: [
    'AF',
    'AL',
    'DZ',
    'AD',
    'AO',
    'AG',
    'AZ',
    'AR',
    'AU',
    'AT',
    'BS',
    'BH',
    'BD',
    'AM',
    'BB',
    'BE',
    'BT',
    'BO',
    'BA',
    'BW',
    'BR',
    'BZ',
    'SB',
    'BN',
    'BG',
    'MM',
    'BI',
    'BY',
    'KH',
    'CM',
    'CA',
    'CV',
    'CF',
    'LK',
    'TD',
    'CL',
    'CN',
    'TW',
    'CO',
    'KM',
    'CG',
    'CD',
    'CR',
    'HR',
    'CU',
    'CY',
    'CZ',
    'BJ',
    'DK',
    'DM',
    'DO',
    'EC',
    'SV',
    'GQ',
    'ET',
    'ER',
    'EE',
    'FJ',
    'FI',
    'FR',
    'PF',
    'DJ',
    'GA',
    'GE',
    'GM',
    'DE',
    'GH',
    'KI',
    'GR',
    'GD',
    'GT',
    'GN',
    'GY',
    'HT',
    'VA',
    'HN',
    'HK',
    'HU',
    'IS',
    'IN',
    'ID',
    'IR',
    'IQ',
    'IE',
    'IL',
    'IT',
    'CI',
    'JM',
    'JP',
    'KZ',
    'JO',
    'KE',
    'KP',
    'KR',
    'KW',
    'KG',
    'LA',
    'LB',
    'LS',
    'LV',
    'LR',
    'LY',
    'LI',
    'LT',
    'LU',
    'MO',
    'MG',
    'MW',
    'MY',
    'MV',
    'ML',
    'MT',
    'MR',
    'MU',
    'MX',
    'MC',
    'MN',
    'MD',
    'ME',
    'MA',
    'MZ',
    'OM',
    'NA',
    'NR',
    'NP',
    'NL',
    'NC',
    'VU',
    'NZ',
    'NI',
    'NE',
    'NG',
    'NO',
    'FM',
    'MH',
    'PW',
    'PK',
    'PA',
    'PG',
    'PY',
    'PE',
    'PH',
    'PL',
    'PT',
    'GW',
    'TL',
    'PR',
    'QA',
    'RO',
    'RU',
    'RW',
    'KN',
    'LC',
    'VC',
    'SM',
    'ST',
    'SA',
    'SN',
    'RS',
    'SC',
    'SL',
    'SG',
    'SK',
    'VN',
    'SI',
    'SO',
    'ZA',
    'ZW',
    'ES',
    'SS',
    'SD',
    'EH',
    'SR',
    'SZ',
    'SE',
    'CH',
    'SY',
    'TJ',
    'TH',
    'TG',
    'TO',
    'TT',
    'AE',
    'TN',
    'TR',
    'TM',
    'TV',
    'UG',
    'UA',
    'MK',
    'EG',
    'GB',
    'TZ',
    'US',
    'BF',
    'UY',
    'UZ',
    'VE',
    'WS',
    'YE',
    'ZM',
  ],
};

module.exports = {
  ingest({ Work, Release, Track, Publisher, Composer, s3Key, bucket, clientId, defaults, submitter }, callback) {
    const ingestCs = this;
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
            // Setup instance of csReader
            const csReader = new CsReader();
            // Read CS
            csReader.readFile(localFile, (err) => {
              // Return found works and any reported works with issues
              cb(err, csReader.works, csReader.errors);
            });
          }
        },
        function (data, errors, cb) {
          // Ingest Data
          ingestCs.ingestData({ Work, Release, Track, Publisher, Composer, data, errors, clientId, defaults, submitter }, cb);
        },
      ], callback);
    }
  },
  ingestData({ Work, Release, Track, Publisher, Composer, data, errors, clientId, defaults, submitter }, callback) {
    const ingestCs = this;
    if (!data) {
      // Handle no data Error
      callback(new Error('No data passed'));
    } else if (!clientId) {
      // Handle no Client ID Error
      callback(new Error('ClientId must be passed'));
    } else {
      // Setup count
      let count = 0;
      // Loop through data array
      async.eachSeries(data, (workData, cb) => {
        // Check for object and not null
        if (workData) {
          // Ingest work object
          ingestCs.ingestWork({ Work, Release, Track, Publisher, Composer, workData, clientId, defaults, submitter }, (err) => {
            if (!err) {
              // Increment when no error
              count += 1;
              if (count % 1000 === 0) {
                logger.info(`${clientId} - ${count} records imported.`);
              }
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
  ingestWork({ Work, Release, Track, Publisher, Composer, workData, clientId, defaults, submitter }, callback) {
    const ingestCs = this;
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
            let territories;
            Object.values(workData.publisherTerritories).forEach((val) => {
              if (Array.isArray(val)) {
                val.forEach((row) => {
                  territories = _.union(territories, ingestCs.territoryCodeToTerritoriesArray(row.territories, row.includeExclusionIndicator));
                });
              }
            });
            if (territories.includes(defaults.ingestionTerritory)) {
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
          ingestCs.findPreviousWork({ Work, data: workData, clientId, submitter }, (err, foundWork) => {
            if (!foundWork) { foundWork = new Work({ clientId }); }
            cb(err, foundWork);
          });
        },
        function (work, cb) {
          // Set Data
          ingestCs.setWorkData({ Release, Track, Publisher, Composer, work, workData, defaults, submitter }, cb);
        },
        function (work, cb) {
          // Save
          work.save()
          .then(() => {
              cb();
          })
          .catch((err) => {
            logger.error(`Work Failed CS Ingestion: ${work.title} - ${work.identifier}`);
            cb(err);
          });
        },
      ], callback);
    }
  },
  findPreviousWork({ Work, data, clientId, submitter }, callback) {
    const submitterQuery = `submitterWorkNos.${submitter}`;
    const filter = { clientId };
    filter[submitterQuery] = data.submitterWorkNo;
    Work.findOne(filter)
      .then((foundWork) => {
        callback(null, foundWork);
      })
      .catch((err) => {
        logger.error('Error finding previous work', err);
        callback(err);
      });
  },
  setWorkData({ Release, Track, Publisher, Composer, work, workData, defaults, submitter }, callback) {
    const ingestCs = this;
    async.waterfall([
      function (cb) {
        // Set work level values
        ingestCs.setMainWorkParams(work, workData, defaults, submitter);
        cb();
      },
      function (cb) {
        // Set IP chain
        ingestCs.setIpChain({ Publisher, Composer, work, workData, defaults }, cb);
      },
      function (cb) {
        // Set Rights
        ingestCs.setRights(work, defaults, cb);
      },
      function (cb) {
        // Set Recordings
        ingestCs.setRecordings({ Release, Track, work, workData }, cb);
      },
    ], (err) => {
      callback(err, work);
    });
  },
  setMainWorkParams(work, workData, defaults, submitter) {
    const ingestCs = this;
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
    if (workData && workData.musicalWorkDistributionCategory) { work.workDescriptionCategory = ingestCs.mapWorkDescription(workData.musicalWorkDistributionCategory); }
    // Language
    if (workData && workData.language) { work.workLanguage = ingestCs.mapLanguage(workData.language); }
    // Composite Type
    if (workData && workData.compositeType) { work.compositeType = ingestCs.mapCompositeType(workData.compositeType); }
    // Composite Count
    if (workData && workData.compositeComponentCount) { work.compositeCount = ingestCs.toNumber(workData.compositeComponentCount); }
    // Version Tyoe
    if (workData && workData.versionType) { work.versionType = ingestCs.mapVersionType(workData.versionType); }
    // Music Arrangement Type
    if (workData && workData.musicArrangement) { work.arrangementType = ingestCs.mapArrangementType(workData.musicArrangement); }
    // Lyric Adaption Type
    if (workData && workData.lyricAdaption) { work.lyricAdaptionType = ingestCs.mapLyricAdaptionType(workData.lyricAdaption); }
    // Alternate Titles
    if (workData && workData.alternateTitles) {
      // Get Alt Titles as strings
      const newAltTitles = workData.alternateTitles.map((alt) => { if (alt) { return { title: alt.alternateTitle, language: ingestCs.mapLanguage(alt.languageCode) }; } }).filter(Boolean);
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
  setRecordings({ Release, Track, work, workData }, callback) {
    const ingestCs = this;
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
                  logger.error('Error finding track', err);
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
                  clientId: work.clientId, artist: recording.principleArtist, label: recording?.recordingLabel, isrc: recording.isrc, duration: ingestCs.toNumber(recording.recordingTime), version: recording.versionTitle,
                });
                track.title = recording.recordingTitle ? recording.recordingTitle : work.title;
                track.save()
                  .then(() => {
                    waterfallCb(null, track);
                  })
                  .catch((err) => {
                    logger.error(`Track save failed: ${track.title} - ${track._id}`, err);
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
                ingestCs.setReleases({ Release, track, recording, clientId: work.clientId }, waterfallCb);
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
    if (recording && recording.catalogNumber) {
      async.waterfall([
        function (cb) {
          // Find release by cat no
          Release.findOne({ clientId, catNo: recording.catalogNumber })
            .then(() => {
              cb(null, track);
            })
            .catch((err) => {
              logger.error('Failed to find release ', err);
                cb(err);
            });
        },
        function (release, cb) {
          // Create release if one not found
          if (!release) {
            release = new Release({
              title: recording.albumTitle, label: recording.albumLabelCode, artist: recording.principleArtist, catNo: recording.catalogNumber, barcode: recording.barcode,
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
              logger.error('Failed to save release ', err);
              cb(err);
            });
        },
      ], callback);
    }
  },
  setIpChain({ Publisher, Composer, work, workData, defaults }, callback) {
    const ingestCs = this;
    async.waterfall([
      function (cb) {
        // Publisher chains
        const { publisherChains, publisherTerritories } = ingestCs.combinePublisherChains(workData.publisherChains, workData.publisherTerritories);
        if (publisherChains) {
          async.eachSeries(Object.keys(publisherChains), (key, keyCb) => {
            const rightsChain = { territory: 'WW', children: [] };
            // const chainIndex = parseInt(key) - 1;
            async.eachSeries(publisherChains[key], (publisherData, publisherCb) => {
              // Check if last in chain
              const lastInChain = workData.publisherChains[key].indexOf(publisherData) == publisherChains[key].length - 1;
              // Update publisher data with SWT info if exists
              if (publisherTerritories && publisherTerritories[publisherData.publisherSequence]) {
                publisherTerritories[publisherData.publisherSequence].forEach((swt) => {
                  // Convert territory code to territories array
                  const territories = ingestCs.territoryCodeToTerritoriesArray(swt.territories, swt.includeExclusionIndicator);
                  if (swt.interestedPartyNo === publisherData.interestedPartyNo && (!defaults.ingestionTerritory || territories.includes(defaults.ingestionTerritory))) {
                    publisherData.includePublisher = true;
                    publisherData.prCollectionShare = swt.prCollectionShare;
                    publisherData.mrCollectionShare = swt.mrCollectionShare;
                    publisherData.srCollectionShare = swt.srCollectionShare;
                  }
                });
              } else {
                // Include when there are no territories set, as this means there are more items in the row
                publisherData.includePublisher = true;
              }
              // Only include if the territory is included in Original Publisher row
              if (publisherData.includePublisher || !publisherData.subPublisher || publisherData.publisherType === 'OP' || publisherData.publisherType === 'E' || publisherData.publisherType === 'PA') {
                // Create publisher data
                ingestCs.createPublisher({ Publisher, Composer, publisherData, workData, defaults, clientId: work.clientId, lastInChain }, (err, publisher) => {
                  if (err) {
                    publisherCb(err);
                  } else {
                    // Create children if they don't exist
                    publisher.children = publisher.children || [];
                    // Add onto chain
                    ingestCs.addPublisherToChain(publisher, rightsChain);
                    publisherCb();
                  }
                });
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
                  if (child && child.controlled) {
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
              // Add chain to work
              work.rightsChain.push(rightsChain);
              keyCb(err);
            });
          }, (err) => {
            if (err) {
              cb(err);
            } else {
              ingestCs.combineChains(work, cb);
            }
          });
        } else {
          cb();
        }
      },
      function (cb) {
        // Other Writers
        if (workData.composers) {
          const composerIds = Object.keys(workData.composers);
          async.eachSeries(composerIds, (composerId, composerIdCb) => {
            // Only add composers that arent part of a publisher's chain
            if (!workData.composers?.[composerId]?.publishers?.length) {
              // Get composer data
              ingestCs.createComposer({ Composer, composerData: workData.composers[composerId], defaults, clientId: work.clientId }, (err, composer) => {
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
    const ingestCs = this;
    if (publisherChains && Object.keys(publisherChains).length > 1) {
      const tempChains = {};
      // Loop through each chain to add to tempChains
      Object.values(publisherChains).forEach((chain, index) => {
        let chainString = '';
        // Loop through items and add party no to chainString
        chain.forEach((item) => {
          chainString += item.interestedPartyNo;
        });
        // Place chains on party string
        if (!tempChains[chainString]) {
          tempChains[chainString] = chain;
        } else {
          // When chain already exists on tempChains - this is when we need to add those values to the other resources
          tempChains[chainString].map((tempChainItem) => {
            chain.forEach((item) => {
              // When items match, add together
              if (item.interestedPartyNo === tempChainItem.interestedPartyNo) {
                // Combine shares
                tempChainItem.prOwnershipShare += item.prOwnershipShare;
                tempChainItem.mrOwnershipShare += item.mrOwnershipShare;
                tempChainItem.srOwnershipShare += item.srOwnershipShare;
              }
            });
            return tempChainItem;
          });
          const chainNoA = tempChains[chainString] ? tempChains[chainString][0].publisherSequence : null;
          const chainNoB = chain[0].publisherSequence;
          // Trigger territory merge on those chains also
          publisherTerritories = ingestCs.mergePublisherTerritories(publisherTerritories, chainNoA, chainNoB);
        }
      });
      // Return to original object shape
      const returnPublisherChains = {};
      Object.values(tempChains).forEach((chain) => {
        if (chain[0]) {
          returnPublisherChains[chain[0].publisherSequence] = chain;
        }
      });
      return { publisherChains: returnPublisherChains, publisherTerritories };
    }
    // Return original if not more than 1 chain
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
  createPublisher({ Publisher, Composer, publisherData, workData, defaults, clientId, lastInChain }, callback) {
    const ingestCs = this;
    if (publisherData) {
      // Deal with unknown publisher
      if (publisherData.publisherUnknownIndicator === 'Y' || publisherData.publisherName === '') {
        publisherData.publisherName = 'Unknown Publisher';
      }
      async.waterfall([
        function (cb) {
          // Find Publisher
          Publisher.findOne({ clientId, lowerCaseName: lowerCaseString(publisherData.publisherName) })
            .then((publisher) => {
              cb(null, publisher);
            })
            .catch((err) => {
              logger.error('Error finding publisher', err);
              cb(err);
            });
        },
        function (publisher, cb) {
          if (publisher) {
            // Return publisher if found
            cb(null, publisher);
          } else {
            // Create new publisher
            publisher = new Publisher({
              clientId,
              name: publisherData.publisherName,
              cae: publisherData.publisherIpiName,
              performancePro: ingestCs.mapSociety(publisherData.prSociety),
              mechanicalPro: ingestCs.mapSociety(publisherData.mrSociety),
              syncPro: ingestCs.mapSociety(publisherData.srSociety),
              controlled: publisherData.controlled,
            });
            publisher.save()
              .then((savedPublisher) => {
                cb(null, savedPublisher);
              })
              .catch((err) => {
                logger.error('Publisher save failed ', err);
                cb(err);
              });
          }
        },
        function (publisher, cb) {
          const prCollectionShare = publisherData.prCollectionShare || publisherData.prCollectionShare === 0 ? publisherData.prCollectionShare : 0;
          const mrCollectionShare = publisherData.mrCollectionShare || publisherData.mrCollectionShare === 0 ? publisherData.mrCollectionShare : 0;
          // * Is this required below to copy owned shares to collection shares?
          // if (!publisherData.subPublisher) {
          //   prCollectionShare = publisherData.prOwnershipShare;
          //   mrCollectionShare = publisherData.mrOwnershipShare;
          // }

          const result = {
            type: 'Publisher',
            publisherId: publisher._id.toString(),
            contractType: ingestCs.mapPublisherType(publisherData.publisherType),
            controlled: publisherData.controlled,
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
            ingestCs.getComposersForPublisher({ Composer, publisher: result, defaults, clientId, workData }, cb);
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
      case 'OP':
        return 'Original Publisher';
      case 'SP':
        return 'Sub Publisher';
      case 'SE':
        return 'Sub Publisher';
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
        336: 'KOSCAP',
        275: 'AUTODIA',
        312: 'CISAC',
      };
      return mappings[societyCode];
    }
  },
  mapTerritories(sptRows) {
    let territories = [];
    const territoryMappings = {
      // TODO: Fix duplicate key issue as they seem to be different territories
      // eslint-disable-next-line no-dupe-keys
      4: ['AF'], 8: ['AL'], 12: ['DZ'], 20: ['AD'], 24: ['AO'], 28: ['AG'], 31: ['AZ'], 32: ['AR'], 36: ['AU'], 40: ['AT'], 44: ['BS'], 48: ['BH'], 50: ['BD'], 51: ['AM'], 52: ['BB'], 56: ['BE'], 64: ['BT'], 68: ['BO'], 70: ['BA'], 72: ['BW'], 76: ['BR'], 84: ['BZ'], 90: ['SB'], 96: ['BN'], 100: ['BG'], 104: ['BU', 'MM'], 108: ['BI'], 112: ['BY'], 116: ['KH'], 120: ['CM'], 124: ['CA'], 132: ['CV'], 140: ['CF'], 144: ['LK'], 148: ['TD'], 152: ['CL'], 156: ['CN'], 158: ['TW'], 170: ['CO'], 174: ['KM'], 178: ['CG'], 180: ['ZR', 'CD'], 188: ['CR'], 191: ['HR'], 192: ['CU'], 196: ['CY'], 203: ['CZ'], 204: ['BJ'], 208: ['DK'], 212: ['DM'], 214: ['DO'], 218: ['EC'], 222: ['SV'], 226: ['GQ'], 231: ['ET'], 232: ['ER'], 233: ['EE'], 242: ['FJ'], 246: ['FI'], 250: ['FR'], 258: ['PF'], 262: ['DJ'], 266: ['GA'], 268: ['GE'], 270: ['GM'], 276: ['DE'], 288: ['GH'], 296: ['KI'], 300: ['GR'], 308: ['GD'], 320: ['GT'], 324: ['GN'], 328: ['GY'], 332: ['HT'], 336: ['VA'], 340: ['HN'], 344: ['HK'], 348: ['HU'], 352: ['IS'], 356: ['IN'], 360: ['ID'], 364: ['IR'], 368: ['IQ'], 372: ['IE'], 376: ['IL'], 380: ['IT'], 384: ['CI'], 388: ['JM'], 392: ['JP'], 398: ['KZ'], 400: ['JO'], 404: ['KE'], 408: ['KP'], 410: ['KR'], 414: ['KW'], 417: ['KG'], 418: ['LA'], 422: ['LB'], 426: ['LS'], 428: ['LV'], 430: ['LR'], 434: ['LY'], 438: ['LI'], 440: ['LT'], 442: ['LU'], 446: ['MO'], 450: ['MG'], 454: ['MW'], 458: ['MY'], 462: ['MV'], 466: ['ML'], 470: ['MT'], 478: ['MR'], 480: ['MU'], 484: ['MX'], 492: ['MC'], 496: ['MN'], 498: ['MD'], 499: ['ME'], 504: ['MA'], 508: ['MZ'], 512: ['OM'], 516: ['NA'], 520: ['NR'], 524: ['NP'], 528: ['NL'], 540: ['NC'], 548: ['VU'], 554: ['NZ'], 558: ['NI'], 562: ['NE'], 566: ['NG'], 578: ['NO'], 583: ['FM'], 584: ['MH'], 585: ['PW'], 586: ['PK'], 591: ['PA'], 598: ['PG'], 600: ['PY'], 604: ['PE'], 608: ['PH'], 616: ['PL'], 620: ['PT'], 624: ['GW'], 626: ['TL'], 630: ['PR'], 634: ['QA'], 642: ['RO'], 643: ['RU'], 646: ['RW'], 659: ['KN'], 662: ['LC'], 670: ['VC'], 674: ['SM'], 678: ['ST'], 682: ['SA'], 686: ['SN'], 688: ['RS'], 690: ['SC'], 694: ['SL'], 702: ['SG'], 703: ['SK'], 704: ['VN'], 705: ['SI'], 706: ['SO'], 710: ['ZA'], 716: ['ZW'], 724: ['ES'], 728: ['SS'], 729: ['SD'], 732: ['EH'], 740: ['SR'], 748: ['SZ'], 752: ['SE'], 756: ['CH'], 760: ['SY'], 762: ['TJ'], 764: ['TH'], 768: ['TG'], 776: ['TO'], 780: ['TT'], 784: ['AE'], 788: ['TN'], 792: ['TR'], 795: ['TM'], 798: ['TV'], 800: ['UG'], 804: ['UA'], 807: ['MK'], 818: ['EG'], 826: ['GB'], 834: ['TZ'], 840: ['US'], 854: ['BF'], 858: ['UY'], 860: ['UZ'], 862: ['VE'], 882: ['WS'], 887: ['YE'], 894: ['ZM'], 2100: ['AO', 'BW', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'BJ', 'GQ', 'ET', 'ET', 'ER', 'DJ', 'GA', 'GM', 'GH', 'GN', 'CI', 'KE', 'LS', 'LR', 'MG', 'MW', 'ML', 'MR', 'MU', 'MZ', 'NA', 'NE', 'NG', 'GW', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'ZW', 'SS', 'SD', 'EH', 'SD', 'SZ', 'TG', 'UG', 'TZ', 'BF', 'ZM'], 2128: ['DZ', 'LY', 'MA', 'TN', 'EG'], 2113: ['BZ', 'CR', 'SV', 'GT', 'HN', 'NI', 'PA'], 2129: ['CA', 'MX', 'US'], 2132: ['AR', 'BO', 'BQ', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE'], 2134: ['BS'], 2103: ['AG', 'BB', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'PR', 'KN', 'LC', 'VC', 'TT'], 2101: ['BZ', 'CR', 'SV', 'GT', 'HN', 'NI', 'PA', 'CA', 'MX', 'US', 'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE', 'BS', 'AG', 'BB', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'PR', 'KN', 'LC', 'VC', 'TT'], 2102: ['BZ', 'CR', 'SV', 'GT', 'HN', 'NI', 'PA', 'CA', 'MX', 'US', 'AR', 'BO', 'BQ', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE', 'BS', 'AG', 'BB', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'PR', 'KN', 'LC', 'VC', 'TT'], 2104: ['AU', 'BN', 'CA', 'CL', 'CN', 'TW', 'HK', 'ID', 'JP', 'KR', 'MO', 'MY', 'MX', 'NZ', 'PG', 'PE', 'PH', 'PR', 'RU', 'SG', 'VN', 'TH', 'US'], 2105: ['BN', 'MM', 'KH', 'ID', 'LA', 'MY', 'PH', 'SG', 'VN', 'TH'], 2106: ['AZ', 'AM', 'CN', 'TW', 'CY', 'GE', 'HK', 'IL', 'JP', 'KZ', 'KP', 'KR', 'KG', 'LB', 'MO', 'SY', 'TJ', 'TR', 'TM', 'UZ', 'AF', 'BH', 'BD', 'BT', 'LK', 'IN', 'IR', 'IQ', 'JO', 'KW', 'MV', 'MN', 'OM', 'NP', 'PK', 'QA', 'SA', 'YD', 'AE', 'YE', 'BN', 'MM', 'KH', 'ID', 'LA', 'MY', 'PH', 'TL', 'SG', 'VN', 'TH'], 2125: ['AF', 'BH', 'BD', 'BT', 'LK', 'IN', 'IR', 'IQ', 'JO', 'KW', 'MV', 'MN', 'OM', 'NP', 'PK', 'QA', 'SA', 'YD', 'AE', 'YE', 'YE'], 2133: ['BN', 'MM', 'KH', 'ID', 'LA', 'MY', 'PH', 'TL', 'SG', 'VN', 'TH'], 2107: ['AU', 'SB', 'FJ', 'NC', 'VU', 'NZ'], 2108: ['AL', 'BA', 'BG', 'HR', 'GR', 'ME', 'RO', 'RS', 'SI', 'MK', 'YU', 'CS'], 2109: ['EE', 'LV', 'LT'], 2110: ['BE', 'LU', 'NL'], 2111: ['GB', 'IE'], 2112: ['AG', 'BS', 'BB', 'DM', 'GD', 'JM', 'KN', 'LC', 'VC', 'TT'], 2114: ['AG', 'BS', 'BB', 'BZ', 'CA', 'DM', 'KI', 'GD', 'GY', 'JM', 'MT', 'NR', 'PG', 'KN', 'LC', 'VC', 'TO', 'TT', 'TV', 'GB', 'WS', 'BW', 'CM', 'GM', 'GH', 'KE', 'LS', 'MW', 'MU', 'MZ', 'NA', 'NG', 'SC', 'SL', 'ZA', 'ZW', 'SZ', 'UG', 'TZ', 'ZM', 'BD', 'BN', 'LK', 'CY', 'HK', 'IN', 'MY', 'MV', 'PK', 'SG', 'AU', 'SB', 'FJ', 'VU', 'NZ'], 2115: ['BW', 'CM', 'GM', 'GH', 'KE', 'LS', 'MW', 'MU', 'MZ', 'NA', 'NG', 'SC', 'SL', 'ZA', 'ZW', 'SZ', 'UG', 'TZ', 'ZM'], 2116: ['BD', 'BN', 'LK', 'CY', 'HK', 'IN', 'MY', 'MV', 'PK', 'SG'], 2117: ['AU', 'SB', 'FJ', 'VU', 'NZ'], 2118: ['AZ', 'AM', 'BY', 'GE', 'KZ', 'KG', 'MD', 'RU', 'TJ', 'TM', 'UA', 'UZ'], 2120: ['IS', 'MT', 'AD', 'AT', 'BE', 'BA', 'HR', 'FI', 'FR', 'DE', 'DE', 'GR', 'VA', 'IT', 'LI', 'LU', 'MC', 'ME', 'NL', 'PT', 'SM', 'RS', 'SI', 'ES', 'CH', 'MK', 'YU', 'CS', 'AL', 'BG', 'BY', 'CS', 'CZ', 'EE', 'DD', 'HU', 'LV', 'LT', 'MD', 'PL', 'RO', 'RU', 'SK', 'UA', 'SU', 'DK', 'NO', 'SE', 'IE', 'GB'], 2122: ['AD', 'AT', 'BE', 'BA', 'HR', 'FI', 'FR', 'DE', 'DE', 'GR', 'VA', 'IT', 'LI', 'LU', 'MC', 'ME', 'NL', 'PT', 'SM', 'RS', 'SI', 'ES', 'CH', 'MK', 'YU', 'CS', 'AL', 'BG', 'BY', 'CS', 'CZ', 'EE', 'DD', 'HU', 'LV', 'LT', 'MD', 'PL', 'RO', 'RU', 'SK', 'UA', 'SU', 'DK', 'NO', 'SE'], 2119: ['AL', 'BG', 'BY', 'CS', 'CZ', 'EE', 'DD', 'HU', 'LV', 'LT', 'MD', 'PL', 'RO', 'RU', 'SK', 'UA', 'SU'], 2131: ['DK', 'NO', 'SE'], 2121: ['AT', 'BE', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'], 2122: ['AD', 'AT', 'BE', 'BA', 'HR', 'FI', 'FR', 'DE', 'DE', 'GR', 'VA', 'IT', 'LI', 'LU', 'MC', 'ME', 'NL', 'PT', 'SM', 'RS', 'SI', 'ES', 'CH', 'MK', 'YU', 'CS'], 2123: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'], 2124: ['AT', 'DE', 'DE', 'CH'], 2126: ['CA', 'MX', 'PR', 'US'], 2127: ['DK', 'FI', 'IS', 'NO', 'SE'], 2130: ['PF', 'KI', 'NR', 'FM', 'MH', 'PW', 'PG', 'TO', 'TV', 'WS'], 2136: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'BQ', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
    };
    if (Array.isArray(sptRows)) {
      sptRows.forEach((sptRow) => {
        const mapping = territoryMappings[parseInt(sptRow.territories).toString()];
        if (mapping && sptRow.includeExclusionIndicator === 'I') {
          // Add to territories
          territories = [].concat(territories, mapping);
        } else if (sptRow.includeExclusionIndicator === 'E') {
          // Remove from territories
          mapping.forEach((mappingItem) => {
            territories.splice(territories.indexOf(mappingItem), 1);
          });
        }
      });
    }
    return territories;
  },
  getComposersForPublisher({ Composer, publisher, defaults, clientId, workData }, callback) {
    const ingestCs = this;
    // Loop through Composers
    if (workData.composers) {
      async.eachSeries(Object.keys(workData.composers), (composerId, cb) => {
        const composerData = workData.composers[composerId];
        // Check if composer has publisher included
        const includedPublisher = ingestCs.getPublisherFromComposer(composerData, publisher);
        if (includedPublisher) {
          // Add composer to publisher and territories
          ingestCs.createComposer({ Composer, composerData, defaults, clientId }, (err, composer) => {
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
  getPublisherFromComposer(composerData, publisher) {
    // const ingestCs = this;
    let includedPublisher;
    if (composerData.publishers) {
      composerData.publishers.forEach((composerPublisher) => {
        if (composerPublisher && composerPublisher.interestedPartyNo == publisher.interestedPartyNo) {
          includedPublisher = composerPublisher;
        }
      });
    }
    return includedPublisher;
  },
  createComposer({ Composer, composerData, defaults, clientId }, callback) {
    const ingestCs = this;
    if (composerData) {
      composerData.name = (`${composerData.writerFirstName} ${composerData.writerLastName}`).trim();
      async.waterfall([
        function (cb) {
          // Find Composer
          Composer.findOne({ clientId, lowerCaseName: lowerCaseString(composerData.name) })
            .then((composer) => {
              cb(null, composer);
            })
            .catch((err) => {
              logger.error('Error finding composer ', err);
              cb(err);
            });
        },
        function (composer, cb) {
          if (composer) {
            // Return composer if found
            cb(null, composer);
          } else {
            // Create new composer
            composer = new Composer({
              clientId,
              name: composerData.name,
              cae: composerData.writerIpiNameNo,
              performancePro: ingestCs.mapSociety(composerData.prSociety),
              mechanicalPro: ingestCs.mapSociety(composerData.mrSociety),
              syncPro: ingestCs.mapSociety(composerData.srSociety),
              controlled: composerData.controlled,
            });
            composer.save()
              .then((savedComposer) => {
                cb(null, savedComposer);
              })
              .catch((err) => {
                logger.error('Error saving composer ', err);
                cb(err);
              });
          }
        },
        function (composer, cb) {
          // Set no of publishers associated, defaulting to 1 if none present
          const noOfPublishers = composerData.publishers ? composerData.publishers.length : 1;
          // Setup object for IP Chain
          const result = {
            type: 'Composer',
            composerId: composer._id.toString(),
            contractType: ingestCs.mapComposerType(composerData.writerDesignationCode),
            controlled: composerData.controlled,
            performanceOwnership: composerData.prOwnershipShare / noOfPublishers,
            performanceCollection: composerData.prOwnershipShare / noOfPublishers,
            mechanicalOwnership: composerData.mrOwnershipShare / noOfPublishers,
            mechanicalCollection: composerData.mrOwnershipShare / noOfPublishers,
          };
          if (composerData.territories && Array.isArray(composerData.territories)) {
            // Loop through territories
            composerData.territories.forEach((swt) => {
              const territories = ingestCs.territoryCodeToTerritoriesArray(swt.territories, swt.includeExclusionIndicator);
              if (!defaults.ingestionTerritory || territories.includes(defaults.ingestionTerritory)) {
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
      default: return 'Unknown';
    }
  },
  addPublisherToChain(publisher, rightsChain) {
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
};

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
