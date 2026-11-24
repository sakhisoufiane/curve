require('dotenv').config();
require('../models/db');
const async = require('async');
const LibraryTemplate = require('../models/libraryTemplate');

LibraryTemplate.find({}, (err, libraryTemplates) => {
  async.eachSeries(libraryTemplates, (libraryTemplate, cb) => {
    libraryTemplate.extractExamplesLinesAndIdentifiers((err, libraryTemplate) => {
      if (err) {
        console.error(err);
      } else if (libraryTemplate) {
        console.log(libraryTemplate.name);
      }
      cb();
    });
  });
});
