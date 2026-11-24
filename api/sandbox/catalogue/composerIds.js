require('dotenv').config();
require('../models/db');
const async = require('async');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');

Composer.find({ clientId: '5f8ef7fd6d763b001524c783', partyNo: null }, (err, composers) => {
  console.log(composers.length);
  async.eachSeries(composers, (composer, cb) => {
    composer.save((err) => {
      if (err) {
        console.log('Errored:', composer.name);
      }
      cb();
    });
  }, (err) => {
    console.log('Complete');
  });
});

// DAVID RODRIGUEZ GALAN https://app.curveroyaltysystems.com/#/composers/5fabcbd4e7ad51004b1cd01e/edit
// JOAQUIN SORIA SANCHIZ 5fabcbb3e7ad51004b1ccdc4
// MARIO FUEYO ALVAREZ 5fabcca4e7ad51004b1cd68e
// SERGIO CAMPOMANES FERNANDEZ 5fabd5dde7ad51004b1d03ce
