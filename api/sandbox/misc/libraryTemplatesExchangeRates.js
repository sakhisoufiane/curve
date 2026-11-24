require('dotenv').config();
require('../models/db');
const async = require('async');
const LibraryTemplate = require('../models/libraryTemplate');

LibraryTemplate.find({}, (err, libraryTemplates) => {
  async.eachSeries(libraryTemplates, (libraryTemplate, cb) => {
    if (libraryTemplate.overwriteFields.exchangeRate) {
      libraryTemplate.overwriteFields.exchangeRate = null;
    }
    libraryTemplate.save(cb);
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
