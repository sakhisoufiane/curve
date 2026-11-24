require('dotenv').config();
require('../models/db');
const { ObjectId } = require('mongodb');
const async = require('async');
const Track = require('../models/track');
const Release = require('../models/release');
const Contract = require('../models/contract');

const clientId = '5d971f5a4fe84a50ff8500ca';
let records = ['5efe227fe19edc72104b0190', '5efe227fe19edc72104b01f8', '5efe227fe19edc72104b01d0', '5efe227fe19edc72104b0234', '5efe227fe19edc72104b01bc', '5efe227fe19edc72104b021e', '5efe227fe19edc72104b01a7', '5efe227fe19edc72104b020a', '5efe227fe19edc72104b01e2', '5efe227fe19edc72104b0247', '5efe2282e19edc72104b0da2', '5efe2283e19edc72104b0dca', '5efe2283e19edc72104b0e06', '5efe2283e19edc72104b0e2e', '5efe2283e19edc72104b0e6a', '5efe2282e19edc72104b0d8d', '5efe2283e19edc72104b0db9', '5efe2283e19edc72104b0df3', '5efe2283e19edc72104b0e1b', '5efe2283e19edc72104b0e56', '5efe2283e19edc72104b0e7e', '5efe2283e19edc72104b0dde', '5efe2283e19edc72104b0e43', '5efe2288e19edc72104b20f4', '5efe2288e19edc72104b213e', '5efe2288e19edc72104b216e', '5efe2288e19edc72104b21b6', '5efe2288e19edc72104b21e7', '5efe2288e19edc72104b2126', '5efe2288e19edc72104b2156', '5efe2288e19edc72104b219f', '5efe2288e19edc72104b21cf', '5efe2288e19edc72104b2216', '5efe2288e19edc72104b210e', '5efe2288e19edc72104b2186', '5efe2288e19edc72104b21fe', '5efe2283e19edc72104b10a0', '5efe2283e19edc72104b10c9', '5efe2283e19edc72104b1104', '5efe2283e19edc72104b112c', '5efe2284e19edc72104b1168', '5efe2283e19edc72104b10b4', '5efe2283e19edc72104b10f1', '5efe2283e19edc72104b1119', '5efe2284e19edc72104b1154', '5efe2284e19edc72104b117d', '5efe2283e19edc72104b10dd', '5efe2283e19edc72104b1140', '5efe227ae19edc72104aedc2', '5efe227ae19edc72104aee08', '5efe227ae19edc72104aee2c', '5efe227ae19edc72104aee6e', '5efe227be19edc72104aeeb2', '5efe227be19edc72104aeed4', '5efe227be19edc72104aef19', '5efe227ae19edc72104aede5', '5efe227ae19edc72104aee4c', '5efe227ae19edc72104aee90', '5efe227be19edc72104aeef6', '5efe227be19edc72104aef3b', '5efe2289e19edc72104b24ae', '5efe2289e19edc72104b24a3', '5efe228ce19edc72104b2d93', '5efe228ce19edc72104b2dcd', '5efe228ce19edc72104b2de9', '5efe228ce19edc72104b2e22', '5efe228ce19edc72104b2e5a', '5efe228ce19edc72104b2e77', '5efe228ce19edc72104b2ead', '5efe228ce19edc72104b2ee7', '5efe228ce19edc72104b2db2', '5efe228ce19edc72104b2e05', '5efe228ce19edc72104b2e3e', '5efe228ce19edc72104b2e92', '5efe228ce19edc72104b2eca', '5efe2280e19edc72104b068a', '5efe2281e19edc72104b06b3', '5efe2281e19edc72104b06ee', '5efe2281e19edc72104b0716', '5efe2281e19edc72104b0751', '5efe2281e19edc72104b077b', '5efe2280e19edc72104b0675', '5efe2280e19edc72104b069e', '5efe2281e19edc72104b06da', '5efe2281e19edc72104b0702', '5efe2281e19edc72104b073e', '5efe2281e19edc72104b0765', '5efe2281e19edc72104b06c5', '5efe2281e19edc72104b072c', '5efe2284e19edc72104b139e', '5efe2284e19edc72104b138b', '5efe2284e19edc72104b13b2', '5efe2284e19edc72104b13c7', '5efe2284e19edc72104b1374', '5efe2284e19edc72104b13da', '5efe227be19edc72104af2a0', '5efe227be19edc72104af2b0', '5efe227be19edc72104af290', '5efe2287e19edc72104b1c3a', '5efe2287e19edc72104b1c75', '5efe2287e19edc72104b1c9d', '5efe2287e19edc72104b1cda', '5efe2287e19edc72104b1c4e', '5efe2287e19edc72104b1cb2', '5efe2287e19edc72104b1c62', '5efe2287e19edc72104b1cc6', '5efe2287e19edc72104b1c8a', '5efe2287e19edc72104b1cee', '5efe2281e19edc72104b09d0', '5efe2281e19edc72104b09e8', '5efe2281e19edc72104b09c2', '5efe2281e19edc72104b09dc', '5efe2281e19edc72104b09f4'];

records = records.map((id) => ObjectId(id));

Track.updateMany({ _id: { $in: records } }, { $set: { salesReturnsRights: [], costsRights: [] } }, (err, res) => {
  if (err) {
  	console.log(err);
  } else {
  	console.log(res);
  }
});
