require('dotenv').config();
require('../../models/db');
const SalesFile = require('../../models/salesFile');

SalesFile.find({ clientId: '5ec2ad7f5608267aa5d07d67', partitionNo: 12 }, (err, salesFiles) => {
  const ids = salesFiles.map((sf) => sf._id.toString());
  console.log(ids);
});
