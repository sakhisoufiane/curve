require('dotenv').config();
require('../models/db');
const async = require('async');
const SalesTemplate = require('../models/salesTemplate');

const copyFromClient = 'x5f8ef7fd6d763b001524c783';
const copyToClient = 'x619640cbf270aa0028e3baf0';

SalesTemplate.find({ clientId: copyFromClient, archived: false }, (findErr, templates) => {
  if (findErr) {
    console.error(findErr);
  } else if (templates) {
    async.eachSeries(templates, (template, cb) => {
      console.log(`copying template: '${template.name}' from client ${copyFromClient} to client ${copyToClient}`);
      const copy = { ...template._doc };
      delete copy._id;
      delete copy.file;
      copy.clientId = copyToClient;
      salesTemplate = new SalesTemplate(copy);
      salesTemplate.save(cb);      
    }, (eachErr) => {
      if (eachErr) {
        console.error(eachErr);
      } else {
        console.log('Complete');
      }
      process.exit(-1);
    });
  } else {
    console.error('no templates found');
    process.exit(-1);
  }
});
