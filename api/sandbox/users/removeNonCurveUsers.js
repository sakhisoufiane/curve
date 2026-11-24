require('dotenv').config();
require('../models/db');
const User = require('../models/user');

User.deleteOne({ email: { $not: /@curveroyaltysystems/ } }, (err, count) => {
  console.log(count);
});
