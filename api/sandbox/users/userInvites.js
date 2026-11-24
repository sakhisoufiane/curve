require('dotenv').config();
require('../models/db');
const async = require('async');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Payee = require('../models/payee');
const Client = require('../models/client');
const config = require('../config');
const SendEmail = require('../libs/sendEmail');
const { unescapeHtml } = require('../libs/utils');

Client.findById('5e14ae220bd36838e0ec0fa4', (err, client) => {
  Payee.find({ clientId: '5e14ae220bd36838e0ec0fa4' }, (err, payees) => {
    const payeeIds = payees.map((payee) => payee._id.toString());
    User.find({ payeeIds: { $in: payeeIds }, password: { $exists: false } }).exec((err, users) => {
      async.eachSeries(users, (user, userCb) => {
        // console.log(user.email);
        async.waterfall([
		      function (waterfallCb) {
		          // Set date
		          user.userCreationDate = new Date();
		          // Create token
		          user.userCreationToken = jwt.sign({ id: user._id, created: user.userCreationDate, invite: true }, process.env.jsonSecretToken, { expiresIn: 604800 });
		          // Resave user with tokens set
		          user.save((err, savedUser) => {
		            // Send user and whether it is newly created
		            waterfallCb(err, savedUser, true);
		          });
		      },
		      function (savedUser, newUser, waterfallCb) {
		        const options = { customText: unescapeHtml(client.inviteEmailCustomText), supportEmail: client.customSupportEmail, cc: client.ccCommunicationEmail };
		        if (newUser) {
		        	console.log('Sending Invite to:', user.email);
		          SendEmail.invite(savedUser.email, null, savedUser.userCreationToken, client.name, options, (err, res) => {
		          	savedUser.sendings.push({ date: new Date(), email: user.email });
                savedUser.save((err) => {
                  waterfallCb(err);
                });
		          });
		        } else {
		          SendEmail.inviteAdditional(savedUser.email, null, client.name, options, (err) => {
		            savedUser.sendings.push({ date: new Date(), email: user.email });
                savedUser.save((err) => {
                  waterfallCb(err);
                });
		          });
		        }
		      },
		    ], userCb);
      }, (err) => {
        if (err) {
          console.log(err);
        }
        console.log('Complete');
      });
    });
  });
});
