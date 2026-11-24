require('dotenv').config();
require('../models/db');
const Period = require('../models/period');

Period.findById('5f62152067b5c6000f6309d1', (err, period) => {
  period.delete((err) => {
    console.log(err);
    console.log('Complete');
  });
});
