require('dotenv').config();
require('../../models/db');
const { ObjectId } = require('mongodb');
const async = require('async');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Contract = require('../../models/contract');

const clientId = '5d971f5a4fe84a50ff8500ca';
let records = ['5efe2280e19edc72104b0322', '5efe2283e19edc72104b0f96', '5efe2288e19edc72104b222c', '5efe2284e19edc72104b118e', '5efe227be19edc72104aef5a', '5efe2289e19edc72104b2366', '5efe2283e19edc72104b109c', '5efe228ce19edc72104b2d92', '5efe2281e19edc72104b08a6', '5efe2284e19edc72104b1372', '5efe2282e19edc72104b0d8a', '5efe227be19edc72104af0f4', '5efe2289e19edc72104b24b8', '5efe2284e19edc72104b1280', '5efe2280e19edc72104b0672', '5efe2287e19edc72104b1dca', '5efe227fe19edc72104b0258', '5efe2283e19edc72104b0e90', '5efe227be19edc72104af2c0', '5efe2281e19edc72104b078c', '5efe2284e19edc72104b13ec', '5efe227ae19edc72104aedc0', '5efe2288e19edc72104b20f2', '5efe227fe19edc72104b018e', '5efe228ce19edc72104b306e', '5efe2287e19edc72104b1d00', '5efe2281e19edc72104b09c0', '5efe228ce19edc72104b2f00', '5efe2287e19edc72104b1c36', '5efe2284e19edc72104b1466'];

records = records.map((id) => ObjectId(id));

Release.updateMany({ _id: { $in: records } }, { $set: { salesReturnsRights: [], costsRights: [] } }, (err, res) => {
  if (err) {
  	console.log(err);
  } else {
  	console.log(res);
  }
});
