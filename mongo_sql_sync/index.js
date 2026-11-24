require('dotenv').config();
const mongoose = require('@curveroyaltysystems/models/mongoose');
const Client = require('./models/client');
const syncContracts = require('./sync/syncContracts');
const syncTracks = require('./sync/syncTracks');
const syncReleases = require('./sync/syncReleases');
const syncInputSales = require('./sync/syncInputSales');

async function main() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, maxPoolSize: 30, socketTimeoutMS: 360000000, connectTimeoutMS: 360000000, user: process.env.MONGO_USER, pass: process.env.MONGO_PASS });
  console.log('Connected to MongoDB');
  const client = await Client.findOne({ _id: process.env.CURVE_CLIENT });
  if (!client) return console.log('Couldn\'t find clien');
  console.log('Syncing client', client.name);
  await syncContracts();
  await syncTracks();
  await syncReleases();
  await syncInputSales();

  mongoose.disconnect();
  console.log('Done syncing.');
}

main();
