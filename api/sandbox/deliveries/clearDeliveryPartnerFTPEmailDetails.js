/* 
* Find delivery partners and clear out the email details
* Find delivery partners and clear out the ftp details
*
*/
require('dotenv').config();
require('../../models/db');
const async = require('async');
const DeliveryPartner = require('../../models/deliveryPartner');

/*
* Configure section
*
*/
// const clientIdsFilter = { $in: ['5f8ef7fd6d763b001524c783', '61e85abbf9e0510114187067', '61ba3c19fec82a05ecf1c1fa', '6011be441c0f9a00565b6daa'] };
const filterEmail = { type: 'Email' };
const filterOther = { type: { $ne: 'Email' } };
// configure end

DeliveryPartner.find(filterEmail, (err, deliveryPartners) => {
  let count = 0;
  async.eachLimit(deliveryPartners, 50, (deliveryPartner, cb) => {
    count += 1;
    console.log(`${count}/${deliveryPartners.length} ${deliveryPartner._id} - ${deliveryPartner.notificationEmail}`);
    deliveryPartner.notificationEmail = '';
    DeliveryPartner.findByIdAndUpdate(deliveryPartner._id, { $set: { notificationEmail: deliveryPartner.notificationEmail } }, cb);
  }, () => {
    console.log('Completed deliveryPartner Emails');
  });
});

DeliveryPartner.find(filterOther, (err, deliveryPartners) => {
  let count = 0;
  async.eachLimit(deliveryPartners, 50, (deliveryPartner, cb) => {
    count += 1;
    console.log(`${count}/${deliveryPartners.length} ${deliveryPartner._id} - ${deliveryPartner.ftpHost} - ${deliveryPartner.ftpUsername} - ${deliveryPartner.ftpPassword} - ${deliveryPartner.ftpRootDir} - ${deliveryPartner.ftpPort}`);
    deliveryPartner.ftpHost = '';
    deliveryPartner.ftpUsername = '';
    deliveryPartner.ftpPassword = '';
    deliveryPartner.ftpRootDir = '';
    deliveryPartner.ftpPort = '';
    DeliveryPartner.findByIdAndUpdate(deliveryPartner._id, { $set: {
      ftpHost: deliveryPartner.ftpHost,
      ftpUsername: deliveryPartner.ftpUsername,
      ftpPassword: deliveryPartner.ftpPassword,
      ftpRootDir: deliveryPartner.ftpRootDir,
      ftpPort: deliveryPartner.ftpPort,
    } }, cb);
  }, () => {
    console.log('Completed deliveryPartner FTP');
  });
});
