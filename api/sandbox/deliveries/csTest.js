require('dotenv').config();
require('../models/db');
const CsReader = require('../libs/cwr/csReader');
const ingestCwr = require('../libs/cwr/ingestCwr');
const appRootDir = require('app-root-dir').get();

const localFile = `${appRootDir}/tmp/BRAZIL_SAMPLE.cs`;

const csReader = new CsReader();
// Read CWR
csReader.readFile(localFile, (err) => {
  // Return found works
  if (err) {
    console.log(err);
  } else {
    console.log('complete');
    console.log(JSON.stringify(csReader.works[0]));
    process.exit(-1);
    // ingestCwr.ingestData(cwrReader.works, '5d5bebe63faed34f863736e9', { territories: [] }, 'Tom Allen', (err) => {
    //   if (err) {
    //     console.log(err);
    //   }
    //   process.exit(-1);
    // });
  }
});