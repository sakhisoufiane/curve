const { logger } = require('@curveroyaltysystems/platform-shared-utils');
require('dotenv').config();
require('../models/db');
const async = require('async');
const Import = require('../models/import');

const id = '62d88921925b43f3576b0a7a';

Import.findById(id, (err, foundImport) => {
  foundImport.runImport({ email: "tom@curveroyaltysystems.com" });
});