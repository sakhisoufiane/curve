require('../models/db');
const Client = require('../models/client');
const Track = require('../models/track');
const Release = require('../models/release');

Client.findById('5cdec3a5d3853e3de5c3edec', { name: 1 }, (err, client) => {
  console.time('Starting Mappings');
  client.getMappingsForIngestion((err, mappings) => {
    console.log(mappings.release);
    console.timeEnd('Starting Mappings');
  });
});
