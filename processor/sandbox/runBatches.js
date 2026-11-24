require('../models/db');
const Batch = require('../libs/calculation/period/batch.js');
const Period = require('../models/period');

Period.findById('64dc99ea3d95664f9f2de5ea', (err, period) => {
  console.log(err)
  console.log(period)
  Batch.runBatches(period, () =>{})
})