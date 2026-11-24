require('dotenv').config();
require('../models/db');
const User = require('../models/user');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');

User.find({}, (err, users) => {
  const output = [];
  const writeCsv = new WriteCsv({ headers: ['Email', 'Client IDs'], outputLocation: `${appRootDir}/tmp/userExport.csv` });
  async.each(users, (user, userCb) => {
    if (user.parentId || (user.clientIds && user.clientIds.length > 0)) {
      output.push([user.email, user.clientIds]);
    }
    userCb();
  }, (err) => {
    writeCsv.addData(output, (err) => {
	    writeCsv.write((err) => {
	      console.log('Complete');
	      process.exit(-1);
	    });
	  });
  });
});
