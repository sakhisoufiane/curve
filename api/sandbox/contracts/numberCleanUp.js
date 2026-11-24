// require('dotenv').config();
// require("../models/db");
const Contract = require('../models/contract');

const output = Contract.cleanUpNumber('5000000');
console.log(output);
