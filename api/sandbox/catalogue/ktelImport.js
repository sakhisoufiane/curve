require('dotenv').config();
require('../models/db');
const Track = require('../models/track');
const appRootDir = require('app-root-dir').get();
const async = require('async');

const curveUser = { id: '5a300f35e2269250538bc9ed',
  type: 'client',
  internal: true,
  clientId: '5e7e538cafb71914a5e9e06c',
  iat: 1592238274,
  exp: 1592324674 };

const files = [{ path: `${appRootDir}/ktel/1.xlsx` }, { path: `${appRootDir}/ktel/2.xlsx` }, { path: `${appRootDir}/ktel/3.xlsx` }, { path: `${appRootDir}/ktel/4.xlsx` }, { path: `${appRootDir}/ktel/5.xlsx` }];

async.eachSeries(files, (file, cb) => {
  Track.importFromExcel(file, curveUser, cb);
}, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Complete');
  }
});
