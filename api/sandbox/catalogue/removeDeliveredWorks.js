require('dotenv').config();
require('../models/db');
const { ObjectId } = require('mongodb');
const DeliveredWork = require('../models/deliveredWork');

DeliveredWork.deleteOne({ clientId: { $in: ['5f8ef7fd6d763b001524c783', '61e85abbf9e0510114187067', '61ba3c19fec82a05ecf1c1fa', '6011be441c0f9a00565b6daa'] } }, (err, count) => {
  console.log(count);
});
