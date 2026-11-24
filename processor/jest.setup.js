const mongoose = require('@curveroyaltysystems/models/mongoose');
const console = require('console');

// Prevent Jest from grouping logging
global.console = console;

beforeAll(async () => {
  const uri = process.env.JEST_MONGO_URI || 'mongodb://127.0.0.1:27017/jest-tests';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
});
