const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();

const Payee = require('../models/payee');
const Client = require('../models/client');
const Contract = require('../models/contract');

// Setup output sales select fields
const select = [
  'catalogueBarcode', 'catalogueCatNo', 'catType', 'configuration', 'distributionChannel', 'exchangeRate', 'homeCurrencyNetAmount', 'catalogueIsrc',
  'netAmount', 'originalCurrency', 'priceCategory', 'releaseId', 'saleDate', 'source', 'subSource', 'territory', 'trackId', 'units', 'transactionDate',
  'grossAmount', 'homeCurrencyGrossAmount', 'calculationInput', 'calculationOutput', 'catalogueReleaseTitle', 'catalogueReleaseArtist',
  'catalogueTrackTitle', 'catalogueTrackArtist', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId',
  'catalogueIswc', 'catalogueTunecode', 'production', 'episode', 'dateFrom', 'dateTo',
];

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
  .get('/', (req, res) => {
    if (req.curveUser.clientId && !req.curveUser.payeeId) {
      Client.findById(req.curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) return res.status(403).json(FORBIDDEN);

            const bigQuery = new BigQuery({
              datasetName: client.bigQueryDataset,
              inputTable: client.bigQuerySalesTable,
              outputTable: client.bigQueryPeriodSales,
              costsTable: client.bigQueryPeriodCosts,
            });
            const limit = req.query.limit ? req.query.limit : 50;
            const offset = req.query.page ? (limit * (req.query.page - 1)) : 0;
            const orderBy = req.query.orderBy ? req.query.orderBy : 'releaseId';
            const orderDir = req.query.orderDir ? req.query.orderDir : 'ASC';
            const options = {
              limit, offset, orderBy, orderDir,
            };
            let filter = paramsToFilterField(req.query);
            if (Object.keys(filter).length === 0) { filter = 'true'; }

            const query = bigQuery.getDataQuery(bigQuery.outputTable, select, filter, options);
            const labels = {
              job_type: 'output_sales',
              client_id: client._id.toString(),
            };
            bigQuery.queryJobPromise({ query, labels })
              .then((sales) => {
                bigQuery.getCount(bigQuery.outputTable, 'count', filter, (err, result) => {
                  if (err) {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  } else {
                    const { count } = result[0];
                    logger.info({ total: count, totalPages: Math.ceil(count / limit), currentPage: req.query.page });
                    res.status(200).json({ sales, meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: req.query.page } });
                  }
                });
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else if (req.curveUser.payeeId) {
      Payee.findById(req.curveUser.payeeId)
        .then((payee) => {
          if (!payee) {
            res.status(404).json({ message: 'Payee not found' });
          } else {
            Client.findById(payee.clientId)
              .then(async (client) => {
                if (!client) {
                  res.status(404).json({ message: 'Client not found' });
                } else {
                  const limit = req.query.limit ? req.query.limit : 50;
                  const offset = req.query.page ? (limit * req.query.page) : 0;
                  const orderBy = req.query.orderBy ? req.query.orderBy : 'releaseId';
                  const orderDir = req.query.orderDir ? req.query.orderDir : 'ASC';
                  const options = {
                    limit, offset, orderBy, orderDir,
                  };

                  // When a payee is accessing their own sales, we need to ensure that the contractId is present
                  if (!req.query?.contractId) return res.status(403).json(FORBIDDEN);
                  // If the contractId is present, we need to ensure that the payee is associated with the contract
                  const contract = await Contract.findOne({ clientId: payee.clientId, _id: req.query.contractId, 'payees.payeeId': payee._id.toString() }).catch(logger.error);
                  if (!contract) return res.status(403).json(FORBIDDEN);

                  const filter = paramsToFilterField(req.query);

                  const bigQuery = new BigQuery({
                    datasetName: client.bigQueryDataset,
                    inputTable: client.bigQuerySalesTable,
                    outputTable: client.bigQueryPeriodSales,
                    costsTable: client.bigQueryPeriodCosts,
                  });

                  const query = bigQuery.getDataQuery(bigQuery.outputTable, select, filter, options);
                  const labels = {
                    job_type: 'output_sales',
                    client_id: client._id.toString(),
                  };
                  bigQuery.queryJobPromise({ query, labels })
                    .then((sales) => {
                      bigQuery.getCount(bigQuery.outputTable, 'count', filter, (err, result) => {
                        if (err) {
                          logger.error(err);
                          res.status(500).json(INTERNAL_ERROR);
                        } else {
                          const { count } = result[0];
                          logger.info({ total: count, totalPages: Math.ceil(count / limit), currentPage: req.query.page });
                          res.status(200).json({ sales, meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: req.query.page } });
                        }
                      });
                    })
                    .catch((err) => {
                      logger.error(err);
                      res.status(500).json(INTERNAL_ERROR);
                    });
                }
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .get('/totals', (req, res) => {
    if (req.curveUser.clientId && !req.curveUser.payeeId) {
      Client.findById(req.curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) return res.status(403).json(FORBIDDEN);

            const selectColumns = [
              { column: 'units', isSelector: false, isGroupBy: false },
              { column: 'homeCurrencyGrossAmount', isSelector: false, isGroupBy: false },
              { column: 'homeCurrencyNetAmount', isSelector: false, isGroupBy: false },
              { column: 'calculationOutput', isSelector: false, isGroupBy: false },
            ];
            const sumCols = [
              { column: 'units', displayAs: 'units' },
              { column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' },
              { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' },
              { column: 'calculationOutput', displayAs: 'calculationOutput' },
            ];
            let filter = paramsToFilterField(req.query);
            if (Object.keys(filter).length === 0) { filter = 'true'; }
            const bigQuery = new BigQuery({
              datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
            });
            bigQuery.getAggregate(bigQuery.outputTable, selectColumns, sumCols, 'lines', filter, {}, (err, result) => {
              if (err) {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              } else {
                res.status(200).json({ outputTotals: result[0] });
              }
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else if (req.curveUser.payeeId) {
      Payee.findById(req.curveUser.payeeId)
        .then((payee) => {
          if (!payee) {
            res.status(404).json({ message: 'Payee not found' });
          } else {
            Client.findById(payee.clientId)
              .then(async (client) => {
                if (!client) {
                  res.status(404).json({ message: 'Client not found' });
                } else {
                  const sumCols = [
                    { column: 'units', displayAs: 'units' },
                    { column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' },
                    { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' },
                    { column: 'calculationOutput', displayAs: 'calculationOutput' },
                  ];

                  // When a payee is accessing their own sales, we need to ensure that the contractId is present
                  if (!req.query?.contractId) return res.status(403).json(FORBIDDEN);
                  // If the contractId is present, we need to ensure that the payee is associated with the contract
                  const contract = await Contract.findOne({ clientId: payee.clientId, _id: req.query.contractId, 'payees.payeeId': payee._id.toString() }).catch(logger.error);
                  if (!contract) return res.status(403).json(FORBIDDEN);

                  const filter = paramsToFilterField(req.query);
                  const bigQuery = new BigQuery({
                    datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
                  });
                  bigQuery.getAggregate(bigQuery.outputTable, sumCols, sumCols, 'lines', filter, {}, (err, result) => {
                    if (err) {
                      logger.error(err);
                      res.status(500).json(INTERNAL_ERROR);
                    } else {
                      res.status(200).json({ outputTotals: result[0] });
                    }
                  });
                }
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  // Dead route, not getting used by front-end
  .get('/:id', (req, res) => {
    if (req.curveUser.clientId) {
      if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'periods' })) return res.status(403).json(FORBIDDEN);

      Client.findById(req.curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const bigQuery = new BigQuery({
              datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
            });

            const { id } = req.params;
            const query = bigQuery.getDataQuery(bigQuery.outputTable, select, { id }, {});
            const labels = {
              job_type: 'output_sales',
              client_id: client._id.toString(),
              document_id: id,
            };

            bigQuery.queryJobPromise({ query, labels })
              .then((sales) => {
                res.status(200).json({ outputSales: sales });
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  });

function paramsToFilterField(inputParams) {
  const params = {};
  if (inputParams.periodId) { params.periodId = inputParams.periodId; }
  if (inputParams.contractId) { params.contractId = inputParams.contractId; }
  if (inputParams.contractPartitionNo) { params.contractPartitionNo = parseInt(inputParams.contractPartitionNo); }
  if (inputParams.salesFileId) { params.salesFileId = inputParams.salesFileId; }
  if (inputParams.catType) { params.catType = inputParams.catType; }
  if (inputParams.releaseIds) { params.releaseId = { $in: inputParams.releaseIds }; }
  if (inputParams.trackIds) { params.trackId = { $in: inputParams.trackIds }; }
  if (inputParams.workIds) { params.workId = { $in: inputParams.workIds }; }
  if (inputParams.distributionChannels) { params.distributionChannel = { $in: inputParams.distributionChannels }; }
  if (inputParams.configurations) { params.configuration = { $in: inputParams.configurations }; }
  if (inputParams.territories) { params.territory = { $in: formatTerritories(inputParams.territories) }; }
  if (inputParams.trackTitle) { params.catalogueTrackTitle = inputParams.trackTitle; }
  if (inputParams.trackArtist) { params.catalogueTrackArtist = inputParams.trackArtist; }
  if (inputParams.releaseArtist) { params.catalogueReleaseArtist = inputParams.releaseArtist; }
  if (inputParams.releaseTitle) { params.catalogueReleaseTitle = inputParams.releaseTitle; }
  if (inputParams.barcode) { params.barcode = inputParams.barcode; }
  if (inputParams.catNo) { params.catNo = inputParams.catNo; }
  if (inputParams.isrc) { params.isrc = inputParams.isrc; }
  if (inputParams.identifier) { params.identifier = inputParams.identifier; }
  if (inputParams.territory) { params.territory = inputParams.territory; }
  if (inputParams.distributionChannel) { params.distributionChannel = inputParams.distributionChannel; }
  if (inputParams.configuration) { params.configuration = inputParams.configuration; }
  if (inputParams.source) { params.source = inputParams.source; }
  if (inputParams.subSource) { params.subSource = inputParams.subSource; }
  return params;
}

function formatTerritories(territories) {
  const africa = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM',
    'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH',
    'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
  const americas = ['CW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR',
    'CU', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA',
    'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'BQ', 'SX'];
  const asia = ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO',
    'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK',
    'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'];
  const europe = ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR',
    'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL',
    'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
  const oceania = ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC',
    'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
  const world = ['CW', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR',
    'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS', 'DZ', 'AO', 'BJ', 'BW',
    'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE',
    'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL',
    'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO',
    'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT',
    'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC',
    'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP',
    'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG',
    'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY',
    'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU',
    'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA',
    'GB', 'AX', 'BQ', 'SX'];

  let formattedTerritories = [];

  territories.forEach((territory) => {
    if (territory === 'Africa') {
      formattedTerritories = formattedTerritories.concat(africa);
    } else if (territory === 'Americas') {
      formattedTerritories = formattedTerritories.concat(americas);
    } else if (territory === 'Asia') {
      formattedTerritories = formattedTerritories.concat(asia);
    } else if (territory === 'Europe') {
      formattedTerritories = formattedTerritories.concat(europe);
    } else if (territory === 'Oceania') {
      formattedTerritories = formattedTerritories.concat(oceania);
    } else if (territory === 'WW') {
      formattedTerritories = formattedTerritories.concat(world);
    } else {
      formattedTerritories.push(territory);
    }
  });

  return formattedTerritories;
}
module.exports = router;
