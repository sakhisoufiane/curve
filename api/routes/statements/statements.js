const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const async = require('async');
const historyModelUser = require('../../libs/historyModelUser');
const Statement = require('../../models/statement');
const Period = require('../../models/period');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const User = require('../../models/user');
const Client = require('../../models/client');
const ExportStatementToOtherClient = require('../../libs/exportStatementToOtherClient');
const StatementController = require('../../controllers/statement');

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        select: 'clientId periodId contractId name periodType createdAt date year accountingPeriod status salesFilesIds costIds releaseIds trackIds workIds openingValue units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased netOutput openingBalance closingBalance lines valid invalidLines allFilesZip allFilesZipPublicLink salesCsv salesCsvPublicLink costsCsv costsCsvPublicLink pdf pdfPublicLink customStatement customStatementPublicLink statementOfAccount statementOfAccountPublicLink contractType profitShareRate profitShareNetAmount createdAt calculationStatus calculationError sendings currency locked updatedAt',
      };
      Statement.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        } else {
          res.status(200).json({ statements: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else if (curveUser.payeeId) {
      const filter = { 'payees.payeeId': curveUser.payeeId };
      const payee = await Payee.findById(curveUser.payeeId, 'clientId');
      if (payee && payee.clientId) { filter.clientId = payee.clientId; }

      Contract.find(filter)
        .then(async (contracts) => {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 10),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: 'clientId periodId contractId name periodType createdAt date year accountingPeriod status salesFilesIds costIds releaseIds trackIds workIds openingValue units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased netOutput openingBalance closingBalance lines valid invalidLines allFilesZip allFilesZipPublicLink salesCsv salesCsvPublicLink costsCsv costsCsvPublicLink pdf pdfPublicLink customStatement customStatementPublicLink statementOfAccount statementOfAccountPublicLink contractType profitShareRate profitShareNetAmount createdAt calculationStatus calculationError currency locked updatedAt',
          };
          query.contractIds = contracts.map((contract) => {
            if (query.contractIds && query.contractIds.includes(contract._id.toString())) {
              return contract._id.toString();
            } if (!query.contractIds || query.contractIds == []) {
              return contract._id.toString();
            }
          }).filter(Boolean);

          query.status = 'Published';
          Statement.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
            async.each(result.docs, (statement, cb) => {
              statement.getBalances(cb);
            }, (err) => {
              if (err) {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              } else {
                res.status(200).json({ statements: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
              }
            });
          });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  // TODO what is this route for?
  .get('/periods', (req, res) => {
    const { curveUser } = req;
    if (curveUser.clientId) {
      Period.find({ clientId: curveUser.clientId }, { name: 1 })
        .then((periods) => {
          res.status(200).json({ periods });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .post('/send_many', async (req, res) => {
    const { curveUser, body } = req;

    if (!['Edit', 'Approval'].includes(curveUser.rights?.[curveUser.clientId]?.periods)) { return res.status(403).json(FORBIDDEN); }

    const ids = (body.ids || []).map((id) => new ObjectId(id));

    let statementsFilter = null;
    if (!ids.length && body.filter) {
      statementsFilter = await paramsToFilterField(body.filter, curveUser);
    }

    const period = await Period.findById(body.filter.periodId).catch(logger.error);
    if (!period) {
      return res.status(404).json({ message: `Could not find period with ID: ${body.filter.periodId}` });
    }

    logger.info('Sending:', ids);
    StatementController.sendStatements({ period, curveUser, ids, sendAll: false, statementsFilter });
    res.status(200).json({ message: 'Statements are sending. An email will be sent to you shortly.' });
  })

  .post('/publish_many', async (req, res) => {
    const { curveUser, body } = req;

    if (!curveUser.clientId) { return res.status(403).json(FORBIDDEN); }

    if (!body.ids?.length && !body.filter) { return res.status(404).json({ message: 'Please select at least one statement' }); }

    if (!['Edit', 'Approval'].includes(curveUser.rights?.[curveUser.clientId]?.periods)) { return res.status(403).json(FORBIDDEN); }

    let ids = body.ids.map((id) => new ObjectId(id));
    if (!ids.length && body.filter) {
      const statementsFilter = await paramsToFilterField(body.filter, curveUser);
      ids = (await Statement.find(statementsFilter).select('_id')).map((statement) => statement._id);
    }

    logger.info('Publishing Many:', ids);

    StatementController.updateStatementStatus({ curveUser, status: 'Published', ids });
    res.status(200).json({ message: 'Statements are publishing. An email will be sent to you shortly.' });
  })

  .post('/unpublish_many', async (req, res) => {
    const { curveUser, body } = req;

    if (!curveUser.clientId) { return res.status(403).json(FORBIDDEN); }

    if (!body.ids?.length && !body.filter) { return res.status(404).json({ message: 'Please select at least one statement' }); }

    if (!['Edit', 'Approval'].includes(curveUser.rights?.[curveUser.clientId]?.periods)) { return res.status(403).json(FORBIDDEN); }

    let ids = body.ids.map((id) => new ObjectId(id));
    if (!ids.length && body.filter) {
      const statementsFilter = await paramsToFilterField(body.filter, curveUser);
      ids = (await Statement.find(statementsFilter).select('_id')).map((statement) => statement._id);
    }

    logger.info('Unpublishing Many:', ids);

    StatementController.updateStatementStatus({ curveUser, status: 'Pending', ids });
    res.status(200).json({ message: 'Statements are publishing. An email will be sent to you shortly.' });
  })

  .post('/download_selected_statements', parseUrlencoded, async (req, res) => {
    try {
      const { curveUser } = req;
      const { statementIds } = req.body;

      // Get clientId for the user (from payee or directly from user)
      const clientId = await getClientIdForUser(curveUser);
      if (!clientId) {
        return res.status(500).json({ message: 'Payee not found' });
      }

      const curveUserWithClientId = { ...curveUser, clientId };
      const hasReadAccessToAll = UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods' });

      let filter;
      let idsToDownload;

      if (hasReadAccessToAll) {
        // Users with read access to all can see statements based on paramsToFilterField
        filter = await paramsToFilterField({}, curveUser);
        filter._id = { $in: statementIds.map((id) => new ObjectId(String(id))) };
        const statements = await Statement.find(filter);
        if (statements.length !== statementIds.length) {
          return res.status(403).json({ message: 'Forbidden, user does not have access to all statements requested' });
        }
        idsToDownload = statements.map((statement) => statement._id.toString());
      } else if (curveUser.payeeId) {
        // Payee users can only see statements for their contracts
        const contracts = await Contract.find({
          'payees.payeeId': curveUser.payeeId,
          clientId,
        }).select('_id');
        const contractIds = contracts.map((contract) => contract._id);
        filter = {
          _id: { $in: statementIds.map((id) => new ObjectId(String(id))) },
          contractId: { $in: contractIds },
        };
        const statements = await Statement.find(filter);
        if (statements.length !== statementIds.length) {
          return res.status(403).json({ message: 'Forbidden, user does not have access to all statements requested' });
        }
        idsToDownload = statements.map((statement) => statement._id.toString());
      } else {
        return res.status(403).json({ message: 'Forbidden, user does not have access to all statements requested' });
      }

      await StatementController.downloadSelectedStatements({ curveUser: curveUserWithClientId, ids: idsToDownload });
      res.status(200).json();
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          statement.patches.find({ ref: statement._id })
            .populate('author', 'email')
            .then((patches) => {
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
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
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    Statement.findById(params.id)
      .select('clientId periodId contractId periodType name date year accountingPeriod status salesFilesIds costIds releaseIds trackIds workIds openingBalance closingBalance units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased netOutput lines valid invalidLines allFilesZip allFilesZipPublicLink salesCsv salesCsvPublicLink costsCsv costsCsvPublicLink pdf pdfPublicLink customStatement customStatementPublicLink statementOfAccount statementOfAccountPublicLink platoonRevenueReport platoonRevenueReportPublicLink selfBillingInvoice selfBillingInvoicePublicLink feesInvoice feesInvoicePublicLink contractType profitShareRate profitShareNetAmount profitShareUnrecoupedAdvanceStart profitShareAdvanceRecouped calculationStatus calculationError sendings currency partitionNo locked withholdingTax createdAt updatedAt')
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement })) {
          res.status(403).json(FORBIDDEN);
        } else {
          statement.getBalances(() => {
            if (statement.calculationError) {
              statement.calculationError = true;
            }
            res.status(200).json(statement);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id/detail', (req, res) => {
    // Loads only analytics against the statement
    const { curveUser, params } = req;
    Statement.findById(params.id, '_id periodId clientId contractId analysis')
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement })) {
          res.status(403).json(FORBIDDEN);
        } else {
          res.status(200).json({ analytics: statement.analysis });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

// A route to load all transactions associated with the statements, returning the transactions
  .get('/:id/transactions', (req, res) => {
    const { curveUser, params } = req;
    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement })) {
          res.status(403).json(FORBIDDEN);
        } else {
          StatementController.getTransactions({ statementId: params.id, curveUser }).then((transactions) => {
            res.status(200).json(transactions);
          }).catch((err) => {
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id/sales_files', (req, res) => {
    // eslint-disable-next-line global-require
    const SalesFile = require('../../models/salesFile');
    // Loads only sales files associated with the statement
    const { curveUser, params, query } = req;
    Statement.findById(params.id, '_id periodId clientId contractId salesFilesIds')
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: '_id clientId name invoiceNo targetPeriod targetStatement salesAccountName salesTemplateName salesTemplateId status file publicLink units validationUnits netAmount validationNetAmount homeCurrencyNetAmount lines validationLines valid invalidLines reportedStatus reportedLines',
          };
          SalesFile.paginate({ _id: { $in: statement.salesFilesIds } }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            } else {
              res.status(200).json({ salesFiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id/costs', (req, res) => {
    // eslint-disable-next-line global-require
    const Cost = require('../../models/cost');
    const { curveUser, params, query } = req;
    // Loads only sales files associated with the statement
    Statement.findById(params.id, '_id periodId clientId contractId costIds')
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            populate: ['releaseIds', 'trackIds', 'contractIds'],
          };
          Cost.paginate({ _id: { $in: statement.costIds } }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            } else {
              res.status(200).json({ costs: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .put('/:id/set_published_status', async (req, res) => {
    const { curveUser, params, body } = req;

    const statement = await Statement.findById(params.id).catch(logger.error);
    if (!statement) return res.status(404).json({ message: `Could not find statement with ID: ${params.id}` });

    if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write&approval', type: 'periods', document: statement, clientOnly: true })) {
      res.status(403).json(FORBIDDEN);
    }

    const status = body.status || 'Pending';

    StatementController.updateStatementStatus({ curveUser, status, ids: [params.id] });
    res.status(200).json({ message: 'Statements are publishing. An email will be sent to you shortly.' });
  })

  .post('/:id/pay', (req, res) => {
    const { curveUser, params } = req;

    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write', type: 'periods', document: statement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          statement.pay()
            .then(() => {
              res.status(200).json({ message: 'A payment for this statement has been created successfully' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.showToUser ? err.message : 'Failed to create payment. Please try again, or contact support' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .post('/pay_many', (req, res) => {
    const { curveUser, body } = req;

    if (!curveUser.clientId) { return res.status(403).json(FORBIDDEN); }

    if (!body.ids?.length) { return res.status(404).json({ message: 'Please select at least one statement' }); }

    const ids = body.ids.map((id) => new ObjectId(id));

    Statement.payMany(ids, curveUser)
      .then(() => {
        res.status(200).json({ message: `${ids.length} Payments created successfully` });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.showToUser ? err.message : 'Failed to create payments. Please try again, or contact support' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    Statement.findById(params.id)
      .then(async (foundStatement) => {
        if (!foundStatement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write', type: 'periods', document: foundStatement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          delete body.clientId;
          body.lastModifiedBy = curveUser.id;
          Statement.findByIdAndUpdate(params.id, body, { new: true })
            .then((statement) => {
              res.status(200).json(statement);
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
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;
    Statement.findById(params.id)
      .then(async (foundStatement) => {
        if (!foundStatement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write', type: 'periods', document: foundStatement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          Statement.findByIdAndDelete(params.id)
            .then((statement) => {
              if (!statement) {
                res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
              } else {
                res.status(200).json(statement);
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
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const statement = new Statement(body);
    if (!await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write', type: 'periods', document: statement, clientOnly: true })) {
      statement.save()
        .then((statement) => {
          res.status(200).json(statement);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .get('/:id/send', (req, res) => {
    const { curveUser, params } = req;

    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write&approval', type: 'periods', document: statement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else if (statement.status === 'Published') {
          statement.send((err) => {
            if (err) {
              res.status(500).json({ message: 'An error occurred in sending the statement' });
            } else {
              res.status(200).json({ message: 'Statement successfully sent' });
            }
          });
        } else {
          res.status(403).json({ message: 'Statement cannot be sent when not published' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .post('/:id/calculate', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;
    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write', type: 'periods', document: statement, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          const period = await Period.findOne({ _id: new ObjectId(statement.periodId) });
          if (period.status === 'Deleting') {
            return res.status(409).json({ message: 'Error - this statement cannot be reprocessed - it is part of a Period that is in the process of being deleted' });
          }
          statement.calculate((err) => {
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
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id/export_to_client', (req, res) => {
    const { curveUser, params, query } = req;
    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          logger.error(`Could not find Statement with ID ${params.id}`);
          res.status(500).json(INTERNAL_ERROR);
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'write', type: 'periods', document: statement })) {
          res.status(403).json(FORBIDDEN);
        } else {
          User.findById(curveUser.id)
            .then((user) => {
              if (!user) {
                logger.error(`Could not find User with ID ${curveUser.id}`);
                // This doesn't seem right but I will leave it for now
                res.status(500).json(INTERNAL_ERROR);
              } else {
                const targetClientId = query.clientId;
                Client.findById(targetClientId, '_id name clientType parentId')
                  .then((targetClient) => {
                    if (!targetClient) {
                      logger.error(`Could not find Client with ID ${targetClientId}`);
                      res.status(500).json(INTERNAL_ERROR);
                    } else {
                      const rightsOnClient = user.rights ? user.rights[targetClientId] : null;
                      let forbidden = true;
                      if (curveUser.internal || (targetClient.parentId && user.parentId === targetClient.parentId)) {
                        forbidden = false;
                      } else if (rightsOnClient) {
                        if (rightsOnClient.admin || (rightsOnClient.catalogue === 'Edit' && rightsOnClient.sales === 'Edit')) {
                          forbidden = false;
                        }
                      } else if (user.clientIds.includes(targetClientId)) {
                        forbidden = false;
                      }
                      if (!forbidden) {
                        const withCatalogue = query?.exportWithCatalogue === 'true';
                        ExportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, withCatalogue, (err) => {
                          if (err) {
                            logger.error(err);
                          }
                        });
                        res.status(200).json({ message: 'Royalties exporting to client' });
                      } else {
                        // TODO: @tom: We should add a custom message when user doesn't have edit access. If so, should we have a default in front end? Otherwise we can do all messaging from API perhaps?
                        res.status(403).json(FORBIDDEN);
                      }
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
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id/get_transactions', (req, res) => {
    const { curveUser, params } = req;

    if (curveUser.type !== 'payee') { return res.status(404).json({ message: 'Incorrect User Type' }); }

    Statement.findById(params.id)
      .then(async (statement) => {
        if (!statement) {
          res.status(404).json({ message: `Could not find Statement with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'periods', document: statement })) {
          res.status(403).json(FORBIDDEN);
        } else {
          StatementController.getTransactions({ statementId: params.id, curveUser }).then((transactions) => {
            res.status(200).json(transactions);
          }).catch((err) => {
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  });

/**
 * Gets the clientId for a user, either from their payee or directly from the user
 * @param {Object} curveUser - The user object
 * @returns {Promise<string|null>} - The clientId or null if payee not found
 */
async function getClientIdForUser(curveUser) {
  if (curveUser.payeeId) {
    const payee = await Payee.findById(curveUser.payeeId, 'clientId');
    if (!payee) {
      return null;
    }
    return payee.clientId;
  }
  return curveUser.clientId;
}

async function paramsToFilterField(inputParams, user) {
  const params = {};
  // Get contract IDs based on the filters
  const contractsFilter = {};
  if (inputParams.payeeCategories?.length) {
    const payeeIds = (await Payee.find({ clientId: user.clientId, payeeCategories: { $in: inputParams.payeeCategories } }).select('_id')).map((payee) => payee._id.toString());
    contractsFilter['payees.payeeId'] = { $in: payeeIds };
  }
  if (inputParams.payeeIds?.length) {
    const payeeIds = (await Payee.find({ clientId: user.clientId, _id: { $in: inputParams?.payeeIds } }).select('_id')).map((payee) => payee._id.toString());
    if (contractsFilter['payees.payeeId']?.$in) {
      // When having both payee categories and payees the 'payees.payeeId' filter should only keep ids that are in both filters
      const crossingIds = [];
      contractsFilter['payees.payeeId'].$in.forEach((id) => { if (payeeIds.includes(id)) crossingIds.push(id); });
      payeeIds.forEach((id) => { if (contractsFilter['payees.payeeId'].$in.includes(id)) crossingIds.push(id); });
      contractsFilter['payees.payeeId'].$in = crossingIds;
    } else {
      contractsFilter['payees.payeeId'] = { $in: payeeIds };
    }
  }
  if (inputParams.companyIds?.length) { contractsFilter.companyId = { $in: inputParams.companyIds }; }
  if (inputParams.contractCategories?.length) { contractsFilter.contractCategories = { $in: inputParams.contractCategories }; }

  // If the contractsFilter is not empty, get contract IDs and add them to the statements filter
  if (Object.keys(contractsFilter)?.length) {
    contractsFilter.clientId = user.clientId;
    const contractIds = (await Contract.find(contractsFilter).select('_id')).map((contract) => contract._id.toString());
    if (inputParams.contractIds) {
      inputParams.contractIds = inputParams.contractIds.concat(contractIds);
    } else {
      inputParams.contractIds = contractIds;
    }
  }
  if (inputParams.status) { params.status = inputParams.status; }
  if (inputParams.published?.toString() === 'true') { params.status = 'Published'; }
  if (inputParams.published?.toString() === 'false') { params.status = { $ne: 'Published' }; }
  if (inputParams.sent?.toString() === 'true') { params['sendings.0'] = { $exists: true }; }
  if (inputParams.sent?.toString() === 'false') { params['sendings.0'] = { $exists: false }; }

  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.contractIds) { params.contractId = { $in: inputParams.contractIds }; }
  if (inputParams.type) { params.periodType = inputParams.type; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [{ name: { $regex: regex } }];

    inputParams.text.length == 24 && ObjectId.isValid(inputParams.text) ? params.$or.push({ _id: inputParams.text }) : null;
  }
  if (inputParams.periodId) { params.periodId = inputParams.periodId; }

  if (!params.clientId && user.payeeId) {
    const payee = await Payee.findById(user.payeeId, 'clientId');
    if (payee && payee.clientId) { params.clientId = payee.clientId; }
  }
  if (inputParams.createdBefore || inputParams.createdAfter) {
    params.createdAt = {};

    if (inputParams.createdAfter) {
      const afterDate = new Date(inputParams.createdAfter);
      // Set time to beginning of day
      afterDate.setHours(0, 0, 0, 0);
      params.createdAt.$gte = afterDate;
    }

    if (inputParams.createdBefore) {
      const beforeDate = new Date(inputParams.createdBefore);
      // Set time to end of day
      beforeDate.setHours(23, 59, 59, 999);
      params.createdAt.$lte = beforeDate;
    }
  }

  return params;
}

module.exports = router;
