require('dotenv').config();
require('../models/db');
const SalesFile = require('../models/salesFile');

SalesFile.find({ clientId: '5d07759340fd0951e9f622bf', targetPeriod: 'Historical' }, (err, salesFiles) => {
  const channels = [];
  const configs = [];
  const territories = [];
  const releases = [];
  const tracks = [];
  salesFiles.forEach((salesFile) => {
    salesFile.invalidFields.distributionChannels.forEach((item) => {
      if (channels.indexOf(item) === -1) { channels.push(item); }
    });
    salesFile.invalidFields.configurations.forEach((item) => {
      if (configs.indexOf(item) === -1) { configs.push(item); }
    });
    salesFile.invalidFields.territories.forEach((item) => {
      if (territories.indexOf(item) === -1) { territories.push(item); }
    });
    salesFile.invalidFields.releases.forEach((item) => {
      if (releases.indexOf(item) === -1) { releases.push(item); }
    });
    salesFile.invalidFields.tracks.forEach((item) => {
      if (tracks.indexOf(item) === -1) { tracks.push(item); }
    });
  });
  console.log('CHANNELS:');
  channels.forEach((item) => { console.log(item); });
  console.log('CONFIGS:');
  configs.forEach((item) => { console.log(item); });
  console.log('TERRITORIES:');
  territories.forEach((item) => { console.log(item); });
  console.log('RELEASES:');
  releases.forEach((item) => { console.log(`${item.title}|${item.catNo}|${item.artist}`); });
  console.log('TRACKS:');
  tracks.forEach((item) => { console.log(`${item.title}|${item.isrc}|${item.artist}`); });
});
