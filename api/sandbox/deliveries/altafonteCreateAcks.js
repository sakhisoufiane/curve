require('dotenv').config();
require('../../models/db');
const CwrAcknowledgement = require('../../models/cwrAcknowledgement');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const async = require('async');
const fileManager = require('../libs/fileManager');

const dir = `${appRootDir}/tmp/2021-SAYCO/`;

fs.readdir(dir, (err, files) => {
  async.eachSeries(files, (file, cb) => {
    if (file !== '.DS_Store') {
      const cwrAck = new CwrAcknowledgement({ name: file, clientId: '5f8ef7fd6d763b001524c783', source: 'SAYCO' });
      cwrAck.save((err, cwrAck) => {
        const fileLocation = `cwrAcknowledgements/${cwrAck._id.toString()}/${file}`;
        fileManager.uploadToS3(fileLocation, dir + file, () => {
          cwrAck.file = fileLocation;
          cwrAck.save((err) => {
            cwrAck.importAcknowledgementFile({ clientId: '5f8ef7fd6d763b001524c783', id: '5a300f35e2269250538bc9ed' }, () => {
              cb();
            });
          });
        });
      });
    } else {
      cb();
    }
  }, (err) => {
    console.log('Complete');
  });
});
