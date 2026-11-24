require('../models/db');

const ControlledClause = require('../libs/calculation/release/controlledComposition.js');

const Release = require('../models/release');
const Period = require('../models/period');
const Client = require('../models/client');

Release.findById('62f4217d53e8425398350540', (err, release) => {
  Client.findById(release.clientId, (err, client) => {
    ControlledClause.getControlledCompositionRate(release, new Date(), client, (err, result, trackBreakdown) => {
      console.log(result);
      console.log(trackBreakdown);
      let total = 0;
      Object.keys(trackBreakdown).forEach((trackId) => {
        Object.values(trackBreakdown[trackId]).forEach((license) => {
          total += license.US;
        });
      });
      console.log(total);
    });
  });
});