require('dotenv').config();
require('../../models/db');
const User = require('../../models/user');

const clientId = '63ee0cf68438b53dee6462e9';
const email = 'api.account@downtownmusic.com';
const rights = {};
rights[clientId] = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true };

const user = new User({ email, clientIds: [clientId], rights });
user.save().then((savedUser) => {
  console.log(savedUser);
});
