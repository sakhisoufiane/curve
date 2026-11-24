require('../models/db');
const { eachLimit } = require('async');
const Payee = require('../models/payee');
const User = require('../models/user');

(async () => {
  let count = 0;
  const payees = await Payee.find({ clientId: '' }).select('_id');

  await eachLimit(payees, 1, async (payee) => {
    count += 1;

    const email = `arjundoel+${count}@gmail.com`;

    const user = new User({
      email: email,
      internal: false,
      payeeIds: [payee._id.toString()],
    });
    

    await user.save();
  });
})();