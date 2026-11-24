require('dotenv').config();
require('../models/db');
const async = require('async');
const User = require('../models/user');
const { ObjectId } = require('mongodb');

function runThroughUsers(filter, save) {
  User.aggregate([
    {
        $match : filter
    },
    { 
        $unwind : "$clientIds"
    }, 
    { 
        $group : {
            _id : {
                dup : "$clientIds", 
                id : "$_id"
            }, 
            count : {
                $sum : 1.0
            }
        }
    }, 
    { 
        $match : {
            count : {
                $gt : 1.0
            }
        }
    }, 
    { 
        $group : {
            _id: "$_id.id"
        }
    }
  ], (err, dupUsers) => {
    async.eachLimit(dupUsers, 10, (dupUser, cb) => {
      User.findById(dupUser._id, (err, user) => {
        const findDuplicates = user.clientIds.filter((item, index) => user.clientIds.indexOf(item) != index)
        console.log(`duplicate for ${user.email} ${[...new Set(findDuplicates)]}`);
        const uniqueClientIds = user?.clientIds.filter((value, index, self) => self.indexOf(value) === index);
        user.clientIds = [...uniqueClientIds];
        if (save && save === 'true') {
          console.log(`duplicate now removed ${user.clientIds}`);
          User.findByIdAndUpdate(user._id, { $set: { clientIds: user.clientIds } }, { timestamps: false }, (err) => {
            cb();
          });
        } else {
          cb();
        };
      });
    }, (e) => {
      console.log(e);
      console.log('Complete');
      process.exit(-1);
    });
  });
}

if (process.argv[2]) {
  const save = (process.argv[3]) ? process.argv[3] : 'false';
  if (process.argv[2] === '--all') {
    console.log('------ processing ALL users ------');
    const filter = {};
    runThroughUsers(filter, save);
  } else {
    runThroughUsers({ _id: ObjectId(process.argv[2]) }, save);
  }
} else {
  console.log('Please provide a user id, or use --all to flush through All users with duplicates')
  process.exit(-1);
}

