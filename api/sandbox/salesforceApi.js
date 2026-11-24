const Salesforce = require('../libs/salesforce');

Salesforce.submit('tomallen4000@gmail.com', 'Toms Cool Publisher', '1', 'Publisher', (err) => {
  console.log(err);
  console.log('DONE');
});