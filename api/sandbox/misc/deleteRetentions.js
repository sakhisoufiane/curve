require('dotenv').config();
require('../models/db');
const { ObjectId } = require('mongodb');
const McpsRetention = require('../models/mcpsRetention');

const ids = ["61e5741041fd8301a4019a99", "61e5741041fd8301a4019aa5", "61e5741041fd8301a4019aab", "61e5741041fd8301a4019aa9", "61e5741041fd8301a4019aa3", "61e5741041fd8301a4019ab5", "61e5741041fd8301a4019aad", "61e5741041fd8301a4019aaf", "61e5741041fd8301a4019ab3", "61e5741041fd8301a4019ab9", "600886c2e21fbb0ef4406be5", "600886c2e21fbb0ef4406be7", "600886c2e21fbb0ef4406bda", "600886c2e21fbb0ef4406bc0", "600886c2e21fbb0ef4406be4", "600886c2e21fbb0ef4406bbf", "600886c2e21fbb0ef4406bce", "6008b2f3a3d63a0edd03bc0c", "6008b2f3a3d63a0edd03bc22", "6008b2f3a3d63a0edd03bc16", "6008b2f3a3d63a0edd03bc25", "6008b2f3a3d63a0edd03bc04", "6008b2f3a3d63a0edd03bc26", "6008b2f3a3d63a0edd03bc27", "6008b2f3a3d63a0edd03bc18", "6008b2f3a3d63a0edd03bc23", "6008b2f3a3d63a0edd03bc05", "6008b2f3a3d63a0edd03bc20", "6008b2f3a3d63a0edd03bc1f", "6008b2f3a3d63a0edd03bc29", "6008b2f3a3d63a0edd03bc09", "6008b2f3a3d63a0edd03bc15", "6008b2f3a3d63a0edd03bc1b", "6008b2f3a3d63a0edd03bc1d", "6008b2f3a3d63a0edd03bc1e", "6008b2f3a3d63a0edd03bc12", "6008b2f3a3d63a0edd03bc1c", "6008b2f3a3d63a0edd03bc0a", "6008b2f3a3d63a0edd03bc21", "6008b2f3a3d63a0edd03bc07", "6008b2f3a3d63a0edd03bc08", "6008b2f3a3d63a0edd03bc13", "6008b2f3a3d63a0edd03bc24", "6008b2f3a3d63a0edd03bc28", "6008b2f3a3d63a0edd03bc14"];

McpsRetention.deleteOne({ _id: { $in: ids.map(id => { return ObjectId(id) }) } }, (err, res) => {
  console.log(res);
});