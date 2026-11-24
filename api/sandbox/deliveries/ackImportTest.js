require('dotenv').config();
require('../../models/db');
const Ack = require('../../models/cwrAcknowledgement');

Ack.findById('609a924f32d50e004dcdfd2c', (err, ack) => {
  ack.importAcknowledgementFile({ email: 'tom@curveroyaltysystems.com', id: '5a300f35e2269250538bc9ed', clientId: '5b8d5f1aebe3190f018da121' }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
