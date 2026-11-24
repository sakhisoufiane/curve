/* eslint-disable no-undef */
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { logger, BigQuery, databaseUtils, utils, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const moment = require('moment');
const async = require('async');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Period = require('../../models/period');
const SalesFile = require('../../models/salesFile');
const Payee = require('../../models/payee');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Report = require('../../models/report');
const User = require('../../models/user');
const Task = require('../../models/task');
const Filter = require('../../libs/filter');
const Cost = require('../../models/cost');

// TODO: This file is a duplicate of customReport.js in Processor, remove this and use that at some point
// TODO: Make sure to add a custom limit field when doing the above so the preview can always return 500 rows

// Define fields which require loading of catalogue data
// NOTE: Any changes and/or additions to these lists will require changes in 'Get relevant catalogue mapping data' below to ensure data is actually loaded from Catalogue DB
const fieldsToMapToCatalogue = {
  release: ['catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueReleaseProjectId', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueReleaseDate', 'ppd', 'catalogueFormat', 'releaseCatalogueGroups'],
  track: ['catalogueIsrc', 'catalogueTrackForeignId', 'catalogueTrackProjectId', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'trackCatalogueGroups'],
  work: ['catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueWorkProjectId', 'catalogueIswc', 'catalogueTunecode', 'workIsrcs', 'workCatalogueGroups'],
  contract: ['contractName', 'contractForeignId', 'contractProjectId', 'contractType', 'contractCategories', 'contractCurrency', 'contractDealType', 'contractProfitSharePercentage'],
  payee: ['payeeName', 'payeeForeignId', 'payeeProjectId', 'payeeCategories'],
  period: ['periodName', 'periodYear', 'periodAccountingPeriod', 'periodAccountingPeriodType', 'periodStartDate', 'periodEndDate', 'periodAccountingDate'],
};

function createReportPreview(report, callback) {
  const labelSubset = {
    job_type: 'custom_report',
    client_id: report.clientId,
    document_id: report._id.toString(),
  };

  let mongoConnection;
  async.waterfall([
    function (cb) {
      if (report.payeeId) {
        Payee.findById(report.payeeId)
          .then((payee) => {
            if (payee) {
              Client.findById(payee.clientId)
                .then((client) => {
                  if (!client) return cb(new Error('Could not find Client'));
                  cb(null, client);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            } else {
              cb(new Error('Could not find Payee'));
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else if (report.clientId) {
        Client.findById(report.clientId)
          .then((client) => {
            if (!client) return cb(new Error('Could not find Client'));
            cb(null, client);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        cb(new Error('A Client or Payee is required'));
      }
    },
    function (client, cb) {
      // Prepare data
      const options = {
        client,
        payeeId: report.payeeId,
        table: report.table,
      };
      Filter.filterToDbFilter(report.filters, options, (err, filter) => {
        cb(err, filter, client);
      });
    },
    function (filter, client, cb) {
      logger.debug(`filter: ${JSON.stringify(filter, null, 2)}`);
      const databaseUrl = databaseUtils.getMongoUrl('auth');
      // Setup Mongo connection
      MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts())
        .then(async (mongoClient) => {
          // Select mongo db
          const db = mongoClient.db(databaseUtils.getMongoDBName());
          // Setup big query
          const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
          // Create report
          const object = {
            db,
            bigQuery,
            filter,
            databaseUrl,
            databaseTable: report.table,
            template: report.fields,
            s3AccessKey: process.env.S3_access_key,
            s3SecretKey: process.env.S3_secret_key,
            s3Region: process.env.S3_region,
            s3Bucket: process.env.S3_bucket,
            client,
            format: report.format,
          };
          // Set database table based on report table and client
          object.databaseTable = await getDatabaseTable({ report, client });

          // Clear any orphaned sales lines from Input Table - this ensures that any orphaned data from deleted sales files is kept out of the output
          if (report.table !== 'Sales Input' && report.table !== 'Income Data') { return cb(null, object); }

          SalesFile.distinct('_id', { clientId: client._id })
            .then((salesFiles) => {
              if (!salesFiles?.length) { return cb(); }

              const salesFileIds = salesFiles.map((id) => id.toString());
              bigQuery.deleteData(bigQuery.inputTable, { salesFileId: { $nin: salesFileIds } }, (bigQueryErr, res) => {
                if (bigQueryErr) { return cb(bigQueryErr); }

                logger.info(`${report._id.toString()} | Clearing Down Orphaned Sales Lines`);
                logger.info(res);
                cb(null, object);
              });
            })
            .catch(cb);
        })
        .catch();
    },
    function (object, cb) {
      // Create Array
      getReportOutput(object, report.filters, labelSubset, cb);
    },
  ], (err, output) => {
    if (err) { logger.error(err); }
    // Close DB Connection
    if (mongoConnection) { mongoConnection.close(); }
    callback(err, output);
  });
}

function getReportOutput(event, filters, labelSubset, callback) {
  event.originalTemplate = JSON.parse(JSON.stringify(event.template));
  // Get unique template field string - removing any duplicates
  const templateString = event.template.map((item) => { if (item) { return item.field; } }).filter((value, index, self) => self.indexOf(value) === index);
  // Remove any duplicates
  const templateOutput = [];
  event.template.forEach((item) => {
    templateOutput[templateString.indexOf(item.field)] = item;
  });
  event.template = templateOutput;

  let includesRelease; let includesTrack; let includesWork; let includesContract; let includesPayee; let includesPeriod;

  async.waterfall([
    function (waterfallCb) {
      // Strip any template items that don't match schema
      // Only on SQL tables, not mongo
      if (event.databaseTable !== 'costs') {
        event.bigQuery.getSchema(event.databaseTable, (err, schema) => {
          if (schema) {
            // Get schema field names
            schema = schema.fields.map((item) => item.name);
            // Only use fields from within the schema - strip out values that don't exist
            event.template = event.template.map((templateItem) => {
              if (schema.indexOf(templateItem.field) !== -1) {
                return templateItem;
              }
            }).filter(Boolean);
            waterfallCb();
          } else {
            waterfallCb();
          }
        });
      } else {
        waterfallCb();
      }
    },
    function (waterfallCb) {
      // Set up template - adding releaseId, trackId or workId if catalogue items selected

      // Copy template to maintain original
      const template = event.template.slice();

      // Loop through template checking fields
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
      // Add selectors to template if they are true, but only if the selector is not already included in the template
      if (includesRelease && !templateString.includes('releaseId')) { template.push({ field: 'releaseId', type: 'Selector' }); }
      if (includesTrack && !templateString.includes('trackId')) { template.push({ field: 'trackId', type: 'Selector' }); }
      if (includesPeriod && !templateString.includes('periodId')) { template.push({ field: 'periodId', type: 'Selector' }); }
      if (includesWork && !templateString.includes('workId')) { template.push({ field: 'workId', type: 'Selector' }); }
      if ((includesContract || includesPayee) && !templateString.includes('contractId')) { template.push({ field: 'contractId', type: 'Selector' }); }

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
            } else if (template[i].field === 'contractId') {
              selectors[template[i].field] = '$contractIds';
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
      if (event.filter) {
        // Get Data
        if (event.databaseTable === 'costs') {
          // ----------------------
          // Use Mongo DB for costs
          // ----------------------
          const group = getGroup(template);
          const aggregate = [
            { $match: event.filter },
            { $group: group },
            { $limit: 500 },
          ];
          const collection = event.db.collection('costs');
          collection.aggregate(aggregate, { allowDiskUse: true })
            .toArray()
            .then((findResult) => {
              // Map to the passed template
              const mappedData = findResult.map((line) => {
                // Flatten line
                line = flattenLine(line);
                // Set catalogue IDs
                if (line.releaseIds) { line.releaseId = line.releaseIds[0]; }
                if (line.trackIds) { line.trackId = line.trackIds[0]; }
                // NOTE: Map line to template is now called after all data has been collected
                return line;
              });
              waterfallCb(null, mappedData);
            })
            .catch(waterfallCb);
        } else {
          // ------------------------------
          // Use Big Query for other tables
          // ------------------------------
          const columns = getSelectAndSumColumnArray(template, event.filter);
          removeColumnsBeingMappedToCatalogue(columns);
          const limit = 500;
          const options = { offset: 0, limit };
          if (columns.sumCols.length > 0) {
            options.orderBy = columns.sumCols[columns.sumCols.length - 1].column;
            options.orderDir = 'DESC';
            options.format = event.format;
          }
          let query;
          try {
            query = event.bigQuery.getAggregateQuery(event.databaseTable, columns.selectCols, columns.sumCols, 'lines', event.filter, options);
            let queryObj = {
              query,
              params: {},
            };
            queryObj = splitOutArrayParams(queryObj, 'releaseId');
            queryObj = splitOutArrayParams(queryObj, 'trackId');
            queryObj = splitOutArrayParams(queryObj, 'workId');
            queryObj = splitOutArrayParams(queryObj, 'salesFileId');
            query = queryObj;
            logger.debug(query);
          } catch (err) {
            logger.error(err);
            waterfallCb(err);
          }
          runReportExport(event.bigQuery, query, event.template, labelSubset, waterfallCb);
        }
      } else {
        waterfallCb(null, []);
      }
    },
    function (results, waterfallCb) {
      // Get relevant catalogue mapping data
      // Loop through items and get IDs
      const releaseIds = []; const trackIds = []; const workIds = []; const contractIds = []; const periodIds = [];
      results.forEach((row) => {
        if (row.releaseId && row.releaseId !== 'null' && !releaseIds.includes(row.releaseId) && ObjectId.isValid(row.releaseId.toString())) {
          releaseIds.push(new ObjectId(row.releaseId.toString()));
        }
        if (row.trackId && row.trackId !== 'null' && !trackIds.includes(row.trackId) && ObjectId.isValid(row.trackId.toString())) {
          trackIds.push(new ObjectId(row.trackId.toString()));
        }
        if (row.workId && row.workId !== 'null' && !workIds.includes(row.workId) && ObjectId.isValid(row.workId.toString())) {
          workIds.push(new ObjectId(row.workId.toString()));
        }
        if (row.contractId && row.contractId !== 'null' && !contractIds.includes(row.contractId) && ObjectId.isValid(row.contractId.toString())) {
          contractIds.push(new ObjectId(row.contractId.toString()));
        }
        if (row.periodId && row.periodId !== 'null' && !periodIds.includes(row.periodId) && ObjectId.isValid(row.periodId.toString())) {
          periodIds.push(new ObjectId(row.periodId.toString()));
        }
      });
      async.parallel({
        releases(parallelCb) {
          if (includesRelease) {
            const releases = {};
            Release.find({ _id: { $in: releaseIds } }, 'barcode catNo foreignId projectId title version artist label releaseDate dealerPrice format catalogueGroups')
              .then((foundReleases) => {
                if (foundReleases?.length) {
                  foundReleases.forEach((release) => {
                    releases[release._id.toString()] = {
                      catalogueBarcode: release.barcode,
                      catalogueCatNo: release.catNo,
                      catalogueReleaseForeignId: release.foreignId,
                      catalogueReleaseProjectId: release.projectId,
                      catalogueReleaseTitle: release.title,
                      catalogueReleaseVersion: release.version,
                      catalogueReleaseArtist: release.artist,
                      catalogueReleaseLabel: release.label,
                      catalogueReleaseDate: release.releaseDate ? moment(release.releaseDate).format(event.client.dateFormat.toUpperCase()) : '',
                      ppd: release.dealerPrice,
                      catalogueFormat: release.format,
                      releaseCatalogueGroups: release.catalogueGroups?.join(';'),
                    };
                  });
                }
                parallelCb(null, releases);
              })
              .catch((err) => {
                logger.error(err);
                parallelCb(err);
              });
          } else {
            parallelCb();
          }
        },
        tracks(parallelCb) {
          if (includesTrack) {
            const tracks = {};
            Track.find({ _id: { $in: trackIds } }, 'isrc foreignId projectId title version artist label catalogueGroups')
              .then((foundTracks) => {
                if (foundTracks?.length) {
                  foundTracks.forEach((track) => {
                    tracks[track._id.toString()] = {
                      catalogueIsrc: track.isrc,
                      catalogueTrackForeignId: track.foreignId,
                      catalogueTrackProjectId: track.projectId,
                      catalogueTrackTitle: track.title,
                      catalogueTrackVersion: track.version,
                      catalogueTrackArtist: track.artist,
                      catalogueTrackLabel: track.label,
                      trackCatalogueGroups: track.catalogueGroups?.join(';'),
                    };
                  });
                }
                parallelCb(null, tracks);
              })
              .catch((err) => {
                logger.error(err);
                parallelCb(err);
              });
          } else {
            parallelCb();
          }
        },
        works(parallelCb) {
          if (includesWork) {
            const works = {};
            Work.find({ _id: { $in: workIds } }, 'title composer identifier foreignId projectId iswc tunecode trackIds catalogueGroups').then((foundWorks) => {
              if (foundWorks?.length) {
                foundWorks.forEach((work) => {
                  works[work._id.toString()] = {
                    catalogueWorkTitle: work.title,
                    catalogueWorkComposer: work.composer,
                    catalogueIdentifier: work.identifier,
                    catalogueWorkForeignId: work.foreignId,
                    catalogueWorkProjectId: work.projectId,
                    catalogueIswc: work.iswc,
                    catalogueTunecode: work.tunecode,
                    catalogueTrackIds: work.trackIds,
                    workCatalogueGroups: work.catalogueGroups?.join(';'),
                  };
                });
              }
              parallelCb(null, works);
            })
              .catch((err) => {
                logger.error(err);
                parallelCb(err);
              });
          } else {
            parallelCb();
          }
        },
        contracts(parallelCb) {
          if (includesContract || includesPayee) {
            const contracts = {};
            let selectProperties = 'name foreignId projectId contractType contractCategories currency type profitSharePercentage';
            if (includesPayee) {
              selectProperties += ' payees';
            }
            Contract.find({ _id: { $in: contractIds } }, selectProperties)
              .then((foundContracts) => {
                if (foundContracts?.length) {
                  foundContracts.forEach((contract) => {
                    contracts[contract._id.toString()] = {
                      contractName: contract.name,
                      contractType: contract.contractType,
                      contractForeignId: contract.foreignId,
                      contractProjectId: contract.projectId,
                      contractCategories: contract.contractCategories.join(', '),
                      contractCurrency: contract.currency === 'Home Currency' ? event.client.homeCurrency : contract.currency,
                      contractDealType: contract?.type === 'Profit Share' ? 'Profit Share - Classic' : contract.type,
                      contractProfitSharePercentage: contract.profitSharePercentage,
                    };
                    if (includesPayee) {
                      contracts[contract._id.toString()].payees = contract.payees;
                    }
                  });
                }
                parallelCb(null, contracts);
              })
              .catch((err) => {
                logger.error(err);
                parallelCb(err);
              });
          } else {
            parallelCb();
          }
        },
        payees(parallelCb) {
          if (includesPayee) {
            const payeeIds = [];
            Contract.find({ _id: { $in: contractIds } }, 'payees')
              .then((foundContracts) => {
                if (foundContracts?.length) {
                  foundContracts.forEach((contract) => {
                    // ensure we don't add duplicate ids
                    const contractPayeeIds = contract.payees?.map((payee) => payee.payeeId);
                    payeeIds.push(...contractPayeeIds);
                  });
                }

                // Remove duplicates for query
                const query = { _id: { $in: [...new Set(payeeIds)] } };

                const payees = {};
                Payee.find(query, 'name foreignId projectId payeeCategories')
                  .then((foundPayees) => {
                    if (foundPayees?.length) {
                      foundPayees.forEach((payee) => {
                        payees[payee._id.toString()] = {
                          payeeName: payee.name,
                          payeeForeignId: payee.foreignId,
                          payeeProjectId: payee.projectId,
                          payeeCategories: payee.payeeCategories.join(', '),
                        };
                      });
                    }
                    parallelCb(null, payees);
                  })
                  .catch((err) => {
                    logger.error(err);
                    parallelCb(err);
                  });
              })
              .catch((err) => {
                logger.error(err);
                parallelCb(err);
              });
          } else {
            parallelCb();
          }
        },
        periods(parallelCb) {
          if (includesPeriod) {
            const periods = {};
            Period.find({ _id: { $in: periodIds } }, 'name year accountingPeriod accountingPeriodType startDate endDate accountingDate')
              .then((foundPeriods) => {
                if (foundPeriods?.length) {
                  foundPeriods.forEach((period) => {
                    periods[period._id.toString()] = {
                      periodName: period.name,
                      periodYear: period.year,
                      periodAccountingPeriod: period.accountingPeriod,
                      periodAccountingPeriodType: period.accountingPeriodType,
                    };
                    if (period.startDate) {
                      // @tom: can we assign '' if not present instead? Or should property not exist in that case?
                      periods[period._id.toString()].periodStartDate = moment(period.startDate).format(event.client.dateFormat.toUpperCase());
                    }
                    if (period.endDate) {
                      periods[period._id.toString()].periodEndDate = moment(period.endDate).format(event.client.dateFormat.toUpperCase());
                    }
                    if (period.accountingDate) {
                      periods[period._id.toString()].periodAccountingDate = moment(period.accountingDate).format(event.client.dateFormat.toUpperCase());
                    }
                  });
                }
                parallelCb(null, periods);
              })
              .catch((err) => {
                logger.error(err);
                parallelCb(err);
              });
          } else {
            parallelCb();
          }
        },
      }, (err, catalogueData) => {
        waterfallCb(null, results, catalogueData);
      });
    },
    function (results, catalogueData, waterfallCb) {
      if (templateString.includes('workIsrcs')) {
        getWorkIsrcs(catalogueData, (err, catalogueDataOut) => {
          waterfallCb(err, results, catalogueDataOut);
        });
      } else {
        waterfallCb(null, results, catalogueData);
      }
    },
  ], async (err, results, catalogueData) => {
    if (err) {
      callback(err);
    } else {
      const output = [];

      // If targetPeriod or foreignId are used, we need to query them from the DB (never set in BigQuery)
      let salesFilesById;
      const hasTargetPeriodField = event.originalTemplate.some((item) => item.field === 'targetPeriod');
      const hasForeignIdField = event.originalTemplate.some((item) => item.field === 'foreignId');
      if (hasTargetPeriodField || hasForeignIdField) {
        const salesFiles = await SalesFile.find({ clientId: event.client._id.toString() }, { targetPeriod: 1, foreignId: 1 }).lean()
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
        salesFilesById = _.keyBy(salesFiles, (sf) => sf._id.toString());
      }

      results.forEach((line) => {
        // If report includes target period or foreign id, append that data from the corresponding Sales File (from the db)
        if (line.salesFileId && (hasTargetPeriodField || hasForeignIdField)) {
          const salesFile = salesFilesById[line.salesFileId];
          if (salesFile && hasTargetPeriodField) line.targetPeriod = salesFile.targetPeriod;
          if (salesFile && hasForeignIdField) line.foreignId = salesFile.foreignId;
        }
        // Map line to template
        const mappedLine = lineToTemplate(line, event.originalTemplate, catalogueData, event.client, event.format);
        output.push(mappedLine);
      });
      // build output object
      const outputObject = {
        report: {},
        meta: {
          total: output.length,
        },
      };
      event.originalTemplate.forEach((field, idx) => {
        outputObject.report[field.field] = output.map((row) => row[idx]);
      });
      const hasForeignId = filters.some((filter) => 'foreignId' in filter);
      if (hasForeignId && outputObject.report.foreignId) {
        outputObject.report.foreignId = outputObject.report.foreignId.map(() => filters.find((filter) => filter.foreignId)?.foreignId);
      }
      const hasTargetPeriod = filters.some((filter) => 'targetPeriod' in filter);
      if (hasTargetPeriod && outputObject.report.targetPeriod) {
        outputObject.report.targetPeriod = outputObject.report.targetPeriod.map(() => filters.find((filter) => filter.targetPeriod)?.targetPeriod);
      }
      callback(err, outputObject);
    }
  });
}

function lineToTemplate(line, template, mappingData, client, format) {
  // Map DB row to array in template
  const result = [];
  // Loop through template
  for (let i = 0; i < template.length; i += 1) {
    if (typeof line[template[i].field] === 'number' && format === 'EU Decimal Comma') { line[template[i].field] = utils.convertToEUFormat(line[template[i].field]); }

    if (line[template[i].field] && line[template[i].field].value) {
      // Map Big Query Specific Dates
      result[i] = moment(line[template[i].field].value).format(client.dateFormat.toUpperCase());
    } else if (line[template[i].field] instanceof Date) {
      // Map Mongo Specific Dates
      result[i] = moment(line[template[i].field]).format(client.dateFormat.toUpperCase());
    } else if (fieldsToMapToCatalogue.release.includes(template[i].field)) {
      // Map Release Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.releases[line.releaseId], template[i].field, line[template[i].field]);
    } else if (fieldsToMapToCatalogue.track.includes(template[i].field)) {
      // Map Track Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.tracks[line.trackId], template[i].field, line[template[i].field]);
    } else if (fieldsToMapToCatalogue.work.includes(template[i].field)) {
      // Map Work Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.works[line.workId], template[i].field, line[template[i].field]);
    } else if (fieldsToMapToCatalogue.contract.includes(template[i].field)) {
      // Map Contract Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.contracts[line.contractId], template[i].field, line[template[i].field]);
    } else if (fieldsToMapToCatalogue.payee.includes(template[i].field)) {
      const payeeIds = mappingData.contracts?.[line?.contractId]?.payees?.map((payee) => payee?.payeeId);
      // template[i].field defines the field to map to the payee
      const payeeValues = payeeIds?.map((payeeId) => mappingData.payees?.[payeeId]?.[template[i].field]);
      // Map Payee Specific Values
      result[i] = payeeValues?.length ? payeeValues.join('; ') : null;
    } else if (fieldsToMapToCatalogue.period.includes(template[i].field)) {
      // Map Period Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.periods[line.periodId], template[i].field, line[template[i].field]);
    } else if (line[template[i].field] !== 'null') {
      // Strip out any null values
      result[i] = line[template[i].field];
    } else {
      result[i] = null;
    }
  }
  return result;
}

function mapValueToCatalogueValue(item, field, originalValue) {
  if (item && item[field]) {
    return item[field];
  }
  return originalValue;
}

async function runReportExport(bigQuery, query, template, labelSubset, callback) {
  // Remove massive query params for report previews
  // They are not needed as the query is always limited to 500 rows
  // If using the temp table join method instead it takes too long, so this is a workaround
  for (const param in query.params) {
    if (Array.isArray(query.params[param]) && query.params[param].length > 100_000) {
      query.params[param] = query.params[param].slice(0, 50);
    }
  }
  Reports.runReportQuery(bigQuery, query, template, labelSubset, callback);
}

function runReportQuery(bigQuery, query, template, labelSubset, runQueryCb) {
  const labels = {
    ...labelSubset,
    sub_process: 'run_report',
  };

  const results = [];
  bigQuery.client.createQueryStream({ labels, ...query })
    .on('error', (err) => {
      // Handle Errors
      logger.error(err);
      if (err && (err.code === 409 || err.message.includes('Exceeded rate limits'))) {
        logger.info('RETRYING EXCEEDED RATE');
        // Wait two seconds
        setTimeout(() => {
          // Retry
          runReportQuery(bigQuery, query, template, labelSubset, runQueryCb);
        }, 2000);
      } else {
        runQueryCb(err);
      }
    })
    .on('data', (row) => {
      // NOTE: Map line to template is now called after all data has been collected
      // Add row to results
      results.push(row);
      if (results.length % 100000 === 0) logger.debug(results.length);
    })
    .on('end', () => {
      logger.info(`Returning ${results.length} lines`);
      runQueryCb(null, results);
    });
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

function getWorkIsrcs(catalogueData, callback) {
  if (catalogueData.works && Object.values(catalogueData.works).length > 0) {
    // compile all trackIds attached to works
    let trackIds = [];
    Object.values(catalogueData.works).forEach((work) => {
      if (work.catalogueTrackIds && work.catalogueTrackIds.length > 0) {
        trackIds = _.union(trackIds, work.catalogueTrackIds);
      }
    });
    // get ISRC codes from catalogue db
    Track.find({ _id: { $in: trackIds } }, 'isrc')
      .then((foundTracks) => {
        if (foundTracks?.length) {
          // get ISRC codes and map to object
          const trackIsrcs = {};
          foundTracks.forEach((track) => {
            trackIsrcs[track._id.toString()] = track.isrc;
          });
          // and add track ISRC codes to respective works
          Object.values(catalogueData.works).forEach((work) => {
            work.workIsrcs = work.catalogueTrackIds ? work.catalogueTrackIds.map((trackId) => trackIsrcs[trackId]).join(', ') : '';
          });
        }
        callback(null, catalogueData);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } else {
    callback(null, catalogueData);
  }
}

function removeColumnsBeingMappedToCatalogue(columns) {
  if (Array.isArray(columns.selectCols)) {
    const fieldsToMapToCatalogueFlattened = Object.values(fieldsToMapToCatalogue).reduce((previousValue, currentValue) => [...previousValue, ...currentValue]);
    columns.selectCols = columns.selectCols.filter((col) => !fieldsToMapToCatalogueFlattened.includes(col.column));
  }
}

async function createReportExportTask({ reportId, curveUser }) {
  const report = await Report.findById(reportId);
  if (!report) {
    const error = new Error(`Could not find Report with ID ${reportId}`);
    error.code = 404;
    throw error;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: report })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const taskCount = await Task.countDocuments({
    name: 'Report Creation',
    clientId: report.clientId,
    status: { $in: ['Pending', 'In Progress'] },
    'value.reportId': report._id.toString(),
  });
  if (taskCount > 0) {
    const error = new Error('This task is already running - please wait until it has completed before running again');
    error.code = 500;
    throw error;
  }

  const [user, client] = await Promise.all([
    User.findById(curveUser.id),
    Client.findById(report.clientId),
  ]);
  if (!user) {
    const error = new Error('User not found');
    error.code = 404;
    throw error;
  }
  if (!client) {
    const error = new Error('Client not found');
    error.code = 404;
    throw error;
  }

  // This is here in the API so we can give instant feedback to the user, rather than waiting for a Processor task to start
  // If it was in the Processor it would also be via email which isn't as nice as an app alert message
  const count = await getReportLineCount({ report, client });
  if (count > 500_000_000) {
    const error = new Error('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
    error.code = 413;
    throw error;
  }

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Report Creation',
    clientId: report.clientId,
    clientName: client.name,
    email: user.email,
    value: {
      reportId: report._id.toString(),
    },
  });
}

/**
 * @param {Object} params
 * @param {report} params.report - Report model instance
 * @param {client} params.client - Client model instance
 * @description Converts & returns Report filters to db filters
 */
async function getFilter({ report, client }) {
  const options = {
    client,
    payeeId: report.payeeId,
    table: report.table,
  };
  const filter = await new Promise((resolve, reject) => {
    Filter.filterToDbFilter(report.filters, options, (err, filter) => {
      if (err) reject(err);
      else resolve(filter);
    });
  });
  return filter;
}

/**
 * @param {Object} params
 * @param {report} params.report - Report model instance with populated table field
 * @param {client} params.client - Client model instance with populated BigQuery fields
 * @description Maps a Report dataset (from the UI) to the data source table
 */
function getDatabaseTable({ report, client }) {
  if (report.table === 'Sales Input' || report.table === 'Income Data') {
    return client.bigQuerySalesTable;
  } if (report.table === 'Sales Output' || report.table === 'Sales' || report.table === 'Royalties') {
    return client.bigQueryPeriodSales;
  } if (report.table === 'Costs Input') {
    return 'costs';
  } if (report.table === 'Costs Output' || report.table === 'Costs') {
    return client.bigQueryPeriodCosts;
  }
  return report.table;
}

/**
 * @param {Object} params
 * @param {report} params.report - Report model instance with populated fields
 * @param {client} params.client - Client model instance with populated fields
 * @description Calculates the row count for a report filter & table
 */
async function getReportLineCount({ report, client }) {
  const filter = await Reports.getFilter({ report, client });
  // Reports with a null filter should still be generated, as this is handled in the process
  // The user will receive an empty report (template with no data rows)
  if (!filter || filter === null) return 0;
  const table = getDatabaseTable({ report, client });
  let count = 0;
  if (table === 'costs') {
    count = await Cost.countDocuments({ ...filter, clientId: client._id.toString() });
  } else {
    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
    [{ count }] = await new Promise((resolve, reject) => {
      bigQuery.getCount(table, 'count', filter, (err, count) => (err ? reject(err) : resolve(count)));
    });
  }
  return count;
}

const Reports = {
  createReportPreview,
  getReportOutput,
  lineToTemplate,
  mapValueToCatalogueValue,
  runReportQuery,
  runReportExport,
  createReportExportTask,
  getFilter,
};

module.exports = Reports;
