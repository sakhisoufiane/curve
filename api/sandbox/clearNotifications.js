require('dotenv').config();
require('../models/db');
const Notification = require('../models/notification');

/*
Script for removing notifications
*/

const main = async () => {
  const query = {};
  query.clientId = '64090aa0bf4db12427e5e586';
  query.userId = '6409110eea6ebde4b7daeafd';
  query.description = 'Duplicate ISWCs detected in Acknowledgement file - a report has been emailed to you';
  query.createdAt = {};
  query.createdAt.$gte = new Date('2024-04-03T00:00:00Z').toISOString();
  query.createdAt.$lt = new Date('2024-04-04T00:00:00Z').toISOString();

  await Notification.deleteMany(query);

  console.log('script complete');
}

main();
