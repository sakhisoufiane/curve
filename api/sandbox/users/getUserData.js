require('dotenv').config();
require('../../models/db');

const fs = require('fs');
const User = require('../../models/user');
const Client = require('../../models/client');
const mongoose =  require('@curveroyaltysystems/models/mongoose');
const Payee = require('../../models/payee');

const testClientList = ['669f96317f3a2130ca59722b'];
// This is the list of Ids on the ticket:
const clientList = ['60dc42ec5ff6cb00123056d5','617fc7d5d544860028d406e6', '61a0ed5c79cf21001e41a686','61d6ee28b1f8be001fd2f607','622a83e55943b00022565d63', '62c58409fabb820025b5974c', '632b8fc1a10506a2fdb4f965', '6419ba675d94d957c7aeb700', '6439487b8daabb846343445d', '65a6edbab9818f0dcbe5a6ab'];
const userDetails = [];

async function generateReport(clientList) {
  userDetails.push([
    `ID`,
    `Email`,
    `Creation Date`,
    `Last Login Date`,
    `User Type`,
    `Status`,
    `Payee Account`,
    `Catalogue Access Rights`,
    `Contracts Access Rights`,
    `Sales Access Rights`,
    `Periods Access Rights`,
    `Is Admin`,
    `Curve Account`
  ]);
  try {
    // Get the user for each Ids in the list.
    for (const client of clientList) {
      const usersFromClientIds = await User.find({ clientIds: client });
      let clientName = await Client.findById(client).select('name');
      if(!clientName) {
        console.log(`Could not find a Client with Id: ${client}`) 
        clientName = {name: 'Not Found'}
      }
      for (const user of usersFromClientIds) {
        //Separate the Right keys into separate client Ids
        const rightsKeys = user.rights[client];
        // Push an array with the info for each user
        userDetails.push([
          `${user._id}`,
          `${user.email}`,
          `${new Date(user.userCreationDate).toLocaleDateString()}`,
          `${user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}`,
          `${user.adminType || 'N/A'}`,
          `${user.status || 'N/A'}`,
          `${user.payeeId || 'N/A'}`,
          `${rightsKeys?.catalogue || 'N/A'}`,
          `${rightsKeys?.contracts|| 'N/A'}`,
          `${rightsKeys?.sales || 'N/A'}`,
          `${rightsKeys?.periods || 'N/A'}`,
          `${rightsKeys?.admin || 'N/A'}`,
          `${clientName.name}`
        ]);
      }
      const payeesfromClientIds = await Payee.find({ clientId: client });
      for (const payee of payeesfromClientIds) {
        const usersFromPayees = await User.find({ payeeIds: payee._id.toString() });
        for (const user of usersFromPayees) {
          //Separate the Right keys into separate client Ids
          const rightsKeys = user.rights?.[client];
          // Push an array with the info for each user
          userDetails.push([
            `${user._id}`,
            `${user.email}`,
            `${new Date(user.userCreationDate).toLocaleDateString()}`,
            `${user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}`,
            `${user.adminType || 'N/A'}`,
            `${user.status || 'N/A'}`,
            `${payee?.name?.replace(/,/g, ';') || 'N/A'}`,
            `${rightsKeys?.catalogue || 'This account is a Payee'}`,
            `${rightsKeys?.contracts|| 'This account is a Payee'}`,
            `${rightsKeys?.sales || 'This account is a Payee'}`,
            `${rightsKeys?.periods || 'This account is a Payee'}`,
            `${rightsKeys?.admin || 'N/A'}`,
            `${clientName.name}`
          ]);
        }
      }
    }
     
    
    
  } catch (error) {
    console.error('Error generating report:', error);
  }
  
  // Write to file
  fs.writeFileSync('virgin_accounts_report.csv', userDetails.join('\n'));
  console.log('Report generated successfully.');
  // console.log(userDetails);
}

generateReport(clientList);
