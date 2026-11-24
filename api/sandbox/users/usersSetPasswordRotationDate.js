/*
 Description: Set password rotation date for all Curve UI users
 Time To Run: 00:00:50:00s (Staging)
 Ticket No: CUR-3970
 Category: Users
 Author: Matt Robins
*/

require('dotenv').config();
require('../../models/db');

const User = require('../../models/user');
const mongoose = require('mongoose');
const async = require('async');

// Start of password rotations
const startDate = '2025-03-01';
let updatedCount = 0;

const getDate = (days, basedOnDate) => {
  const currentDate = basedOnDate ? new Date(basedOnDate) : new Date();
  return new Date(currentDate.setDate(currentDate.getDate() - days));
}

const setPasswordRotationDate = async ({ passwordRotationDate, users }) => {
  console.log('Password Rotation Date:', passwordRotationDate, users?.length);

  await async.eachLimit(users, 50, async (user) => {
    const update = { $set: { passwordRotationDate } };
    await User.findByIdAndUpdate(user._id, update);
    updatedCount++;
  });
};

const initializePasswordRotationDate = async () => {
  try {
    console.log('Starting: Setting password rotation date for users without one');

    // First 100 active users
    const withinTheLastWeek = getDate(7);
    const activeUsers = await User.find({ $or: [{ passwordRotationDate: { $exists: false } }, { passwordRotationDate: null }], authenticationType: 'Email', apiKey: { $exists: false }, lastLogin: { $gte: withinTheLastWeek } }).limit(100);
    console.log(`Found ${activeUsers.length} active users without password rotation date`);
    await setPasswordRotationDate({ passwordRotationDate: getDate(90, startDate), users: activeUsers }); // 100 week 1 - today - 90

    // All other users
    const users = await User.find({ $or: [{ passwordRotationDate: { $exists: false } }, { passwordRotationDate: null }], authenticationType: 'Email', apiKey: { $exists: false } });
    console.log(`Found ${users.length} further users without password rotation date`);
    await setPasswordRotationDate({ passwordRotationDate: getDate(76, startDate), users }); // the rest week 3 - today - 76

    console.log('Update Complete');

    await mongoose.connection.close();
    return { success: true, updatedUsers: updatedCount };
  } catch (error) {
    console.error('Error during password rotation date update:', error.message);
    await mongoose.connection.close();
    throw error;
  }
};

// Execute the function
initializePasswordRotationDate()
  .then(result => {
    console.log(`Operation completed successfully: ${result.updatedUsers} users updated`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Operation failed:', error);
    process.exit(1);
  });
