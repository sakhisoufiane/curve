require('../models/db');
const Period = require('../models/period');

Period.findById('5e42e2bf2f739a6f301bcf4c', (err, period) => {
  period.calculate((err) => {
    console.log(err);
    console.log('Complete');
  });
});
