require('../models/db');
const Period = require('../models/period');

Period.findById('5e84d96c40e0300b542c7f06', (err, period) => {
  const trackId = '5e7dd72b01f9827da13ad8fc';
  console.log(trackId, period.usedTrackIds.includes(trackId));
});
