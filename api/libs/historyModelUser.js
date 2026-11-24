const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const User = require('../models/user');

module.exports = {
  addModifiedBy: (patches, callback) => {
    if (patches) {
      // Loop through patches
      async.map(patches, (patch, cb) => {
        // Copy to new object
        const newPatch = JSON.parse(JSON.stringify(patch));
        // Loop through ops on patch
        async.each(newPatch.ops, (op, opCb) => {
          // Check if lastModifiedBy exists
          if (op.path === '/lastModifiedBy') {
            // Find user by ID
            User.findById(op.value)
              .then((user) => {
                if (user) {
                  // When user exists, update author
                  newPatch.author = { id: user._id, email: user.email };
                }
                opCb();
              })
              .catch((err) => {
                logger.error(err);
                opCb(err);
              });
          } else {
            opCb();
          }
        }, (err) => {
          cb(err, newPatch);
        });
      }, callback);
    } else {
      callback(null, patches);
    }
  },
};
