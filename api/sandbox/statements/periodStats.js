require('dotenv').config();
require('../models/db');
const moment = require('moment');
const Period = require('../models/period');
const Statement = require('../models/statement');

// Period.find({ createdAt: { $gt: new Date(2020, 8, 1) } }, 'name grossAmount netAmount createdAt lines runNo', (err, periods) => {
// periods.forEach(period => {
// console.log(period.name + "|" + period.grossAmount + "|" + period.netAmount + "|" + period.lines + "|" + period.runNo + "|" + moment(period.createdAt).format("DD/MM/YYYY"));
// });
// });

Statement.count({ createdAt: { $gt: new Date(2021, 0, 1) } }, (err, count) => {
  console.log(count);
});
