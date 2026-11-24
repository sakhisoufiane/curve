const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const historyModelUser = require('../libs/historyModelUser');
const Parent = require('../models/parent');
const Payee = require('../models/payee');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${appRootDir}/tmp/`);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router
  .get('/', (req, res) => {
    if (req.curveUser.internal) {
      const paginationParams = {
        page: Page.valueOrDefault(req.query.page, 1),
        limit: Page.valueOrDefault(req.query.limit, 25),
        sort: Page.sortOrDefault(req.query.orderBy || 'name', req.query.orderDir),
      };
      Parent.paginate(paramsToFilterField(req.query), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ parents: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Parent.findById(params.id)
      .then(async (parent) => {
        if (!parent) {
          res.status(404).json({ message: `Could not find Parent with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', document: parent, parentOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (parent) {
          parent.patches
            .find({ ref: parent._id })
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
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Parent.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (parent) => {
        if (!parent) {
          res.status(404).json({ message: `Could not find Parent with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', document: parent, parentOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          res.status(200).json(parent);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    Parent.findById(params.id)
      .then(async (foundParent) => {
        if (!foundParent) {
          res.status(404).json({ message: `Could not find Parent with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', document: foundParent, parentOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          // Clean sub domain and custom domain values
          if (body.subdomain) { body.subdomain = body.subdomain.toLowerCase().split(' ').join('_'); }
          if (body.customDomain) { body.customDomain = body.customDomain.trim(); }
          if (body.customDomain === 'https://app.curveroyaltysystems.com') { body.customDomain = null; }
          body.lastModifiedBy = curveUser.id;
          Parent.findByIdAndUpdate(params.id, body, { new: true })
            .then((parent) => {
              res.status(200).json(parent);
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

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;

    if (!curveUser.internal) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      Parent.findByIdAndDelete(params.id)
        .then((parent) => {
          if (!parent) {
            res.status(404).json({ message: `Could not find Parent with ID ${params.id}` });
          } else {
            res.status(200).json(parent);
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    }
  })

  .post('/', parseUrlencoded, (req, res) => {
    const { curveUser, body } = req;

    if (!curveUser.internal) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      // Clean sub domain and custom domain values
      if (body.subdomain) { body.subdomain = body.subdomain.toLowerCase().split(' ').join('_'); }
      if (body.customDomain) { body.customDomain = body.customDomain.trim(); }

      body.createdBy = curveUser.id;
      body.lastModifiedBy = curveUser.id;
      Parent.findOne({ name: body.name })
        .then((foundParent) => {
          if (foundParent) {
            res.status(500).json({ message: 'A Parent with this name already exists' });
          } else {
            const parent = new Parent(body);
            parent.save()
              .then((parent) => {
                res.status(200).json(parent);
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
    }
  })

  .post('/:id/uploadDarkLogo', upload.single('file'), (req, res) => {
    const { curveUser, params, file } = req;

    if (!file) {
      return res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    }

    if (curveUser.internal) {
      // Write to S3
      Parent.findById(params.id)
        .then((parent) => {
          if (!parent) {
            res.status(500).json({ message: `Could not find Parent with ID ${params.id}` });
          } else {
            fileManager.uploadToS3(`parents/${parent._id.toString()}/darkLogo/${file.originalname}`, file.path, (err, key) => {
              if (err) {
                logger.error(err);
                res.status(500).json({ message: 'There was an error uploading the file, please try again' });
              } else {
                parent.darkLogo = key;
                fileManager.publicS3Link(key, (err, link) => {
                  parent.publicDarkLogo = link;
                });
                parent.save()
                  .then((savedParent) => {
                    res.status(200).json(savedParent);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json({ message: 'Internal error, please try again' });
                  });
              }
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/:id/uploadLightLogo', upload.single('file'), (req, res) => {
    const { curveUser, params, file } = req;

    if (!file) {
      return res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    }

    if (curveUser.internal) {
      // Write to S3
      Parent.findById(params.id)
        .then((parent) => {
          if (!parent) {
            res.status(500).json({ message: `Could not find Parent with ID ${params.id}` });
          } else {
            fileManager.uploadToS3(`parents/${parent._id.toString()}/lightLogo/${file.originalname}`, file.path, (err, key) => {
              if (err) {
                logger.error(err);
                res.status(500).json({ message: 'There was an error uploading the file, please try again' });
              } else {
                parent.lightLogo = key;
                fileManager.publicS3Link(key, (err, link) => {
                  parent.publicLightLogo = link;
                });
                parent.save()
                  .then((savedParent) => {
                    res.status(200).json(savedParent);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json({ message: 'Internal error, please try again' });
                  });
              }
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/:id/uploadFavicon', upload.single('file'), (req, res) => {
    const { curveUser, params, file } = req;

    if (!file) {
      return res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    }

    if (curveUser.internal) {
      // Write to S3
      Parent.findById(params.id)
        .then((parent) => {
          if (!parent) {
            res.status(500).json({ message: `Could not find Parent with ID ${params.id}` });
          } else {
            fileManager.uploadToS3(`parents/${parent._id.toString()}/favicon/${file.originalname}`, file.path, (err, key) => {
              if (err) {
                logger.error(err);
                res.status(500).json({ message: 'There was an error uploading the file, please try again' });
              } else {
                parent.favicon = key;
                fileManager.publicS3Link(key, (err, link) => {
                  parent.publicFavicon = link;
                });
                parent.save()
                  .then((savedParent) => {
                    res.status(200).json(savedParent);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json({ message: 'Internal error, please try again' });
                  });
              }
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  });

function paramsToFilterField(inputParams) {
  const params = {};
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  return params;
}

module.exports = router;
