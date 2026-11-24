require('dotenv').config();
require('../models/db');
const moment = require('moment');
const Task = require('../models/task');

Task.find({ clientId: '5e27480670a5032aa17d8d42', name: 'Sales File Ingest' }, (err, tasks) => {
  tasks.forEach((task) => {
    console.log(`${task.value.salesFileId},${moment(task.createdAt).format('YYYY-MM-DD HH:mm:SS')}`);
  });
});
