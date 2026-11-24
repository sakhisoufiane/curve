/**
 * @module validate
 */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { currencies } = require('./salesIngestionUtils');

const currencyCodes = currencies.map((currency) => currency.code);

module.exports = {
  /**
   * Obtains validation data for Sales File Id from Sales Database
   *
   * * Calls `callback(err, result)` with `result` containing the validation data
   * * Calls `callback(err, result)` with an `err` message if an error occurs
   *
   * @param {string} salesFileId - The Sales File Id
   * @param {object} bigQuery - bigQuery instance
   * @param {function(string, object)} callback - A callback that handles the response
   */
  getDatabaseData(salesFileId, bigQuery, callback) {
    logger.debug('Getting Validation Data');
    async.parallel({
      general(cb) {
        const query = `SELECT sum(units) AS units, sum(netAmount) AS netAmount, sum(homeCurrencyNetAmount) AS homeCurrencyNetAmount, sum(grossAmount) AS grossAmount, sum(homeCurrencyGrossAmount) AS homeCurrencyGrossAmount, sum(1) AS lines
          FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
          WHERE salesFileId = "${salesFileId}"`;
        bigQuery.query(query, cb);
      },
      invalidLines(cb) {
        const query = `SELECT sum(1) as invalidLines
          FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
          WHERE salesFileId = "${salesFileId}" AND status = "Incomplete"`;
        bigQuery.query(query, cb);
      },
    }, (err, res) => {
      if (err) {
        callback(err);
      } else {
        res.general[0].invalidLines = res.invalidLines[0].invalidLines;
        callback(null, res.general[0]);
      }
    });
  },

  /**
   * Obtains the net amount from Sales Database
   *
   * * Calls `callback(err, result)` with `result` containing the validation data
   * * Calls `callback(err, result)` with an `err` message if an error occurs
   *
   * @param {string} salesFileId - The Sales File Id
   * @param {object} bigQuery - bigQuery instance
   * @param {function(string, object)} callback - A callback that handles the response
   */
  getNetAmountFromDatabase(salesFileId, bigQuery, callback) {
    logger.debug('Getting Validation Data');
    const query = `SELECT sum(homeCurrencyNetAmount) AS homeCurrencyNetAmount, sum(1) AS lines
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
      WHERE salesFileId = "${salesFileId}"`;
    bigQuery.query(query, (err, res) => {
      if (err) {
        callback(err);
      } else {
        callback(null, res[0]);
      }
    });
  },

  /**
   * Obtains Validation Data from the supplied Sales Data
   *
   * * Calls `callback(err, result)` with `result` containing the validation data
   * * Calls `callback(err, result)` with an `err` message if an error occurs
   *
   * @param {object[]} data - Sales Data mapped to the Template
   * @param {function(string, object)} callback - A callback that handles the response
   */
  getValidationDataFromData(data, callback) {
    try {
      const result = {
        units: 0,
        validationUnits: 0,
        netAmount: 0,
        validationNetAmount: 0,
        homeCurrencyNetAmount: 0,
        lines: 0,
        validationLines: 0,
        invalidLines: 0,
        valid: 0,
        grossAmount: 0,
        homeCurrencyGrossAmount: 0,
        distributionChannels: [],
        configurations: [],
        priceCategories: [],
        territories: [],
        sources: [],
        subSources: [],
        currencies: [],
        currencyCodes: [],
        releases: [],
        tracks: [],
        works: [],
        contracts: [],
        invalidFields: {
          saleDate: false,
          transactionDate: false,
        },
      };
      async.each(data, (line, cb) => {
        // Update values
        result.lines += 1;
        result.validationLines += 1;
        if (line.units) { result.units += line.units; }
        if (line.units) { result.validationUnits += line.units; }
        if (line.netAmount) { result.netAmount += line.netAmount; }
        if (line.netAmount) { result.validationNetAmount += line.netAmount; }
        if (line.homeCurrencyNetAmount) { result.homeCurrencyNetAmount += line.homeCurrencyNetAmount; }
        if (line.grossAmount) { result.grossAmount += line.grossAmount; }
        if (line.homeCurrencyGrossAmount) { result.homeCurrencyGrossAmount += line.homeCurrencyGrossAmount; }
        if (line.status === 'Incomplete') { result.invalidLines += 1; }
        // Manage mappings
        if (!line.distributionChannel && line.originalDistributionChannel && !result.distributionChannels.includes(line.originalDistributionChannel)) {
          result.distributionChannels.push(line.originalDistributionChannel);
        }
        if (!line.configuration && line.originalConfiguration && !result.configurations.includes(line.originalConfiguration)) {
          result.configurations.push(line.originalConfiguration);
        }
        if (!line.priceCategory && line.originalPriceCategory && !result.priceCategories.includes(line.originalPriceCategory)) {
          result.priceCategories.push(line.originalPriceCategory);
        }
        if (!line.territory && line.originalTerritory && !result.territories.includes(line.originalTerritory)) {
          result.territories.push(line.originalTerritory);
        }
        if (line.source && !result.sources.includes(line.source)) {
          result.sources.push(line.source);
        }
        if (line.subSource && !result.subSources.includes(line.subSource)) {
          result.subSources.push(line.subSource);
        }
        if (!line.exchangeRate && line.exchangeRate !== 0 && !result.currencies.includes(line.originalCurrency)) {
          result.currencies.push(line.originalCurrency);
        }
        if (line.originalCurrency && !currencyCodes.includes(line.originalCurrency) && !result.currencyCodes.includes(line.originalCurrency)) {
          result.currencyCodes.push(line.originalCurrency);
        }
        if (((!line.releaseId && line.catType === 'Release') || (line.catType === 'Contract' && !line.releaseId && (line.catNo || line.barcode))) && !result.releases.includes({
          title: line.originalReleaseTitle, artist: line.originalReleaseArtist, catNo: line.catNo, barcode: line.barcode,
        })) {
          result.releases.push({
            title: line.originalReleaseTitle, artist: line.originalReleaseArtist, catNo: line.catNo, barcode: line.barcode,
          });
        }
        if (((!line.trackId && line.catType === 'Track') || (!line.trackId && line.catType === 'Contract' && line.isrc)) && !result.tracks.includes({
          title: line.originalTrackTitle, artist: line.originalTrackArtist, isrc: line.isrc,
        })) {
          result.tracks.push({
            title: line.originalTrackTitle, artist: line.originalTrackArtist, isrc: line.isrc,
          });
        }
        if (!line.workId && (['Work', 'Contract'].includes(line.catType) && (line.originalWorkTitle || line.originalIdentifier)) && !result.releases.includes({
          title: line.originalWorkTitle,
          identifier: line.originalIdentifier,
          tunecode: line.tunecode,
          iswc: line.iswc,
          songcode: line.songCode,
          source: line.source,
          party1: line.party1,
          party2: line.party2,
          party3: line.party3,
          party4: line.party4,
          party5: line.party5,
        })) {
          result.works.push({
            title: line.originalWorkTitle,
            identifier: line.originalIdentifier,
            tunecode: line.tunecode,
            iswc: line.iswc,
            songcode: line.songCode,
            source: line.source,
            party1: line.party1,
            party2: line.party2,
            party3: line.party3,
            party4: line.party4,
            party5: line.party5,
          });
        }
        if (!line.contractId && line.contractIdentifier && !result.contracts.includes(line.contractIdentifier)) {
          result.contracts.push(line.contractIdentifier);
        }
        if (!line.transactionDate) { result.invalidFields.transactionDate = true; }
        if (!line.saleDate) { result.invalidFields.saleDate = true; }
        cb();
      }, (err) => {
        callback(err, result);
      });
    } catch (err) {
      logger.debug(err);
      callback(new Error('There was an error in getting validation data from the ingested data.'));
    }
  },

  /**
   * Compares number of units, lines and the Net Amount and returns true if all match
   *
   * @param {object} databaseResults - Validation data from Sales Database
   * @param {object} dataResults - Validation data from Sales Ingestion process
   * @returns {boolean} *true* if totals from both objects match
   */
  valid(databaseResults, dataResults) {
    if (databaseResults && dataResults && databaseResults.units === dataResults.units && databaseResults.netAmount === dataResults.netAmount && databaseResults.lines === dataResults.lines) {
      return true;
    }
    return false;
  },
};
