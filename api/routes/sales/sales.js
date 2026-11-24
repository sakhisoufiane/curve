const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const express = require('express');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const ValidateSales = require('../../libs/validateSales');
const { SalesLineExport } = require('../../libs/salesLineExport');
const ImportXlsx = require('../../libs/importXlsx');
const { salesHelpers } = require('../../libs/helpers/salesHelpers');
const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${appRootDir}/tmp/`);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
const selectValues = [
  'id', 'status', 'catType', 'distributionChannel', 'configuration', 'priceCategory', 'source', 'subSource', 'territory', 'barcode', 'catNo',
  'isrc', 'units', 'retailPrice', 'perUnitRate', 'grossAmount', 'netAmount', 'exchangeRate', 'mechanicalAtSource', 'discountAmount', 'originalCurrency',
  'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'homeCurrencyMechanicalAtSource', 'homeCurrencyDiscountAmount', 'originalReleaseTitle',
  'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'originalWorkTitle', 'originalComposers', 'originalIdentifier', 'iswc',
  'tunecode', 'songCode', 'contractIdentifier', 'production', 'episode', 'dateFrom', 'dateTo', 'party1', 'party2', 'party3', 'party4', 'party5',
  'saleDate', 'transactionDate', 'releaseId', 'trackId', 'workId', 'contractId', 'description', 'alternativeId'];

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then(async (client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const clientId = client._id.toString();
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const limit = query.limit ? query.limit : 50;
            const offset = query.page ? (limit * (query.page - 1)) : 0;
            const orderBy = query.orderBy ? query.orderBy : 'id';
            const orderDir = query.orderDir ? query.orderDir : 'ASC';
            const options = { limit, offset, orderBy, orderDir };
            try {
              const filter = await salesHelpers.paramsToFilterField(clientId, query, client);
              const { filter: bqFilter, filterParams } = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName: client.name, clientId });
              let sales = await salesHelpers.getSales({ bigQuery, select: selectValues, bqFilter, filterParams, options, clientId });
              const count = await salesHelpers.getCount({ bigQuery, bqFilter, filterParams, clientId });
              logger.info(`${clientId} GET /sales :`, { total: count, totalPages: Math.ceil(count / limit), currentPage: query.page || 1 });
              if (client.features?.suspense) {
                sales = await salesHelpers.addGroupInfoToSales({ clientId, sales });
              }
              res.status(200).json({ sales, meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: query.page || 1 } });
            } catch (err) {
              logger.error(`${clientId} GET /sales Error getting sales:`, err);
              res.status(500).json(INTERNAL_ERROR);
            }
          }
        })
        .catch((err) => {
          logger.error(`${curveUser.clientId} GET /sales Error getting client:`, err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .post('/export_to_csv', (req, res) => {
    const { curveUser, body } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then(async (client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const filter = body.ids?.length
              ? { id: { $in: body.ids } }
              : await salesHelpers.paramsToFilterField(client._id.toString(), { ...body.filter, csv: true }, client); // Set csv to true in order to add 'Input' to specific fields for the join
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const { filter: bqFilter, filterParams } = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName: client.name, clientId: client._id.toString() });
            SalesLineExport.byFilter({ bqFilter, filterParams, bigQuery, curveUser, client });
            res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
          }
        })
        .catch((err) => {
          logger.error(`${curveUser.clientId} POST /export_to_csv Error getting client:`, err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

            const query = bigQuery.getDataQuery(bigQuery.inputTable, selectValues, { id: params.id }, {});
            const labels = {
              job_type: 'sales',
              client_id: client._id.toString(),
            };

            bigQuery.queryJobPromise({ query, labels })
              .then((sales) => {
                res.status(200).json({ sales });
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

  .put('/multiple_ids', (req, res) => {
    const { curveUser, body } = req;
    if (UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then(async (client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const filter = { id: { $in: body.ids } };
            if (body.ids?.length) {
              const data = salesHelpers.updateParams(body);
              const { status, message } = await salesHelpers.processUpdates(client, filter, data);
              res.status(status).json({ message });
            } else {
              res.status(404).json({ message: 'No sales lines selected' });
            }
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

  .put('/filtered', (req, res) => {
    const { curveUser, query, body } = req;
    // This checks for an empty query in which case we just send back a bad request straight away.
    if (Object.keys(query)?.length === 0) {
      res.status(400).json({ message: 'No filters were selected, please select one' });
    } else if (UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then(async (client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const filter = await salesHelpers.paramsToFilterField(client._id.toString(), query, client);
            // Need to lookup BQ to get salesFileIds
            //  Note: Can't use filter.salesFileId as this will always be set regardless of user created filter
            //  Note: Can't use query.salesFileId(s) as these can include sales files which don't match other filters and so are irrelevant
            const data = salesHelpers.updateParams(body);
            const { status, message } = await salesHelpers.processUpdates(client, filter, data);
            res.status(status).json({ message });
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

  .put('/delete_multiple_ids', (req, res) => {
    const { curveUser, body } = req;
    if (UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else if (body.ids && body.ids.length > 0) {
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const filter = { id: { $in: body.ids } };
            // Need to lookup BQ to get salesFileIds before deletion takes place
            bigQuery.getDistinct(bigQuery.inputTable, 'salesFileId', filter, (err, salesFileIds) => {
              if (err) {
                logger.error(err);
                res.status(500).json(INTERNAL_ERROR);
              } else if (salesFileIds && salesFileIds.length > 0) {
                logger.debug({ salesFileIds });
                // Update the sales file first - if this errors we should not proceed as recalculation could be comprimised
                // If this succeeds but the BQ update fails -  worst case we rerun a sales file we didn't need to on a recalc (likely user will redo update anyway)
                SalesFile.updateMany({ _id: { $in: salesFileIds } }, { $set: { updatedAt: new Date() } })
                  .then(() => {
                    bigQuery.deleteData(bigQuery.inputTable, filter, (err) => {
                      if (err) {
                        logger.error(err);
                        res.status(500).json(INTERNAL_ERROR);
                      } else {
                        res.status(200).json({ message: 'Successfully updated' });
                      }
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  });
              } else {
                logger.error(new Error(`${client._id}: Failed to update salesFile updated dates for affected sales lines: ${body.ids}. Multiple Deletion Aborted`));
                res.status(500).json(INTERNAL_ERROR);
              }
            });
          } else {
            res.status(404).json({ message: 'No sales lines selected' });
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

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    if (UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const updatedSelectValues = [...selectValues, 'salesFileId'];

            const query = bigQuery.getDataQuery(bigQuery.inputTable, updatedSelectValues, { id: params.id }, {});
            const labels = {
              job_type: 'update_sales',
              client_id: client._id.toString(),
              document_id: params.id,
            };

            bigQuery.queryJobPromise({ query, labels })
              .then((sales) => {
                if (!sales || sales.length === 0) {
                  res.status(404).json({ message: 'Could not find sales line' });
                  return;
                }

                // We only retrieve the salesFileId to force its updated date so store and remove (removal inconsequential but preserving original data)
                const { salesFileId } = sales[0];
                delete sales[0].salesFileId;
                // Merge updates to existing document
                const updatedObject = salesHelpers.updateSaleObjectWithParams(sales[0], body);
                // Validate updated sales line data
                ValidateSales.line(updatedObject, (err, validatedLine) => {
                  if (err) {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  } else {
                  // Update the sales file first - if this errors we should not proceed as recalculation could be compromised
                  // If this succeeds but the BQ update fails -  worst case we rerun a sales file we didn't need to on a recalc (likely user will redo update anyway)
                    SalesFile.updateOne({ _id: new ObjectId(salesFileId) }, { $set: { updatedAt: new Date() } })
                      .then(() => {
                      // Strip empty arrays from update payload - BigQuery updateData serializes [] as () which is invalid for ARRAY<> columns
                        const updatePayload = { ...validatedLine };
                        Object.keys(updatePayload).forEach((key) => {
                          if (Array.isArray(updatePayload[key]) && updatePayload[key].length === 0) delete updatePayload[key];
                        });
                        bigQuery.updateData(bigQuery.inputTable, { id: params.id }, updatePayload, (err) => {
                          if (err) {
                            logger.error(err);
                            res.status(500).json(INTERNAL_ERROR);
                          } else {
                            res.status(200).json({ sale: validatedLine });
                          }
                        });
                      })
                      .catch((err) => {
                        logger.error(err);
                        res.status(500).json(INTERNAL_ERROR);
                      });
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
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;
    if (UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' })) {
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: 'Client not found' });
          } else {
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const filter = { id: params.id };

            // Need to lookup BQ to get salesFileIds before deletion takes place
            const query = bigQuery.getDataQuery(bigQuery.inputTable, 'salesFileId', filter, {});
            const labels = {
              job_type: 'delete_sales',
              client_id: client._id.toString(),
              sub_process: 'find_sales_file_ids',
            };
            bigQuery.queryJobPromise({ query, labels })
              .then((sales) => {
                if (!sales || sales.length === 0) {
                  res.status(404).json({ message: 'Could not find sales line to delete' });
                } else {
                  const { salesFileId } = sales[0];
                  // Update the sales file first - if this errors we should not proceed as recalculation could be comprimised
                  // If this succeeds but the BQ update fails -  worst case we rerun a sales file we didn't need to on a recalc (likely user will redo deletion anyway)
                  SalesFile.updateOne({ _id: new ObjectId(salesFileId) }, { $set: { updatedAt: new Date() } })
                    .then(() => {
                      bigQuery.deleteData(bigQuery.inputTable, filter, (err) => {
                        if (err) {
                          logger.error(err);
                          res.status(500).json(INTERNAL_ERROR);
                        } else {
                          // mark sales file updated?...haven't checked is right file
                          res.status(200).json({ message: 'Sale successfully deleted' });
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

  .post('/import_mappings', upload.single('file'), (req, res) => {
    const { curveUser, query, file } = req;
    // Recalculation filters will pickup catalogue updates triggered by mappings imports
    if (UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'sales' }) && file) {
      ImportXlsx.importMappings(file, query.catalogueType, query.templateType, curveUser);
      res.status(200).json({ message: 'Alias mappings are importing, and a report will be sent to you shortly.' });
    } else if (curveUser.clientId && !file) {
      res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  });

module.exports = router;
