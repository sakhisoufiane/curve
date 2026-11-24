require('dotenv').config();
require('../models/db');
const async = require('async');
const DeliveredWork = require('../models/deliveredWork');

// Function to update documents in the 'deliveredWork' collection
async function updateDeliveredWorkStatus() {
  try {
    
    // Update documents where clientId is '1234' and status is 'Pending'
    const filter = { clientId: '6011be441c0f9a00565b6daa', clientType: 'Publisher' };
    const update = { $set: { createdAt: new Date('$deliveryDate') } };

    // Use updateMany to update multiple documents
    const result = await DeliveredWork.updateMany(filter, update, { timestamps: true });

    console.log(`${result.modifiedCount} documents updated.${JSON.stringify(result)}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    console.log(` documents updated.`);
    process.exit(-1); 
  }
}

// Call the function to perform the update
updateDeliveredWorkStatus();
