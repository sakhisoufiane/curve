const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const { TASK_NAME, runTaskForFindingDuplicates } = require('../../libs/duplicates/runTaskForFindingDuplicates');
const Client = require('../../models/client');
const Task = require('../../models/task');

const router = express.Router();

router
  .get('/duplicates/start-task', async (req, res) => {
    const { curveUser } = req;
    const { type } = req.query;
    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (!type) {
        return res.status(400).json({ message: 'Missing required query parameter: type' });
      }

      const clientId = curveUser?.clientId;
      const client = await Client.findById(clientId);
      if (!client) return res.status(400).json('Client not found');

      await runTaskForFindingDuplicates({ client, user: curveUser, type });
      return res
        .status(200)
        .json({ message: 'Searching Catalogue For Duplicates', type });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'There was an issue. Please try again' });
    }
  })

  .get('/duplicates/task/status', async (req, res) => {
    const { curveUser } = req;
    const { type } = req.query;
    try {
      if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (!type) {
        return res.status(400).json({ message: 'Missing required query parameter: type' });
      }

      const clientId = curveUser?.clientId;
      const client = await Client.findById(clientId);
      if (!client) return res.status(400).json('Client not found');

      const count = await Task.countDocuments({
        clientId,
        name: TASK_NAME,
        status: {
          $in: ['Pending', 'In Progress'],
        },
        'value.catalogueType': type,
      });

      return res.status(200).json({ isRunning: !!count });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: 'There was an issue. Please try again' });
    }
  });

module.exports = router;
