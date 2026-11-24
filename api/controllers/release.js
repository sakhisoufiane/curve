/* eslint-disable no-unused-expressions */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-lonely-if */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { eachSeries } = require('async');
const { ObjectId } = require('mongodb');
const Release = require('../models/release');
const Payee = require('../models/payee');

const ReleaseController = this;

ReleaseController.addBulkAliases = async function (req) {
  const { curveUser, body } = req;
  const failed = [];
  const succeeded = [];

  if (!body.aliases) { return { status: 400, response: { message: 'Aliases are required to be passed' } }; }

  // Get Release IDs from passed aliases
  const releaseIds = Object.keys(body.aliases).map((id) => new ObjectId(id));
  // Find Releases
  const foundReleases = await Release.find({ clientId: curveUser.clientId, _id: { $in: releaseIds } });

  if (!foundReleases) {
    return { status: 400, response: { message: `Could not find Release(s) with ${releaseIds}` } };
  }

  await eachSeries(foundReleases, async (release) => {
    // When passed an array, concat it with the current values
    if (body.aliases[release._id.toString()] && Array.isArray(body.aliases[release._id.toString()])) {
      release.aliases = release.aliases.concat(body.aliases[release._id.toString()]);
    } else if (body.aliases[release._id.toString()]) {
      // When just a string, add it to the aliases
      release.aliases.push(body.aliases[release._id.toString()]);
      // Update last modified by
      release.lastModifiedBy = curveUser.id;
    }
    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
      // Save Release
      try {
        const savedRelease = await release.save();
        succeeded.push(savedRelease._id);
      } catch (saveErr) {
        logger.error(saveErr);
        failed.push(release._id);
      }
    }
  });
  const response = { succeeded, failed };

  return { status: 200, response };
};

module.exports = ReleaseController;
