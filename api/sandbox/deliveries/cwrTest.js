require('dotenv').config();
require('../models/db');
const CwrReader = require('../libs/cwr/cwrReader');
const ingestCwr = require('../libs/cwr/ingestCwr');
const appRootDir = require('app-root-dir').get();

const localFile = `${appRootDir}/tmp/CWR_1769.V22`;

const cwrReader = new CwrReader();
// Read CWR
cwrReader.readFile(localFile, (err) => {
  // Return found works
  if (err) {
    console.log(err);
  } else {
    console.log(JSON.stringify(cwrReader.works));
    // ingestCwr.ingestData(cwrReader.works, '5d5bebe63faed34f863736e9', { territories: [] }, 'Tom Allen', (err) => {
    //   if (err) {
    //     console.log(err);
    //   }
    //   process.exit(-1);
    // });
  }
});
