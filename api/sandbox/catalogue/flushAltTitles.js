require('dotenv').config();
require('../models/db');
const { eachSeries, eachLimit } = require('async');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Work = require('../models/work');
const Client = require('../models/client');

Client.find({}, 'name', (err, clients) => {
  eachSeries(clients, (client, cb) => {
    Work.find({ clientId: client._id.toString() }, 'alternateTitles', (err, works) => {
      let count = 0;
      eachLimit(works, 3, (work, workCb) => {
        count += 1;
        logger.info(`${client.name}: ${count}/${works.length}`);
        if (work.alternateTitles && work.alternateTitles.length > 0) {
          work.alternateTitles = work.alternateTitles.map(title => {
            if (typeof title === 'string') {
              return { title: title, language: '' };
            } else {
              return title;
            }
          });
          Work.findByIdAndUpdate(work._id, { $set: { alternateTitles: work.alternateTitles } }, workCb);
        } else {
          workCb();
        }
      }, cb);
    });
  });
});

