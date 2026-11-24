require('../models/db');
const Task = require('../models/task');
const Period = require('../models/period');

Task.findById('5fdbd4e4716cb00701397285', (err, task) => {
  console.log(task);
  Period.findById(task.value.periodId, (err, period) => {
    period.calculateSalesBatch(task, (err) => {
      console.error(err);
      console.log('Complete');
    });
  });
});
