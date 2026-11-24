require('../models/db');

const Payee = require('../models/payee');
const Client = require('../models/client');

// **** PAYEE ****

// Payee.findByIdAndUpdate('6228c82a0fd093001f8728fc', { $set: { notes: 'test notes ', contactEmail: 'findByIdAndUpdate email' } }, (err, result) => {
//   console.log('err, result: ', err, result);
//   process.exit(-1);
// });

// *** returnDocument: 'after'
Payee.findOneAndUpdate({ name: 'John Lennon', clientId: '6228c60de17e7700279c6601' }, { $set: { notes: 'test notes 22', paymentEmail: 'findByIdAndUpdate email' } }, { returnDocument: 'after' }, (err, result) => {
  console.log('err, result: ', err, result);
  process.exit(-1);
});

// *** returnDocument: 'after' - with projection
// Payee.findOneAndUpdate({ name: 'John Lennon', clientId: '6228c60de17e7700279c6601' }, { $set: { notes: 'test notes 22', paymentEmail: 'findByIdAndUpdate email' } }, { returnDocument: 'after', projection: 'paymentEmail clientId' }, (err, result) => {
//   console.log('err, result: ', err, result);
//   process.exit(-1);
// });

// **** CLIENT ****

// Client.findByIdAndUpdate('6228c60de17e7700279c6601', { $set: { companyName: 'test companyName ', ftpPassword: 'findByIdAndUpdate pw' } }, (err, result) => {
//   console.log('err, result: ', err, result);
//   process.exit(-1);
// });

// *** returnDocument: 'after'
// Client.findByIdAndUpdate('6228c60de17e7700279c6601', { $set: { companyName: 'test companyName2', ftpPassword: 'findByIdAndUpdate pw2' } }, { returnDocument: 'after' }, (err, result) => {
//   console.log('err, result: ', err, result);
//   process.exit(-1);
// });



// Payee.findOne({ name: 'John Lennon', clientId: '6228c60de17e7700279c6601' }, 'contactEmail', (err, result) => {
//   console.log('err, result: ', err, result);
//   process.exit(-1);
// });
