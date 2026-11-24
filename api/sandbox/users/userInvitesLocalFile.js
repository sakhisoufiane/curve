require('dotenv').config();
require('../models/db');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ObjectId } = mongoose.Types;
const xlsx = require('node-xlsx');
const async = require('async');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Payee = require('../models/payee');
const Client = require('../models/client');
const config = require('../config');
const SendEmail = require('../libs/sendEmail');
const { unescapeHtml } = require('../libs/utils');

const clientId = '61e70b5c9ff4560026f677d5';

// read the local xlsx
const localfile = './localFile.xlsx';
const usersFile = xlsx.parse(localfile);
const usersData = usersFile[0].data.slice(2);
const userIds = usersData.map(item => {
 return ObjectId(item[0]);
});

// for testing purposes
const dummyUserIds = [
	ObjectId('63b45a871291d88c05c10fde'),
];

Client.findById(clientId, (err, client) => {
	User.find({ _id: { $in: dummyUserIds } }).exec((err, users) => {
      async.eachSeries(users, (user, userCb) => {
        async.waterfall([
			function (waterfallCb) {
				// Set date
				user.userCreationDate = new Date();
				// Create token
				user.userCreationToken = jwt.sign({ id: user._id, created: user.userCreationDate, invite: true }, process.env.jsonSecretToken, { expiresIn: 604800 });
				// Resave user with tokens set
				user.save((err, savedUser) => {
				// Send user and whether it is newly created
				waterfallCb(err, savedUser);
				});
			},
			function (savedUser, waterfallCb) {
				const options = { customText: unescapeHtml(client.inviteEmailCustomText), supportEmail: client.customSupportEmail, cc: client.ccCommunicationEmail };
				console.log('Sending Invite to:', user.email);
				SendEmail.invite(savedUser.email, null, savedUser.userCreationToken, client.name, options, (err, res) => {
					savedUser.sendings.push({ date: new Date(), email: user.email });
					
					savedUser.save((err) => {
						waterfallCb(err);
					});
				});
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
