require('dotenv').config();
require('../models/db');
const jwt = require('jsonwebtoken');
const config = require('../config.json');
const User = require('../models/user');
const Client  = require('../models/client');

// This will generate a jwt token that can then be manually added to the browser cookies.

const clientId = ''; // Client ID you're trying to connect to
const userId = ''; // User ID you're trying to connect as


const getToken = async () => {
User.findById(userId, (err, user) => {
    // Find client
    Client.findById(clientId, async (err, client) => {
        const adminType = await user.clientAdminType(user.clientId);
        // If user is a parent, get all clients under the parent and add them to the user's rights
        if (user.parentId) {
          const clients = await Client.find({ parentId: user.parentId }).select('_id');
          clients.forEach((client) => {
            user.rights[client._id.toString()] = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true };
          });
        }
        // Create token for response
        jwt.sign(
          {
            id: userId,
            type: 'client',
            internal: user.internal,
            superInternal: user.superInternal,
            parentId: user.parentId,
            clientId,
            // Only Set Rights for the currently logged in client
            // If internal user, give Edit rights
            rights: user.internal && !user.rights?.[req?.body?.roleId] // Only default to none admin edit rights for internal, when user has not specified any client rights
              ? { [clientId]: { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit' } }
              : { [clientId]: user.rights[clientId] },
            lockedForNonPayment: client.lockedForNonPayment,
            adminType,
          },
          process.env.jsonSecretToken,
          { expiresIn: 86400 },
          (err, token) => {
            console.log({token})
          },
        );
    });
  });
}


getToken();