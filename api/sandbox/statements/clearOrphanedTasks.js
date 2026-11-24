require('../../models/db');
require('dotenv').config();

const Period = require('../../models/period');
const Task = require('../../models/task');


(async ()=> {
  console.log('Getting tasks');
  const tasks = await Task.find({status: {$in : ['In Progress', 'Pending']}, name: 'Batch Worker'});
  for (const task of tasks) {
    const period = await Period.findById(task.value.periodId).select('status');
    if (!period || period.status === 'Complete') {
      await task.deleteOne();
    }
  }

  process.exit(0)
})();
