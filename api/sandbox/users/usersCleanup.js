require('dotenv').config();
require('../models/db');
const async = require('async');
const User = require('../models/user');

User.find({}, (err, users) => {
  async.eachSeries(users, (user, cb) => {
    user.email = user.email.toLowerCase();
    console.log(user.email);
    user.save((err) => {
      cb();
    });
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
