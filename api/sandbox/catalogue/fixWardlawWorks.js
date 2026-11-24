require('dotenv').config();
require('../models/db');
const async = require('async');
const { ObjectId } = require('mongodb');
const Work = require('../models/work');

const workIds = ['5fa008b89fc5ce00f1ff79b7', '5fa008b79fc5ce00f1ff79b1', '5fa008b79fc5ce00f1ff79ae', '5fa008b79fc5ce00f1ff79b4', '5fa008b79fc5ce00f1ff79ab', '5fa008b89fc5ce00f1ff79c0', '5fa008b89fc5ce00f1ff79bd', '5fa008b89fc5ce00f1ff79ba', '5fa008b89fc5ce00f1ff79c6', '5fa008b89fc5ce00f1ff79c3', '5fa008b89fc5ce00f1ff79c9', '5fa008b89fc5ce00f1ff79cc', '5fa008b89fc5ce00f1ff79cf', '5fa008b89fc5ce00f1ff79d2', '5fa008b89fc5ce00f1ff79d5', '5fa008b89fc5ce00f1ff79d8', '5fa008b89fc5ce00f1ff79de', '5fa008b89fc5ce00f1ff79db', '5fa008b89fc5ce00f1ff79e4', '5fa008b89fc5ce00f1ff79e1', '5fa008b89fc5ce00f1ff79e7', '5fa008b89fc5ce00f1ff79ea', '5fa008b89fc5ce00f1ff79ed', '5fa008b89fc5ce00f1ff79f0', '5fa008b89fc5ce00f1ff79f3', '5fa008b89fc5ce00f1ff79f6', '5fa008b89fc5ce00f1ff79fc', '5fa008b89fc5ce00f1ff79f9', '5fa008b89fc5ce00f1ff79ff', '5fa008b99fc5ce00f1ff7a02', '5fa008b99fc5ce00f1ff7a05', '5fa008b99fc5ce00f1ff7a08', '5fa008b99fc5ce00f1ff7a0b', '5fa008b99fc5ce00f1ff7a0e', '5fa008b99fc5ce00f1ff7a12', '5fa008b99fc5ce00f1ff7a15', '5fa008b99fc5ce00f1ff7a18', '5fa008b99fc5ce00f1ff7a1b', '5fa008b99fc5ce00f1ff7a21', '5fa008b99fc5ce00f1ff7a1e', '5fa008b99fc5ce00f1ff7a24', '5fa008b99fc5ce00f1ff7a27', '5fa008b99fc5ce00f1ff7a2a', '5fa008b99fc5ce00f1ff7a2d', '5fa008b99fc5ce00f1ff7a33', '5fa008b99fc5ce00f1ff7a30', '5fa008b99fc5ce00f1ff7a36', '5fa008b99fc5ce00f1ff7a39', '5fa008b99fc5ce00f1ff7a3c', '5fa008b99fc5ce00f1ff7a3f', '5fa008b99fc5ce00f1ff7a42', '5fa008b99fc5ce00f1ff7a45', '5fa008b99fc5ce00f1ff7a48', '5fa008b99fc5ce00f1ff7a4b', '5fa008ba9fc5ce00f1ff7a4e', '5fa008ba9fc5ce00f1ff7a51', '5fa008ba9fc5ce00f1ff7a54', '5fa008ba9fc5ce00f1ff7a57', '5fa008ba9fc5ce00f1ff7a5a', '5fa008ba9fc5ce00f1ff7a5d', '5fa008ba9fc5ce00f1ff7a60', '5fa008ba9fc5ce00f1ff7a63', '5fa008ba9fc5ce00f1ff7a69', '5fa008ba9fc5ce00f1ff7a66', '5fa008ba9fc5ce00f1ff7a6c', '5fa008ba9fc5ce00f1ff7a6f', '5fa008ba9fc5ce00f1ff7a72', '5fa008ba9fc5ce00f1ff7a76', '5fa008ba9fc5ce00f1ff7a7e', '5fa008ba9fc5ce00f1ff7a84', '5fa008ba9fc5ce00f1ff7a81', '5fa008ba9fc5ce00f1ff7a87', '5fa008ba9fc5ce00f1ff7a8a', '5fa008ba9fc5ce00f1ff7a8d', '5fa008ba9fc5ce00f1ff7a91', '5fa008ba9fc5ce00f1ff7a94', '5fa008bb9fc5ce00f1ff7a9d', '5fa008ba9fc5ce00f1ff7a97', '5fa008bb9fc5ce00f1ff7aa1', '5fa008bb9fc5ce00f1ff7aa5', '5fa008bb9fc5ce00f1ff7aac', '5fa008bb9fc5ce00f1ff7ab0', '5fa008bb9fc5ce00f1ff7ab6', '5fa008bb9fc5ce00f1ff7ab3', '5fa008bb9fc5ce00f1ff7ab9', '5fa008bb9fc5ce00f1ff7abc', '5fa008bb9fc5ce00f1ff7ac2', '5fa008bb9fc5ce00f1ff7ac6', '5fa008bb9fc5ce00f1ff7ac9', '5fa008bb9fc5ce00f1ff7acc', '5fa008bb9fc5ce00f1ff7acf', '5fa008bb9fc5ce00f1ff7ad2', '5fa008bb9fc5ce00f1ff7ad5', '5fa008bb9fc5ce00f1ff7ad8', '5fa008bc9fc5ce00f1ff7add', '5fa008bc9fc5ce00f1ff7ae0', '5fa008bc9fc5ce00f1ff7ae3', '5fa008bc9fc5ce00f1ff7ae7', '5fa008bc9fc5ce00f1ff7aea', '5fa008bc9fc5ce00f1ff7aed', '5fa008bc9fc5ce00f1ff7af0', '5fa008bc9fc5ce00f1ff7af3', '5fa008bc9fc5ce00f1ff7af7', '5fa008bc9fc5ce00f1ff7afa', '5fa008bc9fc5ce00f1ff7afd', '5fa008bc9fc5ce00f1ff7b00', '5fa008bc9fc5ce00f1ff7b03', '5fa008bc9fc5ce00f1ff7b06', '5fa008bc9fc5ce00f1ff7b09', '5fa008bc9fc5ce00f1ff7b0c', '5fa008bc9fc5ce00f1ff7b0f', '5fa008bc9fc5ce00f1ff7b12', '5fa008bc9fc5ce00f1ff7b15', '5fa008bc9fc5ce00f1ff7b18', '5fa008bc9fc5ce00f1ff7b1e', '5fa008bc9fc5ce00f1ff7b1b', '5fa008bc9fc5ce00f1ff7b24', '5fa008bc9fc5ce00f1ff7b21', '5fa008bc9fc5ce00f1ff7b27', '5fa008bd9fc5ce00f1ff7b2a', '5fa008bd9fc5ce00f1ff7b2d', '5fa008bd9fc5ce00f1ff7b30', '5fa008bd9fc5ce00f1ff7b36', '5fa008bd9fc5ce00f1ff7b33', '5fa008bd9fc5ce00f1ff7b3c', '5fa008bd9fc5ce00f1ff7b39'];

Work.find({ _id: { $in: workIds.map((id) => ObjectId(id)) } }, (err, works) => {
  async.eachSeries(works, (work, cb) => {
    // delete work.deliveries["6093d05c5e75c30025c4d718"];
    if (work.tunecode && work.tunecode.length === '00054712423'.length) {
      work.tunecode = null;
    }

    Work.findByIdAndUpdate(work._id, { $set: { tunecode: work.tunecode } }, cb);
  }, (err) => {
    console.error(err);
    console.log('Complete');
  });
});
