require('dotenv').config();
require('../../models/db');
const Period = require('../../models/period');

Period.findById('5e84d96c40e0300b542c7f06', (err, period) => {
  period.simpleCreatePeriodXlsx((err, file) => {
    console.log(file);
  });
});
