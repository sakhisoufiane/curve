require('dotenv').config();
require('../models/db');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');

CwrAcknowledgement.findById('6094ef7eec923e0056237387', (err, cwrAck) => {
  cwrAck.importAcknowledgementFile({ clientId: cwrAck.clientId, email: 'tom.allen@metable.co' }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
