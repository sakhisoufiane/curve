const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const async = require('async');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Work = require('../../models/work');
const Filter = require('../filter');

function getGroup(template) {
  const group = {};
  const selectors = {};
  for (let i = 0; i < template.length; i += 1) {
    if (template[i].field === 'catalogueCatNo') { group[template[i].field] = { $first: '$catalogueCatNo' }; }
    if (template[i].field === 'catalogueIsrc') { group[template[i].field] = { $first: '$catalogueIsrc' }; }
    if (template[i].field === 'source') { group[template[i].field] = { $first: '$source' }; }
    if (template[i].type === 'Selector') {
      if (template[i].field === 'releaseId') {
        selectors[template[i].field] = '$releaseIds';
      } else if (template[i].field === 'trackId') {
        selectors[template[i].field] = '$trackIds';
      } else {
        selectors[template[i].field] = `$${template[i].field}`;
      }
    } else if (template[i].type === 'Calculator') {
      group[template[i].field] = { $sum: `$${template[i].field}` };
    }
  }
  group._id = selectors;
  return group;
}

function splitOutArrayParams(queryObj, selector) {
  const occurances = (queryObj.query.match(new RegExp(`${selector} IN`, 'g')) || []);
  if (occurances.length > 0) {
    occurances.forEach((item, idx) => {
      const subStr = queryObj.query.substr(queryObj.query.indexOf(`${selector} IN (`, idx));
      const arrayString = subStr.replace(new RegExp(`(${selector} IN \\()([^)]+)\\)(.*)`), '$2');
      const re = new RegExp(`(${selector} IN)( \\([^)]+)\\)`);
      queryObj.query = queryObj.query.replace(re, `$1 UNNEST(@${selector}${idx})`);
      queryObj.params[`${selector}${idx}`] = arrayString.replace(/[" ]/g, '').split(',');
    });
  }
  return queryObj;
}

function getSelectAndSumColumnArray(template) {
  const sumCols = [];
  const selectCols = [];

  for (let i = 0; i < template.length; i += 1) {
    if (template[i].type === 'Selector') {
      selectCols.push({
        column: template[i].field, displayAs: template[i].field, isSelector: true, isGroupBy: true,
      });
    } else if (template[i].type === 'Calculator') {
      sumCols.push({ column: template[i].field, displayAs: template[i].field });
    }
  }
  return { selectCols, sumCols };
}

function flattenLine(line) {
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
}

function checkAndAddValues(totals, key, row, rowVal, valueColumn) {
  if (key === 'revenueOverTime' && rowVal && rowVal.value) {
    rowVal = `${String(rowVal.value).substr(5, 2)}-${String(rowVal.value).substr(0, 4)}`;
  }
  if (rowVal && rowVal !== 'null' && row[valueColumn]) {
    const item = totals[key][rowVal] = totals[key][rowVal] || {
      value: 0,
      units: 0,
    };
    item.value += (row[valueColumn] || 0);
    item.units += (row.units || 0);
  }
}

function getTotalsAsArrays(totals, catalogueData) {
  const totalsAsArrays = {};
  Object.keys(totals).forEach((key) => {
    totalsAsArrays[key] = [];
    Object.keys(totals[key]).forEach((type) => {
      const typeObj = totals[key][type];
      const item = {};
      if (key === 'trackIds') {
        const catItem = catalogueData.tracks[type];
        if (catItem) {
          item.id = catItem.id;
          item.title = catItem.title;
          item.type = catItem.isrc || '';
          item.artist = catItem.artist || '';
        }
      } else if (key === 'releaseIds') {
        const catItem = catalogueData.releases[type];
        if (catItem) {
          item.id = catItem.id;
          item.title = catItem.title;
          item.type = catItem.catNo || '';
          item.artist = catItem.artist || '';
        }
      } else if (key === 'workIds') {
        const catItem = catalogueData.works[type];
        if (catItem) {
          item.id = catItem.id;
          item.title = catItem.title;
          item.type = catItem.identifier || '';
        }
      } else if (key === 'revenueOverTime') {
        // const dateAsMonthYear = type.substr(5, 2) + "-" + type.substr(0, 4);
        // ignore date 01-1970
        if (type !== '01-1970') {
          item.date = type;
          item.data = typeObj.value;
        }
      } else {
        item.type = type;
      }
      // only add item if it has properties (to make sure non-matched catalouge items are removed)
      if (Object.keys(item).length > 0) {
        if (key !== 'costs') {
          item.units = typeObj.units;
        }
        item.value = typeObj.value;
        totalsAsArrays[key].push(item);
      }
    });
  });
  return totalsAsArrays;
}

const Analytics = {
  getAnalytics(filter, outputs, options, callback) {
    logger.debug(`Analytics.getAnalytics called with options: ${JSON.stringify(options)}`);
    logger.debug(`Filter: ${JSON.stringify(filter)}`);

    async.waterfall([
      function (cb) {
        if ((!options.payeeId && !options.clientId) || (options.payeeId && options.clientId)) {
          cb(new Error('need to supply either payeeId or clientId'));
        } else cb();
      },
      function (cb) {
        // Get client from payeeId or clientId
        if (options.payeeId) {
          Payee.findById(options.payeeId)
            .then((payee) => {
              if (!payee) {
                cb(new Error(`Payee not found, with id ${options.payeeId}`));
              } else {
                Client.findById(payee.clientId)
                  .then((foundClient) => {
                    if (!foundClient) {
                      cb(new Error(`Client not found, with id ${options.clientId}`));
                    } else {
                      cb(null, foundClient);
                    }
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              }
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          Client.findById(options.clientId)
            .then((foundClient) => {
              if (!foundClient) {
                cb(new Error(`Client not found, with id ${options.clientId}`));
              } else {
                cb(null, foundClient);
              }
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        }
      },
      function (client, cb) {
        // set table and column containing calculated value according to user type
        if (options.payeeId && client.clientType === 'Publisher') {
          logger.info(`getting Analytics for publishing payee ${options.payeeId}`);
          options.table = 'Royalties';
          options.valueColumn = 'calculationOutput';
        } else if (options.payeeId) {
          logger.info(`getting Analytics for payee ${options.payeeId}`);
          options.table = 'Sales';
          options.valueColumn = 'contractCurrencyCalculationOutput';
        } else if (client.clientType === 'Publisher') {
          logger.info(`getting Analytics for publishing client ${options.clientId}`);
          options.table = 'Income Data';
          options.valueColumn = 'homeCurrencyNetAmount';
        } else {
          logger.info(`getting Analytics for client ${options.clientId}`);
          options.table = 'Sales Input';
          options.valueColumn = 'homeCurrencyNetAmount';
        }
        // add separate catalogue outputs if catalogue requested
        if (outputs.includes('catalogue')) {
          if (client.clientType === 'Publisher') {
            outputs.push('workIds');
          } else {
            outputs = outputs.concat(['releaseIds', 'trackIds']);
          }
        }
        // define output to db column assignments
        const outputAssignments = {
          distributionChannels: 'distributionChannel',
          configurations: 'configuration',
          territories: 'territory',
          sources: 'source',
          subSources: 'subSource',
          releaseIds: 'releaseId',
          trackIds: 'trackId',
          workIds: 'workId',
          costs: 'type',
          revenueOverTime: 'saleDate',
          averageStreamRates: 'averageStreamRates',
          contractBreakdown: 'contractBreakdown',
        };
        // set up requests and assign column names to outputs
        const requests = {};
        requests.combined = {}; // we need at least one combined filter call to get totals
        outputs.forEach((outputName) => {
          // move catalogue items and costs into separate list to be queried separately
          if (['releaseIds', 'trackIds', 'workIds', 'costs'].includes(outputName)) {
            requests[outputName] = { [outputName]: outputAssignments[outputName] };
          } else if (outputName === 'topArtists') {
            requests.artistsAndLabels = requests.artistsAndLabels || {};
            requests.artistsAndLabels.catalogueTrackArtist = 'catalogueTrackArtist';
            requests.artistsAndLabels.catalogueReleaseArtist = 'catalogueReleaseArtist';
            requests.artistsAndLabels.catType = 'catType';
          } else if (outputName === 'topLabels') {
            requests.artistsAndLabels = requests.artistsAndLabels || {};
            requests.artistsAndLabels.catalogueTrackLabel = 'catalogueTrackLabel';
            requests.artistsAndLabels.catalogueReleaseLabel = 'catalogueReleaseLabel';
            requests.artistsAndLabels.catType = 'catType';
          } else if (outputName === 'averageStreamRates') {
            requests.averageStreamRates = {
              sources: outputAssignments.sources,
              subSources: outputAssignments.subSources,
            };
          } else if (outputName === 'contractBreakdown') {
            requests.contractBreakdown = {
              contractName: 'contractName',
            };
          } else if (outputAssignments[outputName]) {
            requests.combined[outputName] = outputAssignments[outputName];
          }
        });
        logger.debug(`requests: ${JSON.stringify(requests, null, 2)}`);
        const totals = {};
        async.each(Object.keys(requests), (requestName, eachCb) => {
          const reqOptions = { ...options };
          reqOptions.client = client;
          // limit request to 100 for catalogue data
          if (['trackIds', 'releaseIds', 'workIds'].includes(requestName)) {
            reqOptions.limit = 100;
            reqOptions.orderBy = options.valueColumn;
          }
          if (requestName === 'averageStreamRates') {
            reqOptions.orderBy = [outputAssignments.sources, outputAssignments.subSources];
            reqOptions.orderDir = 'ASC';
          }
          if (requestName === 'contractBreakdown') {
            reqOptions.table = 'Sales';
            reqOptions.valueColumn = 'calculationOutput';
            reqOptions.valueColumn2 = 'homeCurrencyNetAmount';
            reqOptions.limit = 100;
            reqOptions.orderBy = 'calculationOutput';
          }
          if (requestName === 'costs') {
            if (options.payeeId) {
              reqOptions.table = 'Costs Output';
              reqOptions.valueColumn = 'calculationOutput';
            } else {
              reqOptions.table = 'Costs Input';
              reqOptions.valueColumn = 'amount';
            }
          }
          async.waterfall([
            function (waterfallCb) {
              Analytics.getData(filter, requests[requestName], reqOptions, waterfallCb);
            },
            function (data, waterfallCb) {
              if (requestName === 'artistsAndLabels') {
                Analytics.getArtistsAndLabelsTotals(data, reqOptions.valueColumn, waterfallCb);
              } else if (requestName === 'averageStreamRates') {
                // get and return average stream rates
                const averageStreamRates = [];
                data.forEach((row) => {
                  if ((row.source || row.subSource) && typeof row[reqOptions.valueColumn] === 'number' && typeof row.units === 'number') {
                    averageStreamRates.push({
                      source: row.source,
                      subSource: row.subSource,
                      averageStreamRate: row[reqOptions.valueColumn] / row.units,
                    });
                  }
                });
                waterfallCb(null, { averageStreamRates });
              } else if (requestName === 'contractBreakdown') {
                const contractBreakdown = [];
                data.forEach((row) => {
                  if (row.contractName && row.contractName !== 'null') {
                    contractBreakdown.push({
                      contractName: row.contractName,
                      royalty: row[reqOptions.valueColumn],
                      revenue: row[reqOptions.valueColumn2],
                    });
                  }
                });
                waterfallCb(null, { contractBreakdown });
              } else {
                Analytics.getFieldTotals(data, requests[requestName], reqOptions.valueColumn, waterfallCb);
              }
            },
            function (requestTotals, waterfallCb) {
              Object.keys(requestTotals).forEach((outputName) => {
                // sort Artists and Labels by value and return only the top 100
                if (['trackArtists', 'releaseArtists', 'trackLabels', 'releaseLabels'].includes(outputName)) {
                  const nameObj = requestTotals[outputName];
                  const nameObjSorted = _.orderBy(nameObj, 'value', 'desc');
                  requestTotals[outputName] = nameObjSorted.splice(0, 100);
                }
              });
              waterfallCb(null, requestTotals);
            },
          ], (err, requestTotals) => {
            if (err) {
              eachCb(err);
            } else {
              // merge output into data to be returned
              Object.assign(totals, requestTotals || {});
              eachCb();
            }
          });
        }, (err) => {
          logger.debug(`\n------------------\ncombined totals: ${JSON.stringify(totals, null, 2)}`);
          cb(err, totals);
        });
      },
    ], callback);
  },

  getData(filter, outputCols, options, callback) {
    let template = Object.keys(outputCols).map((outputName) => ({ field: outputCols[outputName], type: 'Selector' }));
    // set up calculator columns
    template.push({
      field: options.valueColumn,
      type: 'Calculator',
    });
    // optional additonal value column
    if (options.valueColumn2) {
      template.push({
        field: options.valueColumn2,
        type: 'Calculator',
      });
    }
    if (!['Costs Output', 'Costs Input'].includes(options.table)) {
      template.push({
        field: 'units',
        type: 'Calculator',
      });
    }

    async.waterfall([
      function (waterfallCb) {
        // Build DB filter from supplied filter array
        Filter.filterToDbFilter(filter, options, waterfallCb);
      },
      function (dbFilter, waterfallCb) {
        const { client } = options;
        logger.debug(`-----------\ndbFilter:${JSON.stringify(dbFilter, null, 2)}`);
        if (dbFilter) {
          // set catType for catalogue item output types
          if (outputCols.releaseIds) {
            dbFilter.catType = 'Release';
          } else if (outputCols.trackIds) {
            dbFilter.catType = 'Track';
          } else if (outputCols.workIds) {
            dbFilter.catType = 'Work';
          }
          // TODO: check if the below is needed. Should be handled in front end?
          // Get unique template field string - removing any duplicates
          const templateString = template.map((item) => { if (item) { return item.field; } }).filter((value, index, self) => self.indexOf(value) === index);
          // Remove any duplicates
          const templateOutput = [];
          template.forEach((item) => {
            templateOutput[templateString.indexOf(item.field)] = item;
          });
          template = templateOutput;

          if (options.table === 'Costs Input') {
            // Setup Mongo connection
            MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
              .then((mongoClient) => {
                const db = mongoClient.db(databaseUtils.getMongoDBName());
                const group = getGroup(template);
                const aggregate = [
                  { $match: dbFilter },
                  { $group: group },
                ];
                const collection = db.collection('costs');
                collection.aggregate(aggregate, { allowDiskUse: true })
                  .toArray()
                  .then((findResult) => {
                    let mappedData = [];
                    if (Array.isArray(findResult)) {
                      // Flatten lines
                      mappedData = findResult.map((line) => flattenLine(line));
                    }
                    // Close DB Connection
                    mongoClient.close();
                    waterfallCb(null, mappedData);
                  })
                  .catch(waterfallCb);
              })
              .catch(waterfallCb);
          } else {
            // Set up Big Query
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            let databaseTable;
            if (options.table === 'Sales Input' || options.table === 'Income Data') {
              databaseTable = client.bigQuerySalesTable;
            } else if (options.table === 'Costs Output') {
              databaseTable = client.bigQueryPeriodCosts;
            } else {
              databaseTable = client.bigQueryPeriodSales;
            }
            async.waterfall([
              function (waterfallCb2) {
                // Strip any template items that don't match schema
                bigQuery.getSchema(databaseTable, (err, schema) => {
                  if (schema) {
                    // Get schema field names
                    schema = schema.fields.map((item) => item.name);
                    // Only use fields from within the schema - strip out values that don't exist
                    template = template.map((templateItem) => {
                      if (schema.indexOf(templateItem.field) !== -1) {
                        return templateItem;
                      }
                    }).filter(Boolean);
                    waterfallCb2();
                  } else {
                    waterfallCb2(err);
                  }
                });
              },
            ], () => {
              // Get Data
              const columns = getSelectAndSumColumnArray(template);
              const queryOptions = { offset: 0, limit: options.limit };
              if (options.orderBy) {
                queryOptions.orderBy = options.orderBy;
                if (options.orderDir) {
                  queryOptions.orderDir = options.orderDir;
                } else {
                  queryOptions.orderDir = 'DESC'; // default to DESC order
                }
              }
              if (Array.isArray(columns.selectCols)) {
                columns.selectCols.forEach((col) => {
                  if (col.column === 'saleDate') {
                    col.truncateDateBy = 'MONTH';
                    queryOptions.orderBy = 'saleDate';
                    queryOptions.orderDir = 'ASC';
                  }
                });
              }
              try {
                const labels = {
                  job_type: 'analytics',
                  client_id: client._id.toString(),
                };

                const query = Analytics.buildQuery(bigQuery, databaseTable, columns.selectCols, columns.sumCols, dbFilter, queryOptions);
                let queryObj = {
                  query,
                  params: {},
                };
                queryObj = splitOutArrayParams(queryObj, 'releaseId');
                queryObj = splitOutArrayParams(queryObj, 'trackId');
                queryObj = splitOutArrayParams(queryObj, 'workId');
                queryObj = splitOutArrayParams(queryObj, 'salesFileId');
                logger.debug(queryObj.query);
                Analytics.runQuery(bigQuery, queryObj, labels, waterfallCb);
              } catch (err) {
                logger.error(err);
                waterfallCb(err);
              }
            });
          }
        } else {
          waterfallCb(null, []);
        }
      },

    ], callback);
  },

  getFieldTotals(results, outputCols, valueColumn, callback) {
    const totals = {};
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalCosts = 0;

    Object.keys(outputCols).forEach((outputName) => {
      totals[outputName] = {};
    });
    results.forEach((row) => {
      Object.keys(totals).forEach((key) => {
        const rowVal = row[outputCols[key]];
        checkAndAddValues(totals, key, row, rowVal, valueColumn);
      });
      // add up totals
      if (outputCols.costs) {
        totalCosts += (row[valueColumn] || 0);
      } else if (!(outputCols.releaseIds || outputCols.trackIds || outputCols.workIds)) {
        // only add to totals for non-catalogue data
        totalRevenue += (row[valueColumn] || 0);
        totalUnits += (row.units || 0);
      }
    });
    logger.debug(`totals: ${JSON.stringify(totals, null, 2)}`);

    Analytics.getCatalogueData(totals, (err, catalogueData) => {
      if (err) {
        callback(err);
      } else {
        const totalsAsArrays = getTotalsAsArrays(totals, catalogueData);
        if (totalRevenue) totalsAsArrays.totalRevenue = totalRevenue;
        if (totalUnits) totalsAsArrays.totalUnits = totalUnits;
        if (totalCosts) totalsAsArrays.totalCosts = totalCosts;
        logger.debug(`totalsAsArrays: ${JSON.stringify(totalsAsArrays, null, 2)}`);
        callback(null, totalsAsArrays);
      }
    });
  },

  getArtistsAndLabelsTotals(results, valueColumn, callback) {
    const totals = {};
    results.forEach((row) => {
      if (row.catType === 'Track') {
        if (row.catalogueTrackArtist) {
          totals.topArtists = totals.topArtists || {};
          checkAndAddValues(totals, 'topArtists', row, row.catalogueTrackArtist, valueColumn);
        }
        if (row.catalogueTrackLabel) {
          totals.topLabels = totals.topLabels || {};
          checkAndAddValues(totals, 'topLabels', row, row.catalogueTrackLabel, valueColumn);
        }
      } else if (row.catType === 'Release') {
        if (row.catalogueReleaseArtist) {
          totals.topArtists = totals.topArtists || {};
          checkAndAddValues(totals, 'topArtists', row, row.catalogueReleaseArtist, valueColumn);
        }
        if (row.catalogueReleaseLabel) {
          totals.topLabels = totals.topLabels || {};
          checkAndAddValues(totals, 'topLabels', row, row.catalogueReleaseLabel, valueColumn);
        }
      }
    });
    const totalsAsArrays = getTotalsAsArrays(totals, {});
    logger.debug(`totalsAsArrays: ${JSON.stringify(totalsAsArrays, null, 2)}`);
    callback(null, totalsAsArrays);
  },

  getCatalogueData(totals, callback) {
    const catalogueData = {
      tracks: {},
      releases: {},
      works: {},
    };
    async.each(Object.keys(totals), (key, eachCb) => {
      if (key === 'trackIds') {
        Track.find({ _id: { $in: Object.keys(totals[key]).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
          .then((tracks) => {
            if (tracks) {
              tracks.forEach((track) => {
                const id = track._id.toString();
                catalogueData.tracks[id] = track;
              });
              eachCb();
            }
          })
          .catch((err) => {
            logger.error(err);
            eachCb(err);
          });
      } else if (key === 'releaseIds') {
        Release.find({ _id: { $in: Object.keys(totals[key]).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
          .then((releases) => {
            if (releases) {
              releases.forEach((release) => {
                const id = release._id.toString();
                catalogueData.releases[id] = release;
              });
              eachCb();
            }
          })
          .catch((err) => {
            logger.error(err);
            eachCb(err);
          });
      } else if (key === 'workIds') {
        Work.find({ _id: { $in: Object.keys(totals[key]).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
          .then((works) => {
            if (works) {
              works.forEach((work) => {
                const id = work._id.toString();
                catalogueData.works[id] = work;
              });
              eachCb();
            }
          })
          .catch((err) => {
            logger.error(err);
            eachCb(err);
          });
      } else {
        eachCb();
      }
    }, () => {
      callback(null, catalogueData);
    });
  },

  buildQuery(bigQuery, databaseTable, selectCols, sumCols, dbFilter, queryOptions) {
    return bigQuery.getAggregateQuery(databaseTable, selectCols, sumCols, 'lines', dbFilter, queryOptions);
  },

  /**
   *
   * @param {BigQuery} bigQuery
   * @param {Query} query
   * @param {Object<string, string>} labels
   * @param runQueryCb
   */
  runQuery(bigQuery, query, labels, runQueryCb) {
    const results = [];
    bigQuery.client.createQueryStream({ ...query, labels })
      .on('error', (err) => {
        // Handle Errors
        logger.error(err);
        if (err && err.code === 409 || err.message.includes('Exceeded rate limits')) {
          logger.info('RETRYING EXCEEDED RATE');
          // Wait two seconds
          setTimeout(() => {
            // Retry
            this.runQuery(bigQuery, query, labels, runQueryCb);
          }, 2000);
        } else {
          runQueryCb(err);
        }
      })
      .on('data', (row) => {
        results.push(row);
        if (results.length % 100000 === 0) logger.debug(results.length);
      })
      .on('end', () => {
        logger.info(`Returning ${results.length} lines`);
        runQueryCb(null, results);
      });
  },
};

module.exports = Analytics;
