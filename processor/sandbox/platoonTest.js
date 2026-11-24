require('../models/db');
const readline = require('readline');
const fs = require('fs');
const stream = require('stream');
const Period = require('../models/period');

const Platoon = require('../libs/platoon');
const AppRootDir = require('app-root-dir').get();

Period.findById('66505635bf2d3e992f38c5b8', (err, period) => {
  Platoon.downloadSAPOutput(period, {}, (err) => {

  });
});

// const fileLocation = `${AppRootDir}/tmp/platoon-1719865993899-export-000000000000.json`

// const instream = fs.createReadStream(fileLocation);
// const outstream = new stream();
// const rl = readline.createInterface(instream, outstream);

// rl.on('line', function (line) {
//   const jsonData = JSON.parse(line);
//   console.log(jsonData);
// });

// rl.on('error', function (err) {
//   console.log(err);
// });