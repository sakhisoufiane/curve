require('dotenv').config();
require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');

Period.find({ locked: true }, { _id: true }, (err, periods) => {
  Statement.updateMany({ periodId: { $in: periods.map((period) => period._id.toString()) } }, { $set: { locked: true } }, (err, res) => {
    console.log(err);
    console.log(res);
  });
});
