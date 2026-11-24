/* eslint-disable no-await-in-loop */
/**
 * @module collectData
 */
const { logger, utils } = require('@curveroyaltysystems/platform-shared-utils');
const { Storage } = require('@google-cloud/storage');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const { open } = require('node:fs/promises');

// Define fields which require loading of catalogue data
// NOTE: Any changes and/or additions to these lists may require changes in client.catalogueOverwritingData to ensure data is actually loaded from Catalogue DB
const fieldsToMapToCatalogue = {
  release: ['catalogueReleaseDate'],
  track: [],
  work: ['workIsrcs'],
  contract: ['contractForeignId', 'contractType', 'contractCategories'],
  payee: ['payeeName', 'payeeForeignId', 'payeeCategories'],
  period: ['periodName', 'periodYear', 'periodAccountingPeriod', 'periodAccountingPeriodType', 'periodStartDate', 'periodEndDate', 'periodAccountingDate'],
};

module.exports = {
  getData(bigQuery, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, format, logKey, callback) {
    const collectData = this;

    // Create a copy of the template before this is modified
    const originalTemplate = [...template];

    // Add selectors required for mapping to template
    template = collectData.addSelectorsRequiredForMapping(template, mappingData);

    // Remove any duplicates from template
    template = template.filter((value, index, self) => index === self.findIndex((t) => (t.field === value.field)));

    // Check suppress zero value to suppressing values
    if (suppressZeroValue) {
      filter.contractCurrencyCalculationOutput = { $ne: 0 };
    }

    // Remove items which are not in BigQuery schema
    collectData.removeNonSchemaItems(bigQuery, table, template, (err, templateOut) => {
      if (err) {
        callback(err);
      } else {
        const columns = collectData.getSelectAndSumColumnArray(templateOut, filter);
        const limit = 100000000;
        const options = { offset: 0, limit };
        const query = bigQuery.getAggregateQuery(table, columns.selectCols, columns.sumCols, 'lines', filter, options);

        // Set a limit before we stop streaming the query
        const totalLinesBeforeExportingToFile = 1_000_000;
        // Perform a query dry run to estimate the data size.
        bigQuery.getCount(table, 'count', filter, (err, countOutput) => {
          if (err) logger.error(err);
          const count = countOutput?.[0]?.count || 0;
          if (count > totalLinesBeforeExportingToFile) {
            // If the query size is above the limit we set, export query to a file
            // Remove the limit from the query to allow for wildcard files creation
            const options = { offset: 0 };
            const query = bigQuery.getAggregateQuery(table, columns.selectCols, columns.sumCols, 'lines', filter, options);
            try { exportQueryToFile(query, callback); } catch (error) { callback(error); }
          } else {
            // Otherwise, stream the query
            runQuery(query, callback);
          }
        });
      }
    });

    function exportQueryToFile(query, callback) {
      const bucketName = process.env.GCS_OUTPUT_SALES_EXPORT ?? 'output-sales-exports';
      const filename = `${table}-${moment().format('x')}-export-`;
      const gsPath = `gs://${bucketName}/${filename}*.json`;
      const exportQuery = `EXPORT DATA OPTIONS( uri='${gsPath}', overwrite=true, format='JSON') AS ${query}`;
      bigQuery.query(exportQuery, async (err) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else {
          // Process files
          const authOptions = { credentials: { client_email: process.env.BQ_client_email, private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '' } };
          const storage = new Storage(authOptions);
          // List all files on the bucket - files get deleted after 24h so shouldn't be an issue.
          const [files] = await storage.bucket(bucketName).getFiles();
          // Get files all wildcard files for this query
          const filesToProcess = files.filter((file) => file.name.includes(filename));
          logger.debug(`${filesToProcess.length} files to process`);
          // Loop through each file and add lines to the CSV
          for (const file of filesToProcess) {
            logger.info(`${filter.periodId} - Processing file: ${file.name}`);
            const destination = `${appRootDir}/tmp/${file.name}`;
            const options = { destination };
            await storage.bucket(bucketName).file(`${file.name}`).download(options);
            // Process file line by line
            const data = await open(destination);
            for await (const line of data.readLines()) {
              const row = JSON.parse(line);
              processDataRow({ row });
            }
            // Remove file.
            fs.unlinkSync(destination);
          }
          callback();
        }
      });
    }

    function runQuery(query, cb) {
      let count = 0;
      let calledBack = false;
      bigQuery.logQuery(bigQuery.inputTable, query, 'Calculation');
      bigQuery.client.createQueryStream(query)
        .on('error', (err) => {
          // Handle Errors
          if (err && (err.code === 409 || err.message.includes('Exceeded rate limits'))) {
            logger.debug('409: RETRYING QUERY');
            // Wait four seconds
            setTimeout(() => {
              // Retry
              if (!calledBack) {
                calledBack = true;
                runQuery(query, cb);
              }
            }, 4000);
          } else {
            logger.debug('UNKNOWN ERROR TYPE:');
            logger.error(err);

            if (!calledBack) {
              calledBack = true;
              return cb(err);
            }
          }
        })
        .on('data', (row) => {
          processDataRow({ row });
          count += 1;
          if (count % 10_000 === 0) {
            logger.info(`${logKey} - ${count} lines read`);
          }
        })
        .on('end', () => {
          logger.debug(`Completed CSV Write with ${count} lines`);
          // Needed in cases where callback is being called prior to completion
          if (!calledBack) {
            calledBack = true;
            return cb();
          }
        });
    }

    function processDataRow({ row }) {
      // Turn row to template
      row = collectData.lineToTemplate(row, originalTemplate, mappingData, format);
      // Add row to CSV
      writeCsv.addRow(row);
    }
  },
  getDataBatch(bigQuery, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, callback) {
    const collectData = this;

    // Create a copy of the template before this is modified
    const originalTemplate = [...template];

    // Add selectors required for mapping to template
    template = collectData.addSelectorsRequiredForMapping(template, mappingData);

    // Remove any duplicates from template
    template = template.filter((value, index, self) => index === self.findIndex((t) => (t.field === value.field)));

    // Remove items which are not in BigQuery schema
    collectData.removeNonSchemaItems(bigQuery, table, template, (err, templateOut) => {
      if (err) {
        callback(err);
      } else {
        const columns = collectData.getSelectAndSumColumnArray(templateOut, filter);
        const limit = 1000000;

        runQuery(0, columns, limit, callback);
      }
    });

    function runQuery(offset, columns, limit, cb) {
      const options = { offset, limit };
      if (columns.selectCols[0]) {
        options.orderBy = [columns.selectCols[0].column];
      }
      if (columns.selectCols[1]) {
        options.orderBy.push(columns.selectCols[1].column);
      }
      if (columns.selectCols[2]) {
        options.orderBy.push(columns.selectCols[2].column);
      }
      bigQuery.getAggregate(table, columns.selectCols, columns.sumCols, 'lines', filter, options, (err, res) => {
        if (err) {
          logger.error(err);
          cb(err);
        } else {
          // Remove 0 value lines if configured to
          if (suppressZeroValue) {
            res = collectData.removeZeroValues(res);
          }
          // Map to the passed template
          const resLength = res ? res.length : null;
          const mappedData = collectData.mapData(res, originalTemplate, mappingData, null);
          res = null;
          logger.debug('mappedData.length: ', mappedData.length);
          if (writeCsv) {
            // Write output data to CSV
            writeCsv.addData(mappedData, (err) => {
              if (resLength === limit) {
                runQuery(offset += limit, columns, limit, cb);
              } else {
                cb();
              }
            });
          } else {
            cb(null, mappedData);
          }
        }
      });
    }
  },
  getJoinedSalesData(bigQuery, filter, template, salesInputColumns, salesOutputColumns, contractIds, excludeContractIds, writeCsv, format, logKey, callback) {
    const collectData = this;
    const limit = 100000000;
    const options = { offset: 0, limit };
    const reducedContractIds = contractIds.slice(0, 18000);
    let query = bigQuery.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, reducedContractIds, excludeContractIds, options);
    // Replace catalogue items in query with param based query
    catalogueIdsToParams('releaseId NOT IN ', 'releaseIds');
    catalogueIdsToParams('releaseId IN ', 'inReleaseIds');
    catalogueIdsToParams('trackId NOT IN ', 'trackIds');
    catalogueIdsToParams('trackId IN ', 'inTrackIds');
    catalogueIdsToParams('workId NOT IN ', 'workIds');
    catalogueIdsToParams('contractId IN ', 'inContractIds');
    catalogueIdsToParams('contractId NOT IN ', 'contractIds');

    function catalogueIdsToParams(string, paramName) {
      // Copy original string
      const originalQuery = query.query ? query.query : query.slice();
      if (originalQuery.indexOf(string) !== -1) {
        if (typeof query === 'string') {
          // Set query to object
          query = {};
        }
        // Split string on HAVING to having element
        const split = originalQuery.split(string);
        let no = 0;
        let complete = false;
        let endingIndex;
        // logger.debug(split[1]);
        split[1].split('').forEach((letter, index) => {
          if (!complete && letter === '(') {
            no += 1;
          } else if (!complete && letter === ')') {
            no -= 1;
            if (no === 0) {
              complete = true;
              endingIndex = index;
            }
          }
        });
        let param = split[1].substring(0, endingIndex + 1);
        // Remove first and last characters
        param = param.slice(1);
        param = param.slice(0, param.length - 1);
        // Turn into array
        param = param.split(', ').map((item) => {
          // Remove speech marks
          item = item.slice(1);
          item = item.slice(0, item.length - 1);
          return item;
        });
        // Replace value
        split[1] = split[1].replace(split[1].slice(0, endingIndex + 1), `UNNEST(@${paramName})`);
        query.query = split.join(string);
        query.params = query.params || {};
        query.params[paramName] = param;
      }
    }

    runQuery(callback);

    function runQuery(cb) {
      // For use in mapping
      const contractIdsString = contractIds.join();
      let count = 0;
      logger.debug(query);
      bigQuery.logQuery(bigQuery.inputTable, query, 'Calculation');
      bigQuery.client.createQueryStream(query)
        .on('error', (err) => {
          // Handle Errors
          logger.error(err);
          if (err && err.code == 409 || err.message.includes('Exceeded rate limits')) {
            logger.debug('RETRYING EXCEEDED RATE');
            // Wait two seconds
            setTimeout(() => {
              // Retry
              runQuery(cb);
            }, 2000);
          } else {
            cb(err);
          }
        })
        .on('data', (row) => {
          count += 1;
          if (count % 10_000 === 0) {
            logger.info(`${logKey} - ${count} lines read`);
          }
          // Work around if more that 18k contracts
          let lineReported = false;
          if (row.contractIds) {
            const splitContractIds = row.contractIds.split(', ');
            splitContractIds.forEach((contractId) => {
              if (contractIdsString.includes(contractId)) {
                lineReported = true;
              }
            });
          }
          if (!lineReported) {
            // Turn row to template
            row = collectData.lineToTemplate(row, template, null, format);
            // Add row to CSV
            writeCsv.addRow(row);
          }
        })
        .on('end', () => {
          logger.debug(`Completed CSV Write with ${count} lines`);
          cb();
        });
    }
  },
  getTotals(bigQuery, table, filter, template, sort, writeCsv, format, callback) {
    const collectData = this;
    const columns = collectData.getSelectAndSumColumnArray(template, filter);
    bigQuery.getAggregate(table, columns.groupCols, columns.sumCols, 'lines', filter, {}, (err, res) => {
      if (err) { logger.error(err); }
      const mappedData = collectData.mapData(res, template, null, format);

      // Add Total wording
      let finalBlankCell = 0;
      if (mappedData && mappedData[0]) {
        mappedData[0].forEach((item, index) => {
          if (!item && finalBlankCell == index - 1) { finalBlankCell = index; }
        });
        mappedData[0][finalBlankCell] = 'Total';
        writeCsv.addData(mappedData, callback);
      } else {
        callback();
      }
    });
  },
  mapData(data, template, mappingData, format) {
    const collectData = this;
    if (data) {
      return data.map((line) => collectData.lineToTemplate(line, template, mappingData, format));
    }
    return [];
  },
  lineToTemplate(line, template, mappingData, format) {
    const collectData = this;
    // Map DB row to array in template
    const result = [];
    // Loop through template
    for (let i = 0; i < template.length; i += 1) {
      if (typeof line[template[i].field] === 'number' && format === 'EU Decimal Comma') { line[template[i].field] = utils.convertToEUFormat(line[template[i].field]); }

      if (line[template[i].field] && line[template[i].field].value) {
        // Map Big Query Specific Dates
        result[i] = moment(line[template[i].field].value).format('YYYY-MM-DD');
      } else if (mappingData && fieldsToMapToCatalogue.release.includes(template[i].field)) {
        // Map Release Specific Values
        // Switch value or default to found value
        result[i] = collectData.mapValueToCatalogueValue(mappingData.releases[line.releaseId], template[i].field, line[template[i].field]);
      } else if (mappingData && fieldsToMapToCatalogue.track.includes(template[i].field)) {
        // Map Track Specific Values
        // Switch value or default to found value
        result[i] = collectData.mapValueToCatalogueValue(mappingData.tracks[line.trackId], template[i].field, line[template[i].field]);
      } else if (mappingData && fieldsToMapToCatalogue.work.includes(template[i].field)) {
        // Map Work Specific Values
        // Switch value or default to found value
        result[i] = collectData.mapValueToCatalogueValue(mappingData.works[line.workId], template[i].field, line[template[i].field]);
      } else if (mappingData && fieldsToMapToCatalogue.contract.includes(template[i].field)) {
        // Map Contract Specific Values
        // Switch value or default to found value
        result[i] = collectData.mapValueToCatalogueValue(mappingData.contracts[line.contractId], template[i].field, line[template[i].field]);
      } else if (mappingData && fieldsToMapToCatalogue.payee.includes(template[i].field)) {
        const payeeIds = mappingData.contracts?.[line?.contractId]?.payees?.map((payee) => payee?.payeeId);
        const payeeNames = payeeIds?.map((payeeId) => mappingData.payees?.[payeeId]?.payeeName);
        // Map Payee Specific Values
        result[i] = payeeNames?.length ? payeeNames.join('; ') : null;
      } else if (mappingData && fieldsToMapToCatalogue.period.includes(template[i].field)) {
        // Map Period Specific Values
        // Switch value or default to found value
        result[i] = collectData.mapValueToCatalogueValue(mappingData.periods[line.periodId], template[i].field, line[template[i].field]);
      } else if (line[template[i].field] !== 'null') {
        // Strip out any null values
        result[i] = line[template[i].field];
      } else {
        result[i] = null;
      }
    }
    return result;
  },
  mapValueToCatalogueValue(item, field, originalValue) {
    if (item && item[field]) {
      return item[field];
    }
    return originalValue;
  },
  flattenLine(line) {
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
  },
  removeZeroValues(data) {
    return data.map((line) => {
      if (line.calculationOutput !== 0) {
        return line;
      }
    }).filter(Boolean);
  },
  getSelectAndSumColumnArray(template, filter) {
    const sumCols = [];
    const selectCols = [];
    const groupCols = [];

    for (let i = 0; i < template.length; i += 1) {
      if (template[i].type === 'Selector') {
        selectCols.push({
          column: template[i].field, displayAs: template[i].field, isSelector: true, isGroupBy: true,
        });
      } else if (template[i].type === 'Calculator') {
        sumCols.push({ column: template[i].field, displayAs: template[i].field });
      }
    }

    Object.keys(filter ?? {}).forEach((filterKey) => {
      if (filterKey.includes('Id')) {
        groupCols.push({
          column: filterKey, displayAs: filterKey, isSelector: false, isGroupBy: true,
        });
      }
    });

    return { selectCols, sumCols, groupCols };
  },

  /**
   * Removes items from template which are not in BigQuery schema
   *
   * * Calls `callback(err, templateOut)` with `templateOut` containing the modified template
   * * Calls `callback(err, templateOut)` with an `err` message if an error occurs
   *
   * @param {object} bigQuery - BigQuery instance
   * @param {string} databaseTable - Name of BigQuery database table
   * @param {array} template - Template to be modified
   * @param {function(string, array)} callback - A callback that handles the response
   */
  removeNonSchemaItems(bigQuery, databaseTable, template, callback) {
    // Strip any template items that don't match schema
    let templateOut = template;
    bigQuery.getSchema(databaseTable, (err, schema) => {
      if (schema) {
        const schemaNames = schema.fields.map((item) => item.name);
        templateOut = template.map((templateItem) => {
          if (!templateItem.field || schemaNames.indexOf(templateItem.field) !== -1) {
            return templateItem;
          }
        }).filter(Boolean);
      }
      callback(err, templateOut);
    });
  },

  /**
   * Adds selectors required for mapping to template
   *
   * @param {array} template - Output template
   * @param {object} mappingData - Mapping Data obtained through client.catalogueOverwritingData()
   * @returns Template with any selectors added if required
   */
  addSelectorsRequiredForMapping(template, mappingData) {
    // Get unique template field string - removing any duplicates
    const templateString = template.map((item) => { if (item) { return item.field; } }).filter((value, index, self) => self.indexOf(value) === index);

    // add selectors required for mapping only if mapping data is available
    if (mappingData) {
      // Set up template - adding releaseId, trackId, workId, contractId, payeeId or periodId if catalogue items selected
      let includesRelease; let includesTrack; let includesWork; let includesContract; let includesPayee; let includesPeriod;
      templateString.forEach((item) => {
        if (item && fieldsToMapToCatalogue.release.includes(item)) {
          includesRelease = true;
        } else if (item && fieldsToMapToCatalogue.track.includes(item)) {
          includesTrack = true;
        } else if (item && fieldsToMapToCatalogue.work.includes(item)) {
          includesWork = true;
        } else if (item && fieldsToMapToCatalogue.contract.includes(item)) {
          includesContract = true;
        } else if (item && fieldsToMapToCatalogue.payee.includes(item)) {
          includesPayee = true;
        } else if (item && fieldsToMapToCatalogue.period.includes(item)) {
          includesPeriod = true;
        }
      });
      // Add selectors if they are true, but only if the selector is not already included in the template to template
      if (includesRelease && !templateString.includes('releaseId')) { template.push({ field: 'releaseId', type: 'Selector' }); }
      if (includesTrack && !templateString.includes('trackId')) { template.push({ field: 'trackId', type: 'Selector' }); }
      if (includesPeriod && !templateString.includes('periodId')) { template.push({ field: 'periodId', type: 'Selector' }); }
      if (includesWork && !templateString.includes('workId')) { template.push({ field: 'workId', type: 'Selector' }); }
      if ((includesContract || includesPayee) && !templateString.includes('contractId')) { template.push({ field: 'contractId', type: 'Selector' }); }
    }
    return template;
  },
};
