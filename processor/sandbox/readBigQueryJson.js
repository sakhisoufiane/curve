const fs = require('fs');
const appRootDir = require('app-root-dir').get();

const filename = '202005101618007780.json';

fs.readFile(`${appRootDir}/tmp/${filename}`, 'utf8', (err, data) => {
  data = data.split('\r\n');
  // data = JSON.parse(data);
  let amazonCount = 0;
  data.forEach((line) => {
  // console.log(line);
    try {
      line = JSON.parse(line);
    } catch (er) {
      console.log(er);
      console.log(line);
    }
    if (line.source === 'Amazon Unlimited') {
      amazonCount += line.units;
    }
  });
  console.log('AmazonCount:', amazonCount);
});
