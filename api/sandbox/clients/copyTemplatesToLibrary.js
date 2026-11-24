require('dotenv').config();
require('../models/db');
const async = require('async');
const SalesTemplate = require('../models/salesTemplate');
const LibraryTemplate = require('../models/libraryTemplate');

SalesTemplate.find({ clientId: '5ff89ddcf0cb200029d9088d' }, (err, templates) => {
  async.eachSeries(templates, (template, cb) => {
    const copy = { ...template._doc };
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.createdBy;
    delete copy.lastModifiedBy;
    copy.exampleLines = [copy.exampleLines[0]];
    copy.published = false;
    libraryTemplate = new LibraryTemplate(copy);
    libraryTemplate.save(cb);
  }, (err) => {
    console.log('Complete');
  });
});
