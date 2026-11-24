require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');

Work.find({ clientId: '5fa2a4ea84d0c10026fa518f' }, (err, works) => {
  let count = 0;
  async.eachSeries(works, (work, cb) => {
    if (work.rightsChain && work.rightsChain[0]) {
      work.rightsChain[0].territory = 'WW';
    }
    count += 1;
    console.log(count);
    Work.update({ _id: work._id }, { $set: { rightsChain: work.rightsChain } }, cb);
  }, (err) => {
    if (err) {
      console.error(err);
    }
    console.log('Complete');
  });
});
