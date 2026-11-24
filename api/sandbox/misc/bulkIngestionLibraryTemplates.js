require('dotenv').config();
require('../../models/db');
const async = require('async');
const LibraryTemplate = require('../../models/libraryTemplate');

LibraryTemplate.find({ identification: { $size: 0 } }, (err, libraryTemplates) => {
  console.log(libraryTemplates.length);
  // async.eachSeries(libraryTemplates, function(libraryTemplate, cb) {
  // libraryTemplate.extractExamplesLinesAndIdentifiers(cb);
  // }, function(err) {
  // console.log(err);
  // console.log("Complete");
  // });
});
