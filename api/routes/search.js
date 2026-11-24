const express = require('express');

const router = express.Router();
const _ = require('lodash');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');
const Contract = require('../models/contract');

router
  .get('/', (req, res) => {
    if (req.curveUser.clientId && !req.curveUser.payeeId) {
      Promise.all([
        Release.find(paramsToFilterField(req.query, req.curveUser, 'release')).limit(4),
        Track.find(paramsToFilterField(req.query, req.curveUser, 'track')).limit(4),
        Work.find(paramsToFilterField(req.query, req.curveUser, 'work')).limit(4),
        Contract.find(paramsToFilterField(req.query, req.curveUser, 'contract')).limit(4),
      ]).then((result) => {
        res.json({
          releases: result[0],
          tracks: result[1],
          works: result[2],
          contracts: result[3],
        });
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  });

function paramsToFilterField(inputParams, user, type) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  // if(user.contractIds) { params.contractId = { $in: user.contractIds }; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    if (type === 'release') {
      params.$or = [{ title: { $regex: regex } }, { artist: { $regex: regex } }, { catNo: { $regex: regex } }, { barcode: { $regex: regex } }, { label: { $regex: regex } }];
    } else if (type === 'track') {
      params.$or = [{ title: { $regex: regex } }, { artist: { $regex: regex } }, { isrc: { $regex: regex } }, { label: { $regex: regex } }];
    } else if (type === 'work') {
      params.$or = [{ title: { $regex: regex } }, { composer: { $regex: regex } }, { identifier: { $regex: regex } }];
    } else if (type === 'contract') {
      params.$or = [{ name: { $regex: regex } }, { labels: { $regex: regex } }];
    }
  }
  return params;
}

module.exports = router;
