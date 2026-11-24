
require('dotenv').config();
require('../../models/db');
const User = require('../../models/user');

if (process.env.DB_URL !== "devprodcopy.xseuw.mongodb.net") {
  console.error('This script is intended for cleaning non internal users in the mongo project db only. Please check your env vars');
  process.exit(1);
}

User.deleteMany({internal: {$exists: false}}, (err, count) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`${count.deletedCount} users deleted`);
  }
  process.exit(0);
});
