require('dotenv').config();
require('../models/db');
const async = require('async');
const User = require('../models/user');
const { ObjectId } = require('mongodb');

function runThroughUsers(filter, save) {
  User.find(filter, (err, users) => {
    async.eachLimit(users, 10, (user, cb) => {
      let idsToRemove = [];
      user?.adminClientIds.forEach((id) => {
        if (!user?.rights?.[id] || user?.rights?.[id].admin !== "true") { 
          console.log(`No admin rights - remove ${id} from ${user.email}`);
          idsToRemove.push(id);
        }
      });
      if (idsToRemove.length > 0) {
        const idsToRemoveSet = new Set(idsToRemove);
        const newAdminClientIds = user.adminClientIds.filter((id) => { return !idsToRemoveSet.has(id); });
        user.adminClientIds = newAdminClientIds;
        console.log(user.adminClientIds);
      }
      if (save && save === 'true') {
        User.findByIdAndUpdate(user._id, { $set: { adminClientIds: user.adminClientIds } }, { timestamps: false }, (err) => {
          cb();
        });
      } else {
        cb();
      };
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
    const objectId = ObjectId(process.argv[2]);
    runThroughUsers({ _id: objectId }, save);
  }
} else {
  console.log('Please provide a user id, or use --all to flush through All users with non Admin rights')
  process.exit(-1);
}

