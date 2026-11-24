require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const User = require('../../models/user');
const Payee = require('../../models/payee');
const xlsx = require('xlsx');

const findUsersMFAStatus = async () => {
  try {
    const clientNames = [
      'BackTwoBack, LLC',
      'Frequency Publishing B.V.',
      'Frequency Music B.V.',
      'Young Poet Records',
      'Cloudkid',
      'Cloudkid Publishing',
      'Perfect Havoc',
      'Involved Productions',
      'Involved Publishing',
      'Involved Distribution',
    ];

    const clients = await Client.find({ name: { $in: clientNames } }, '_id name').lean();
    logger.info(clients);
    
    const data = [['User Type', 'Client Name', 'Email', 'Client ID', 'MFA']];
    
    for (const client of clients) {
        logger.info(`checking ${client.name}`)
      const users = await User.find({ 
        $or: [
          { clientId: client._id.toString() },
          { clientIds: client._id.toString() },
          { adminClientIds: client._id.toString() }
        ]
      }, 'email clientId clientIds adminClientIds multiFactorAuthentication').lean();
      
      users.forEach(user => {
        let userType = 'Standard User';
        if (user.adminClientIds?.includes(client._id.toString())) {
          userType = 'Admin';
        } else if (user.clientId === client._id.toString()) {
          userType = 'Client ID User';
        } else if (user.clientIds?.includes(client._id.toString())) {
          userType = 'Client IDs User';
        }
        data.push([userType, client.name, user.email, user.clientId, user.multiFactorAuthentication]);
      });
      
      const payees = await Payee.find({ clientId: client._id }, '_id name').lean();
      
      for (const payee of payees) {
        const payeeUsers = await User.find({ $or: [ { payeeId: payee._id.toString() }, { payeeIds: payee._id.toString() } ] }, 'email clientId multiFactorAuthentication').lean();
        
        payeeUsers.forEach(user => {
          data.push(['Payee User', client.name, user.email, user.clientId, user.multiFactorAuthentication]);
        });
      }
    }
    
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Users MFA');
    xlsx.writeFile(workbook, '/tmp/users_mfa_status.xlsx');
    
    console.log('Excel file created: users_mfa_status.xlsx');
  } catch (error) {
    logger.error('Error retrieving users MFA status:', error);
  }
};

findUsersMFAStatus();
