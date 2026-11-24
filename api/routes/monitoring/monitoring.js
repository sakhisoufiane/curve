/* eslint-disable global-require */
/* eslint-disable no-await-in-loop */
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const Task = require('../../models/task');
const Client = require('../../models/client');
const User = require('../../models/user');
const Notification = require('../../models/notification');
const AppSettings = require('../../models/appSettings');
const MonitoringController = require('../../controllers/monitoring');

const router = express.Router();

router
  .get('/copyClient', (req, res) => {
    if (req.curveUser?.internal || req?.curveUser?.monitoring) {
      User.findById(req.curveUser?.id)
        .then((user) => {
          if (!user) {
            return res.status(404).json({ message: 'Could not find user.' });
          }

          const { id, includeSalesFiles, includeTables, includeArchived, includePeriodAndStatementFiles } = req.query;
          Client.findById(id, 'name')
            .then(async (client) => {
              if (client) {
                const count = await Task.countDocuments({
                  name: { $in: ['Copy Client'] },
                  clientId: client._id.toString(),
                  status: { $in: ['Pending', 'In Progress'] },
                  'value.clientId': client._id.toString(),
                });
                if (!count) {
                  TaskHelpers.createTaskAndSendMessage(Task, {
                    name: 'Copy Client',
                    clientId: client._id,
                    clientName: client.name,
                    value: {
                      clientId: client._id.toString(),
                      includeSalesFiles: includeSalesFiles === 'true',
                      includePeriodAndStatementFiles: includePeriodAndStatementFiles === 'true',
                      includeTables: includeTables === 'true',
                      includeArchived: includeArchived === 'true',
                      user: user.email,
                    },
                    progressStatus: 'Initialising Copy Client',
                  })
                    .then(() => {
                      res.status(200).json({ message: `${client.name} is now copying to testing environment` });
                    })
                    .catch((sqsErr) => {
                      res.status(500).json({ message: 'Could not create task and send SQS Message' });
                    });
                } else {
                  res.status(500).json({ message: 'This task is already running - please wait until it has completed before running again' });
                }
              } else {
                res.status(404).json({ message: `Could not find Client with ID ${id}` });
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(404).json({ message: `Could not find Client with ID ${id}` });
            });
        })
        .catch((err) => {
          logger.error(err);
          // Keeping same error message as before
          res.status(404).json({ message: 'Could not find user.' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/supportScriptList', (req, res) => {
    if (req?.curveUser?.internal || req?.curveUser?.monitoring) {
      AppSettings.findOne({})
        .then((settings) => {
          if (!settings) {
            return res.status(404).message({ message: 'Could not find app settings' });
          }
          res.status(200).json(settings.supportScripts);
        })
        .catch((err) => {
          logger.error(err);
          return res.status(404).message({ message: 'Could not find app settings' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/supportScript', async (req, res) => {
    if (req.curveUser?.internal || req?.curveUser?.monitoring) {
      try {
        const user = await User.findById(req.curveUser?.id);
        if (user) {
          const { script, scriptParams: scriptParamsInput } = req.query;
          const scriptParams = typeof scriptParamsInput === 'string' ? JSON.parse(scriptParamsInput) : scriptParamsInput;
          const count = await Task.countDocuments({
            type: 'Support Script',
            status: { $in: ['Pending', 'In Progress'] },
            name: script,
            'value.id': scriptParams[0].value,
            'value.scriptParams': scriptParams,
            'value.script': script,
          });
          if (!count) {
            TaskHelpers.createTaskAndSendMessage(Task, {
              name: script,
              type: 'Support Script',
              value: { id: scriptParams[0].value, script, scriptParams, user: user.email },
              progressStatus: `Initialising ${script} script`,
            })
              .then(() => {
                res.status(200).json({ message: 'Script will begin shortly.' });
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json({ message: 'Could not create task and send SQS message' });
              });
          } else {
            res.status(500).json({ message: 'This task is already running - please wait until it has completed before running again' });
          }
        } else {
          res.status(404).json({ message: 'Could not find user' });
        }
      } catch (err) {
        logger.error(err);
        res.status(500);
      }
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/triggerFtpIngestion', async (req, res) => {
    const runSalesFtpIngestion = require('../../processes/ftpIngestion/ftpRunner');
    const runAckFtpIngestion = require('../../processes/ftpIngestion/ackRunner');
    const runIswcFtpIngestions = require('../../processes/ftpIswcAckCheck/ftpIswcAckRunner');
    const { clientSpecificFeeds } = require('../../processes/xmlIngestion/xmlRunnerTypes');

    const runDdexFtpIngestion = (clientId) => new Promise((resolve) => {
      clientSpecificFeeds(clientId, (err) => {
        if (err) {
          logger.error('DDEX Ingestion: Failed', err);
        }
        logger.info('DDEX Ingestion: Complete');
        resolve();
      });
    });

    const ingestionMap = {
      salesFtpIngestions: { name: 'Sales', run: runSalesFtpIngestion },
      ackFtpIngestions: { name: 'Acknowledgement', run: runAckFtpIngestion },
      iswcFtpIngestions: { name: 'ISWC', run: runIswcFtpIngestions },
      ddexFtpIngestions: { name: 'Catalogue', run: runDdexFtpIngestion },
    };

    const { ftpIngestionType, clientId, name: serverName } = req.query;
    if (!req.curveUser?.internal) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!ftpIngestionType) {
      return res.status(400).json({ message: 'Missing FTP Ingestion Type' });
    }

    try {
      const client = await Client.findById(clientId).lean();
      if (!client) {
        return res.status(404).json({ message: 'Could not find client' });
      }
      const ingestion = ingestionMap[ftpIngestionType];
      if (!ingestion) {
        return res.status(404).json({ message: `Ingestion type: ${ftpIngestionType} does not exist` });
      }

      const isCatalogue = ftpIngestionType === 'ddexFtpIngestions';
      const isISWC = ftpIngestionType === 'iswcFtpIngestions';
      const runArgs = [clientId];

      if (!isCatalogue) {
        const foundFtpIngestion = client[ftpIngestionType].find((ftpIngestion) => ftpIngestion.name === serverName);
        if (!foundFtpIngestion) {
          return res.status(404).json({ message: `FTP ingestion ${serverName} within ${ftpIngestionType} not found for this client` });
        }
        runArgs.push(serverName);
        if (!isISWC) {
          const hasInitialisedDate = !!foundFtpIngestion.initialisedDate;
          runArgs.push(hasInitialisedDate);
        }
      }

      ingestion.run(...runArgs)
        .then(() => {
          const generateOptions = {
            identifier: 'monitoringTools',
            curveUser: req.curveUser,
            client,
            subject: 'FTP Ingestion',
            mainText: `${ingestion.name} FTP ingestion has completed successfully`,
          };
          Notification.generate(generateOptions.subject, generateOptions.mainText, null, req.curveUser, generateOptions);
        });
      res.status(200).json({ message: `${ingestion.name} FTP ingestion has been initiated` });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: err.message });
    }
  })

  .get('/ftpIngestionList', async (req, res) => {
    if (!req.curveUser?.internal) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { clientId, ftpIngestionType } = req.query;
    try {
      const client = await Client.findById(clientId).select(ftpIngestionType).lean();
      if (!client) {
        return res.status(404).json({ message: 'Could not find client' });
      }

      const ftpIngestionList = client[ftpIngestionType].filter(({ active }) => active).map(({ name }) => name);
      res.status(200).json(ftpIngestionList);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to fetch FTP ingestion list' });
    }
  })

  .get('/chart_credentials', async (req, res) => {
    const user = await User.findById(req.curveUser.id).catch(logger.error);
    if (!user?.internal && !user?.monitoring) return res.status(403).json({ message: 'Forbidden' });

    const credentials = { id: process.env.MONGO_CHART_ID, url: process.env.MONGO_CHART_URL };
    return res.status(200).json(credentials);
  })

  .get('/rerun-task', async (req, res) => {
    if (!req.curveUser?.superInternal) { return res.status(403).json({ message: 'Forbidden' }); }
    const { taskId } = req.query;
    try {
      await MonitoringController.rerunTask({ taskId, curveUser: req.curveUser });
      res.status(200).json({});
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: `Failed to re-run task: ${err.message}` });
    }
  })

  .get('/terminate', async (req, res) => {
    if (!req.curveUser?.superInternal) { return res.status(403).json({ message: 'Forbidden' }); }
    const { taskId } = req.query;
    try {
      await MonitoringController.terminateTask({ taskId, curveUser: req.curveUser });
      res.status(200).json({});
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: `Failed to terminate task: ${err.message}` });
    }
  });

module.exports = router;
