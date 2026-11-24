require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const UnmappedWork = require('../models/unmappedWork');
const WriteCsv = require('../libs/writeCsv');

UnmappedWork.find({ clientId: '5f99b5978e408e0041504c9a' }, (err, unmappedWorks) => {
  const outputLocation = `${appRootDir}/tmp/Made In Memphis Publishing Unmapped.csv`;
  const writer = new WriteCsv({ headers: ['Source', 'Identifier', 'Tunecode', 'ISWC', 'Songcode', 'Title', 'Party 1', 'Party 2', 'Party 3'], outputLocation });
  const outputData = unmappedWorks.map((line) => [line.source, line.identifier, line.tunecode,  line.iswc, line.songcode, line.title, line.party1, line.party2, line.party3]);
  writer.addData(outputData, () => {
    writer.write((err, location) => {
      console.log(location);
    });
  });
});