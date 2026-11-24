const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: true });
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const async = require('async');
const { applyDateFilters } = require('../../libs/dateFilters');
const { CSVRawExport } = require('../../libs/mongodb-export');
const historyModelUser = require('../../libs/historyModelUser');
const mergeObjectNames = require('../../libs/qaReport');
const { salesGroupHelpers } = require('../../libs/helpers/salesGroupHelpers');

const User = require('../../models/user');
const Period = require('../../models/period');
const SalesFile = require('../../models/salesFile');
const Statement = require('../../models/statement');
const Contract = require('../../models/contract');
const Cost = require('../../models/cost');
const Payee = require('../../models/payee');
const SalesGroup = require('../../models/salesGroup');

const PeriodController = require('../../controllers/period');
const StatementController = require('../../controllers/statement');

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        select: '_id clientId name contractType createdAt setupStage year accountingPeriod accountingPeriodType startDate endDate accountingDate grossAmount netAmount grossCosts netCosts status calculationStatus locked runNo updatedAt',
      };
      Period.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ periods: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else if (curveUser.payeeId) {
      const filter = { status: 'Published' };
      const payee = await Payee.findById(curveUser.payeeId, 'clientId');
      if (payee && payee.clientId) { filter.clientId = payee.clientId; }

      const contracts = await Contract.find({ clientId: payee.clientId, 'payees.payeeId': curveUser.payeeId }, '_id');
      const contractIds = contracts.map((contract) => contract._id);
      if (contractIds.length > 0) filter.contractId = { $in: contractIds };

      Statement.find(filter, { periodId: 1 })
        .then((statements) => {
          const periodIds = _.uniq(statements.map((statement) => statement.periodId));
          const periodFilter = { _id: { $in: periodIds.map((id) => new ObjectId(id)) } };

          Period.find(periodFilter, { name: 1 })
            .then((periods) => {
              res.status(200).json({ periods });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id)
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          period.patches.find({ ref: period._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Period
      .findById(params.id)
      .select('_id clientId name contractType setupStage year accountingPeriod accountingPeriodType startDate endDate accountingDate exchangeRates status calculationStatus calculationError calculationNotes processStartTime processEndTime units grossAmount netAmount grossCosts netCosts lines valid invalidLines completedCatalogueItems allCalculatedSalesCsv allCalculatedSalesCsvPublicLink allCalculatedCostsCsv allCalculatedCostsCsvPublicLink unreportedSalesCsv unreportedSalesCsvPublicLink unreportedCostsCsv unreportedCostsCsvPublicLink suspenseCsv suspenseCsvPublicLink generalLedgerSummary generalLedgerSummaryPublicLink customStatement customStatementPublicLink statementsZip statementsZipPublicLink usedReleaseIds usedTrackIds usedWorkIds totalContractsForCalculation locked runNo currencyExchangeRates createdAt salesExportZipsPublicLinks statementSalesExportZipsPublicLinks updatedAt')
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Temporary Calculation error message
          if (period.calculationError) {
            period.calculationError = true;
          }
          res.status(200).json(period);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/qa_report', (req, res) => {
    const { curveUser, params } = req;

    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
    }
    if (curveUser.clientId && curveUser.internal) {
      Period.findById(params.id)
        .select('clientId calculationLog')
        .then((qaReport) => {
          if (!qaReport) {
            res.status(404).json({ message: `Could not find qaReport with ID ${params.id}` });
          } else {
            const { calculationLog } = qaReport;
            const contractIds = [];
            const salesFileIds = [];
            const costIds = [];

            calculationLog.forEach((log) => {
              if (log.contractIds) {
                contractIds.push(...log.contractIds);
              }
              if (log.salesFiles) {
                if (log.salesFiles.contractIds) {
                  contractIds.push(...log.salesFiles.contractIds);
                }
                if (log.salesFiles.salesFileIds) {
                  salesFileIds.push(...log.salesFiles.salesFileIds);
                }
              }
              if (log.costIds) {
                costIds.push(...log.costIds);
              }
            });

            async.parallel({
              contracts(callback) {
                Contract.find({ _id: { $in: contractIds.filter(onlyUnique) } }, 'name')
                  .then((contracts) => {
                    callback(null, contracts);
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              },
              costs(callback) {
                Cost.find({ _id: { $in: costIds.filter(onlyUnique) } }, 'name')
                  .then((costs) => {
                    callback(null, costs);
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              },
              sales(callback) {
                SalesFile.find({ _id: { $in: salesFileIds.filter(onlyUnique) } }, 'name')
                  .then((salesFiles) => {
                    callback(null, salesFiles);
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              },
            }, (err, results) => {
              if (err) {
                logger.error(err);
                return res.status(500).json({ message: 'Internal error, please try again' });
              }

              const { contracts, sales, costs } = results;

              calculationLog.forEach((log) => {
                if (log.contractIds) {
                  log.contracts = mergeObjectNames(log.contractIds, contracts);
                  delete log.contractIds;
                }
                if (log.salesFiles) {
                  if (log.salesFiles.contractIds) {
                    log.salesFiles.contracts = mergeObjectNames(log.salesFiles.contractIds, contracts);
                    delete log.salesFiles.contractIds;
                  }
                  if (log.salesFiles.salesFileIds) {
                    log.salesFiles.sales = mergeObjectNames(log.salesFiles.salesFileIds, sales);
                    delete log.salesFiles.salesFileIds;
                  }
                }
                if (log.costIds) {
                  log.costs = mergeObjectNames(log.costIds, costs);
                  delete log.costIds;
                }
                delete log.currencyExchangeRates;
              });
              qaReport.calculationLog = calculationLog;
              res.status(200).json(qaReport);
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error retrieve period, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/batch_tasks', async (req, res) => {
    const { curveUser, params, query } = req;
    if (!params.id) { return res.status(404).json({ message: 'No PeriodId Found' }); }
    if (!query) { return res.status(201).json({ message: 'Missing query parameter' }); }

    const user = await User.findById(curveUser.id).catch(logger.error);
    if (!user || !user?.superInternal) { return res.status(403).json({ message: 'Forbidden' }); }

    PeriodController.getBatchTasks({ periodId: params.id, query }).then((batchTasks) => {
      res.status(200).json(batchTasks);
    }).catch((err) => {
      logger.error(err);
      return res.status(500).json({ message: 'Internal error, please try again' });
    });
  })

  .get('/:id/detail', (req, res) => {
    const { curveUser, params } = req;
    // Loads only analytics against the period
    Period.findById(params.id, '_id clientId analysis')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          res.status(200).json({ analytics: period.analysis });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/sales_files', (req, res) => {
    // Loads only sales files associated with the period
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id clientId salesFilesIds')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // eslint-disable-next-line max-len
          const selectFields = '_id clientId name invoiceNo targetPeriod salesAccountName salesTemplateName salesTemplateId status file publicLink units validationUnits netAmount grossAmount validationNetAmount homeCurrencyNetAmount homeCurrencyGrossAmount viewed lines validationLines valid invalidLines reportedStatus reportedLines';
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: selectFields,
          };
          SalesFile.paginate({ clientId: period.clientId, _id: { $in: period.salesFilesIds } }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ salesFiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/unincluded_sales_files', (req, res) => {
    // Loads only sales files that aren't associated with period - this is required here due to not wanting all costs on the period page to make work by not including param on costs
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id clientId salesFilesIds')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // eslint-disable-next-line max-len
          const selectFields = '_id clientId name invoiceNo targetPeriod salesAccountName salesTemplateName salesTemplateId status file publicLink units validationUnits netAmount validationNetAmount homeCurrencyNetAmount lines validationLines valid invalidLines reportedStatus reportedLines';
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: selectFields,
          };
          query.notInclude = period.salesFilesIds;
          const filter = SalesFile.paramsToFilterField(query, curveUser);
          SalesFile.paginate(filter, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ salesFiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/costs', (req, res) => {
    // Loads only costs associated with the period
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id clientId costIds')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            populate: ['releaseIds', 'trackIds', 'contractIds'],
          };
          Cost.paginate({ clientId: period.clientId, _id: { $in: period.costIds } }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ costs: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/unincluded_costs', (req, res) => {
    // Loads only costs that aren't associated with period - this is required here due to not wanting all costs on the period page to make work by not including param on costs
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id clientId costIds')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            populate: ['releaseIds', 'trackIds', 'contractIds'],
          };
          query.notInclude = period.costIds;
          const filter = Cost.paramsToFilterField(query, curveUser);
          Cost.paginate(filter, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ costs: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/statements_export', (req, res) => {
    // Do not load salesFileIds, costIds or analytics - all are loaded separately
    const { curveUser, params } = req;
    Period.findById(params.id, '_id clientId name setupStage year accountingPeriod accountingPeriodType startDate endDate accountingDate status calculationStatus calculationError processStartTime processEndTime units grossAmount netAmount grossCosts netCosts lines valid invalidLines completedCatalogueItems allCalculatedSalesCsv allCalculatedSalesCsvPublicLink allCalculatedCostsCsv allCalculatedCostsCsvPublicLink unreportedSalesCsv unreportedSalesCsvPublicLink unreportedCostsCsv unreportedCostsCsvPublicLink statementsZip statementsZipPublicLink')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          period.sendStatementExport(curveUser);
          res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/export_sales', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id salesFilesIds clientId')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          SalesFile.sendExport({ _id: { $in: period.salesFilesIds } }, curveUser);
          res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/export_costs', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id costIds clientId')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          Cost.sendExport({ _id: { $in: period.costIds } }, curveUser);
          res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id', async (req, res) => {
    try {
      const { curveUser, params, body } = req;
      const foundPeriod = await Period.findById(params.id, { processStartTime: 0, processEndTime: 0, runNo: 0, calculationLog: 0 }).exec();

      if (!foundPeriod) {
        return res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
      }

      const isForbidden = await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true });
      if (isForbidden) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      delete body.clientId;
      foundPeriod.startDate = body.startDate;
      foundPeriod.endDate = body.endDate;
      foundPeriod.accountingDate = body.accountingDate;
      body.startDate = new Date(Date.UTC(foundPeriod.startDate.getFullYear(), foundPeriod.startDate.getMonth(), foundPeriod.startDate.getDate(), 0, 0, 0));
      body.endDate = new Date(Date.UTC(foundPeriod.endDate.getFullYear(), foundPeriod.endDate.getMonth(), foundPeriod.endDate.getDate(), 0, 0, 0));
      body.accountingDate = new Date(Date.UTC(foundPeriod.accountingDate.getFullYear(), foundPeriod.accountingDate.getMonth(), foundPeriod.accountingDate.getDate(), 0, 0, 0));
      body.lastModifiedBy = curveUser.id;

      // Must not change these values - This was messing with recalculation filter
      delete body.processStartTime;
      delete body.processEndTime;
      delete body.runNo;
      delete body.calculationLog;

      // These should never be overwritten by a UI save (Wouldn't happen by normal process however in testing it caused a manual display override to be saved)
      delete body.grossCosts;
      delete body.netCosts;
      delete body.grossAmount;
      delete body.netAmount;
      delete body.lines;
      delete body.units;

      const updatedPeriod = await Period.findByIdAndUpdate(params.id, body, { new: true }).exec();

      if (Object.keys(body).includes('locked') && body.locked !== foundPeriod.locked) {
        const statementIds = await Statement.find({ periodId: params.id }, { _id: 1 }).lean().exec();
        const salesFileIds = await SalesFile.find({ _id: { $in: updatedPeriod.salesFilesIds } }, { _id: 1 }).lean().exec();

        // Function to batch update using eachSeries
        const batchUpdate = async (model, ids, batchSize, updateQuery) => {
          const batches = [];
          for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize).map((id) => id._id);
            batches.push(batch);
          }
          await async.eachSeries(batches, async (batch) => {
            await model.updateMany({ _id: { $in: batch } }, updateQuery, { timestamps: false }).exec();
          });
        };

        await batchUpdate(Statement, statementIds, 100, { $set: { locked: body.locked } });
        await batchUpdate(SalesFile, salesFileIds, 100, { $set: { locked: body.locked } });

        res.status(200).json(updatedPeriod);
      } else {
        res.status(200).json(updatedPeriod);
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: err.message });
    }
  })

  .get('/:id/include_all_sales_files', (req, res) => {
    const { curveUser, params, body } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          SalesFile.find({ clientId: foundPeriod.clientId })
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              Period.findByIdAndUpdate(params.id, { $set: { salesFilesIds: ids } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/include_filtered_sales_files', (req, res) => {
    const { curveUser, params, body, query } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          const filter = SalesFile.paramsToFilterField(query, curveUser);
          SalesFile.find(filter)
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              Period.findByIdAndUpdate(params.id, { $push: { salesFilesIds: { $each: ids } } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/include_selected_sales_files', (req, res) => {
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const salesFileIds = query.salesFileIds.map((id) => new ObjectId(id));
          SalesFile.find({ _id: { $in: salesFileIds }, clientId: foundPeriod.clientId })
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              Period.findByIdAndUpdate(params.id, { $push: { salesFilesIds: { $each: ids } } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/remove_selected_sales_files', (req, res) => {
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const salesFileIds = query.salesFileIds.map((id) => new ObjectId(id));
          SalesFile.find({ _id: { $in: salesFileIds }, clientId: foundPeriod.clientId })
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              Period.findByIdAndUpdate(params.id, { $pullAll: { salesFilesIds: ids } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/include_all_costs', (req, res) => {
    const { curveUser, params, body } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          Cost.find({ clientId: foundPeriod.clientId })
            .then((costs) => {
              const ids = costs.map((cost) => cost._id.toString());
              Period.findByIdAndUpdate(params.id, { $set: { costIds: ids } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/include_filtered_costs', (req, res) => {
    const { curveUser, params, body, query } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          const filter = Cost.paramsToFilterField(query, curveUser);
          Cost.find(filter)
            .then((costs) => {
              const ids = costs.map((cost) => cost._id.toString());
              Period.findByIdAndUpdate(params.id, { $push: { costIds: { $each: ids } } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/include_selected_costs', (req, res) => {
    const { curveUser, params, body, query } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          const costIds = query.costIds.map((id) => new ObjectId(id));
          Cost.find({ _id: { $in: costIds }, clientId: foundPeriod.clientId })
            .then((costs) => {
              const ids = costs.map((cost) => cost._id.toString());
              Period.findByIdAndUpdate(params.id, { $push: { costIds: { $each: ids } } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/remove_selected_costs', (req, res) => {
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const costIds = query.costIds.map((id) => new ObjectId(id));
          Cost.find({ _id: { $in: costIds }, clientId: foundPeriod.clientId })
            .then((costs) => {
              const ids = costs.map((cost) => cost._id.toString());
              Period.findByIdAndUpdate(params.id, { $pullAll: { costIds: ids } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/resolved_groups', (req, res) => {
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id clientId resolvedGroupIds')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const selectFields = '_id name type totalSalesLines createdAt';
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: selectFields,
          };
          const filter = { clientId: period.clientId, type: 'resolved', _id: { $in: period.resolvedGroupIds } };
          const result = await SalesGroup.paginate(filter, paginationParams).catch((err) => {
            logger.error(err);
            res.status(500).json({ message: 'Internal error, please try again' });
          });
          if (result) {
            res.status(200).json({ resolvedGroups: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
          }
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/unincluded_resolved_groups', (req, res) => {
    const { curveUser, params, query } = req;
    Period.findById(params.id, '_id clientId resolvedGroupIds')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const selectFields = '_id name type totalSalesLines createdAt';
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: selectFields,
          };
          query.notInclude = period.resolvedGroupIds;
          query.type = 'resolved';
          const filter = salesGroupHelpers.paramsToFilterField(query, curveUser);
          const result = await SalesGroup.paginate(filter, paginationParams).catch((err) => {
            logger.error(err);
            res.status(500).json({ message: 'Internal error, please try again' });
          });
          if (result) {
            res.status(200).json({ resolvedGroups: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
          }
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/include_filtered_resolved_groups', parseUrlencoded, (req, res) => {
    const { curveUser, params, body } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          body.type = 'resolved';
          const filter = salesGroupHelpers.paramsToFilterField(body, curveUser);
          SalesGroup.find(filter)
            .then((resolvedGroups) => {
              const ids = resolvedGroups.map((resolvedGroup) => resolvedGroup._id.toString());
              Period.findByIdAndUpdate(params.id, { $push: { resolvedGroupIds: { $each: ids } } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/include_selected_resolved_groups', parseUrlencoded, (req, res) => {
    const { curveUser, params, body } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const { resolvedGroupIds } = body;
          SalesGroup.find({ _id: { $in: resolvedGroupIds }, clientId: foundPeriod.clientId })
            .then((resolvedGroups) => {
              const ids = resolvedGroups.map((resolvedGroup) => resolvedGroup._id.toString());
              Period.findByIdAndUpdate(params.id, { $push: { resolvedGroupIds: { $each: ids } } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/remove_selected_resolved_groups', parseUrlencoded, (req, res) => {
    const { curveUser, params, body } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const { resolvedGroupIds } = body;
          SalesGroup.find({ _id: { $in: resolvedGroupIds }, clientId: foundPeriod.clientId })
            .then((resolvedGroups) => {
              const ids = resolvedGroups.map((resolvedGroup) => resolvedGroup._id.toString());
              Period.findByIdAndUpdate(params.id, { $pullAll: { resolvedGroupIds: ids } }, { new: true })
                .then((period) => {
                  res.status(200).json(period);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id)
      .then(async (period) => {
        if (!period) {
          return res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        }
        if (period && period.status === 'Processing') {
          return res.status(403).json({ message: "You can't delete a period that is processing. Wait for it to complete calculating before trying again." });
        }
        if (period && period.status === 'Deleting') {
          return res.status(403).json({ message: 'Error - this Period is already in the process of being deleted.' });
        }
        if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        const statements = await Statement.find({ periodId: period._id.toString(), status: 'Processing' }).catch(logger.error);
        if (statements?.length) {
          const statementLinks = statements.map((statement) => ({ name: statement.name, link: `#/statements/${statement._id.toString()}` }));
          return res.status(500).json({ message: 'Period cannot be deleted while the following statements are being processed:', statementLinks });
        }

        if (period.locked) {
          return res.status(403).json({ message: "You can't delete a locked period" });
        }

        period.checkPeriodPaymentsStatus(async (err) => {
          if (err) {
            res.status(403).json({ message: 'Payments associated with this period have already been paid out.' });
          } else {
            period.status = 'Deleting';
            await Period.findByIdAndUpdate(period._id, { $set: { status: 'Deleting' } });
            res.status(200).json(period);
            PeriodController.removePeriod({ curveUser, period });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const period = new Period(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      period.save()
        .then((period) => {
          res.status(200).json(period);
        })
        .catch((err) => {
          logger.error(err);
          // Why do we 201 here? This doesn't make sense
          res.status(201).json({ message: err.message });
        });
    }
  })

  .post('/:id/calculate', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;

    PeriodController.calculate({ params, curveUser }).then(() => {
      res.status(200).json({ message: 'Period sent for calculation' });
    }).catch((err) => {
      logger.error(err);
      res.status(err.code || 500).json({ message: err.message });
    });
  })

  .post('/:id/calculateFull', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    if (!curveUser?.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    Period.findById(params.id)
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          PeriodController.calculate({ params, curveUser, processFull: true }).then(() => {
            res.status(200).json({ message: 'Period sent for calculation' });
          }).catch((err) => {
            logger.error(err);
            res.status(500).json({ message: err.message });
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/validate_generate_unreported_file', parseUrlencoded, (req, res) => {
    PeriodController.validateUnreportedFileGeneration(req)
      .then((response) => {
        res.status(200).json(response);
      }).catch((err) => {
        logger.error(err);
        res.status(err.code || 500).json({ message: err.message });
      });
  })

  .post('/:id/generate_unreported_file', parseUrlencoded, (req, res) => {
    PeriodController.generateUnreportedFile(req)
      .then(() => {
        res.status(200).json({ message: 'The “Generate Unreported CSV” process has been successfully initiated. You will be notified upon completion.' });
      }).catch((err) => {
        logger.error(err);
        res.status(err.code || 500).json({ message: err.message });
      });
  })

  .post('/:id/process_batch_task', parseUrlencoded, async (req, res) => {
    const { curveUser, params, body } = req;

    const user = await User.findById(curveUser.id).catch(logger.error);
    if (!user || !user?.superInternal) { return res.status(403).json({ message: 'Forbidden' }); }

    const { batchTaskId } = body;
    if (!batchTaskId) { return res.status(404).json({ message: 'No ID Provided' }); }

    PeriodController.runBatchTask({ batchTaskId, email: user.email }).then(() => {
      res.status(200).json({ message: `Re-running Batch Task ${params.id}` });
    }).catch((err) => {
      res.status(500).json({ message: err.message });
    });
  })

  .post('/:id/statements_zip', parseUrlencoded, async (req, res) => {
    const { curveUser, params } = req;
    try {
      const period = await Period.findById(params.id, '_id name clientId status');
      if (!period) {
        return res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
      }
      const isForbidden = await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true });
      if (isForbidden) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const exportStatus = await PeriodController.createStatementsZip(period, curveUser, req.body.selectedFiles ?? []);
      res.status(200).json({ exportStatus });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .post('/:id/sales_csv', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          period.createSalesCsv(curveUser, (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: err.message });
            } else {
              res.status(200).json({ message: 'Period sent for calculation' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/costs_csv', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id name clientId status')
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          period.createCostsCsv(curveUser, (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: err.message });
            } else {
              res.status(200).json({ message: 'Period sent for calculation' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/catalogue_setting_error', parseUrlencoded, (req, res) => {
    const { curveUser, params, body } = req;
    Period.findById(params.id)
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          period.calculationStatus = 'Errored';
          period.calculationError = body.error;
          period.save()
            .then(() => {
              res.status(200).json({ message: 'Period errored saved' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/catalogue_setting_complete', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id)
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          period.calculationStatus = 'Calculating Sales';
          period.save()
            .then(() => {
              res.status(200).json({ message: 'Period updated' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/create_statement', parseUrlencoded, (req, res) => {
    const { curveUser, params, body } = req;

    if (!body.contractId) { return res.status(404).json({ message: 'ContractId is required to be passed' }); }

    Period.findById(params.id)
      .then(async (period) => {
        if (!period) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          Statement.countDocuments({ contractId: body.contractId, periodId: period._id })
            .then((count) => {
              if (count === 0) {
                period.createStatement(body.contractId, (err) => {
                  if (err) {
                    logger.error(err);
                    res.status(500).json({ message: 'Error creating statement' });
                  } else {
                    res.status(200).json({ message: 'Statement created' });
                  }
                });
              } else {
                res.status(201).json({ message: 'A statement for this contract already exists for this period' });
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/:id/publish_fuga_statements', async (req, res) => {
    const { params, curveUser } = req;
    try {
      await PeriodController.publishFugaStatements({ curveUser, periodId: params.id });
      res.status(200).json({ message: 'FUGA Statements are being published. An email will be sent to you once the process is complete.' });
    } catch (err) {
      logger.error(err);
      res.status(err?.code ?? 500).json({ message: err.message });
    }
  })

  .get('/:id/publish_all_statements', async (req, res) => {
    const { params, curveUser } = req;

    const period = await Period.findById(params.id, 'clientId name').catch(logger.error);
    if (!period) { return res.status(404).json({ message: `Could not find period with ID: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) { return res.status(403).json({ message: 'Forbidden' }); }

    // Run synchronously as this can take time to update.
    StatementController.updateStatementStatus({ period, curveUser, status: 'Published' });
    res.status(200).json({ message: 'All Statements are updating to Published. An email will be sent to you shortly.' });
  })

  .get('/:id/unpublish_all_statements', async (req, res) => {
    const { params, curveUser } = req;

    const period = await Period.findById(params.id, 'clientId name').catch(logger.error);
    if (!period) { return res.status(404).json({ message: `Could not find period with ID: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) { return res.status(403).json({ message: 'Forbidden' }); }

    // Run synchronously as this can take time to update.
    StatementController.updateStatementStatus({ period, curveUser, status: 'Pending' });
    res.status(200).json({ message: 'All Statements are updating to Pending. An email will be sent to you shortly.' });
  })

  .get('/:id/send_all_statements', async (req, res) => {
    const { params, curveUser } = req;

    if (curveUser?.rights?.[curveUser?.clientId]?.periods !== 'Edit' && !curveUser?.rights?.[curveUser?.clientId]?.periods !== 'Approval') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const period = await Period.findById(params.id).catch(logger.error);
    if (!period) { return res.status(404).json({ message: `Could not find period with ID: ${params.id}` }); }

    StatementController.sendStatements({ period, curveUser, sendAll: true });
    res.status(200).json({ message: 'All Statements are sending. An email will be sent to you shortly.' });
  })

  .get('/:id/archive_all_sales_files', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id name clientId status salesFilesIds')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          foundPeriod.archiveAllSalesFiles((err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Sales Files Failed to Archived' });
            } else {
              res.status(200).json({ message: 'Sales Files Successfully Archived' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/archive_fully_reported_sales_files', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id name clientId status salesFilesIds')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          foundPeriod.archiveFullyReportedSalesFiles((err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Sales Files Failed to Archived' });
            } else {
              res.status(200).json({ message: 'Sales Files Successfully Archived' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/archive_all_costs', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id name clientId status costIds')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          foundPeriod.archiveAllCosts((err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Costs Failed to Archived' });
            } else {
              res.status(200).json({ message: 'Costs Successfully Archived' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/archive_fully_reported_costs', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id, '_id name clientId status costIds')
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          foundPeriod.archiveFullyReportedCosts((err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Costs Failed to Archived' });
            } else {
              res.status(200).json({ message: 'Costs Successfully Archived' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })
  .get('/:id/platoon_output', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id)
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          PeriodController.platoonDeliverToSAP(foundPeriod, curveUser).then(() => {
            res.status(200).json({ message: 'Output to SAP being sent' });
          }).catch((err) => {
            logger.error(err);
            res.status(500).json({ message: err.message });
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })
  .get('/:id/platoon_sap_download', (req, res) => {
    const { curveUser, params } = req;
    Period.findById(params.id)
      .then(async (foundPeriod) => {
        if (!foundPeriod) {
          res.status(404).json({ message: `Could not find Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          PeriodController.platoonDownloadSAPOutput(foundPeriod, curveUser).then(() => {
            res.status(200).json({ message: 'SAP Output Being Created' });
          }).catch((err) => {
            logger.error(err);
            res.status(500).json({ message: err.message });
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods' })) {
      const filter = await paramsToFilterField(body.filter || {}, curveUser);

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'periods', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'periods', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  });

async function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  if (inputParams.accountingPeriodType) { params.accountingPeriodType = inputParams.accountingPeriodType; }
  if (inputParams.accountingPeriod) { params.accountingPeriod = inputParams.accountingPeriod; }
  if (inputParams.contractType) { params.contractType = inputParams.contractType; }
  if (inputParams.year) { params.year = inputParams.year; }

  if (!params.clientId && user.payeeId) {
    const payee = await Payee.findById(user.payeeId, 'clientId');
    if (payee && payee.clientId) { params.clientId = payee.clientId; }
  }

  return applyDateFilters(inputParams, params);
}

module.exports = router;
