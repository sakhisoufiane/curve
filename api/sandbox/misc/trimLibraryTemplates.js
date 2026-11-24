require('dotenv').config();
require('../models/db');
const LibraryTemplate = require('../models/libraryTemplate');

LibraryTemplate.findById('60197074ef37c200157db14f', (err, template) => {
  template.exampleLines = [template.exampleLines[0]];
  template.save((err) => {
    console.log(err);
    console.log('Complete');
  });
});
