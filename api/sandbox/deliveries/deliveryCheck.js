require('dotenv').config();
require('../models/db');
const CwrDelivery = require('../models/cwrDelivery');
const Work = require('../models/work');

// Koze - 61648ce89108cf001ee033e8
CwrDelivery.findById('63cff9e6bb0f54b7d3d01923', (err, cwrDelivery) => {
  cwrDelivery.export({ id: '63cff9e6bb0f54b7d3d01923', clientId: cwrDelivery.clientId, email: 'tom.allen@metable.co' }, (err) => {
    console.log(err);
    console.log('complete');
  });
});
