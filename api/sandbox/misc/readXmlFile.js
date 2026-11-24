const xmlReader = require('../processes/xmlIngestion/xmlReader');
const appRootDir = require('app-root-dir').get();

const files = [`${appRootDir}/tmp/812257035502.xml`];

xmlReader.getReleases(files, (err, data) => {
  console.log(data[0].tracks);
});
