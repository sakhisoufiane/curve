require('dotenv').config();
require('../models/db');
const async = require('async');
const UnmappedWork = require('../models/unmappedWork');

UnmappedWork.find({ clientId: '' });
