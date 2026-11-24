require('dotenv').config();
const Hubspot = require('../libs/hubspot');

Hubspot.submit('tom+6@curveroyaltysystems.com', 'TESTSTESTS', '1', 'Publisher', (err, res) => {
  console.log(res);
});