const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });

const TaskController = require('../controllers/task');

const Task = require('../models/task');
const AppSettings = require('../models/appSettings');

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
  .get('/', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json(FORBIDDEN); }

    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
    };
    Task.paginate(paramsToFilterField(req.query), paginationParams, (err, result) => {
      if (err) {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      } else {
        res.status(200).json({ tasks: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
      }
    });
  })

  .get('/gimme', (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json(FORBIDDEN); }

    Task.findOneAndUpdate({ status: 'Pending' }, { $set: { status: 'In Progress' } }, { sort: { createdAt: 'asc' } })
      .then((task) => {
        if (task) {
          res.status(200).json(task);
        } else {
          res.status(404).json({ message: 'No tasks for processing' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/pending', (req, res) => {
    const { curveUser } = req;
    TaskController.getTasks({ status: 'Pending', curveUser }).then((tasks) => {
      res.status(200).json(tasks);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    });
  })

  .get('/processing', (req, res) => {
    const { curveUser } = req;
    TaskController.getTasks({ status: 'In Progress', curveUser }).then((tasks) => {
      res.status(200).json(tasks);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    });
  })

  .get('/today', (req, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    Task.find({ createdAt: { $gte: today } }, null, { sort: { started: 'asc' } })
      .then((tasks) => {
        if (tasks) {
          res.status(200).json(tasks);
        } else {
          // Should we not return 404 or something else?
          res.status(500).json(INTERNAL_ERROR);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/is-queue-blocked', async (req, res) => {
    const { state } = await AppSettings.findOne();
    const isQueueBlocked = state?.deployment;
    res.status(200).json({ isQueueBlocked });
  })

  .get('/errored', (req, res) => {
    const { curveUser } = req;
    TaskController.getTasks({ status: 'Errored', curveUser }).then((tasks) => {
      res.status(200).json(tasks);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    });
  })

  .get('/hung', (req, res) => {
    const { curveUser } = req;
    TaskController.getTasks({ status: 'Hung', curveUser }).then((tasks) => {
      res.status(200).json(tasks);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    });
  })

  .get('/count', (req, res) => {
    const { curveUser } = req;
    TaskController.getStatusCounts({ curveUser }).then((counts) => {
      res.status(200).json(counts);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    });
  })

  .get('/:id/history', (req, res) => {
    if (req.curveUser?.internal) {
      Task.findById(req.params.id)
        .then((task) => {
          if (!task) {
            res.status(404).json({ message: `Could not find Task with ID ${req.params.id}` });
          } else {
            task.patches.find({ ref: task._id })
              .populate('author', 'email')
              .then((patches) => {
                res.status(200).json({ modelHistory: patches });
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

  .get('/:id', (req, res) => {
    if (req.curveUser.internal) {
      Task.findById(req.params.id)
        .then((task) => {
          if (task) {
            res.status(200).json(task);
          } else {
            res.status(404).json({ message: `Could not find Task with ID ${req.params.id}` });
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
    if (!req.curveUser?.internal) { return res.status(403).json(FORBIDDEN); }

    Task.findById(req.params.id)
      .then((foundTask) => {
        if (!foundTask) {
          res.status(404).json({ message: `Could not find Task with ID ${req.params.id}` });
        } else {
          Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .then((task) => {
              res.status(200).json(task);
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
    if (!req.curveUser?.internal) { return res.status(403).json(FORBIDDEN); }

    Task.findByIdAndDelete(req.params.id)
      .then((task) => {
        if (!task) {
          res.status(404).json({ message: `Could not find Task with ID ${req.params.id}` });
        } else {
          res.status(200).json(task);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .post('/', parseUrlencoded, (req, res) => {
    if (!req.curveUser?.internal) { return res.status(403).json(FORBIDDEN); }

    const task = new Task(req.body);
    task.save()
      .then((savedTask) => {
        res.status(200).json(savedTask);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  });

function paramsToFilterField(inputParams) {
  const params = {};
  if (inputParams.clientId) { params.clientId = inputParams.clientId; }
  if (inputParams.text) { params.$text = { $search: inputParams.text }; }
  return params;
}

module.exports = router;
