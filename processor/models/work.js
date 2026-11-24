/* eslint-disable no-continue */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { invert, uniqBy } = require('lodash');

const { Work: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const { SocietyCodes, WorkPreSave, WorkPostSave } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('./client');
const DeliveredWork = require('./deliveredWork');
const Composer = require('./composer');
const Publisher = require('./publisher');
const TerritoryGroup = require('./territoryGroup');
const Track = require('./track');

const societyCodesInverted = invert(SocietyCodes.listCodes);

const workSchema = schema;

workSchema.plugin(mongoosePaginate);

// Important: this must use function syntax, not an arrow function (so it can access the current work)
workSchema.pre('save', async function () {
  try {
    await WorkPreSave.preSave({ work: this, Work, Client, DeliveredWork, Composer, Publisher, TerritoryGroup });
  } catch (err) {
    logger.error('Error in Work pre-save hook:', err);
    throw err;
  }
});

// Important: this must use function syntax, not an arrow function (so it can access the current work)
workSchema.post('save', async function () {
  try {
    await WorkPostSave.postSave({
      work: this,
      Work,
      Client,
      Track,
      Composer,
      Publisher,
      TerritoryGroup,
    });
  } catch (err) {
    logger.error('Error in Work post-save hook:', err);
  }
});

/**
 * * Sums all salesReturnsRights and adds them to work.totalParticipation
 *
 * @method
 */
workSchema.methods.calculateTotalParticipation = function () {
  const work = this;
  // Reset participation to 0
  work.totalParticipation = 0;
  if (work.salesReturnsRights) {
    // Loop through rights
    work.salesReturnsRights.forEach((line) => {
      let percentage = 0;
      if (line.percentage) {
        // Round to 4 decimal places
        percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
      }
      work.totalParticipation += percentage;
    });
  }
  // Round final number to 4 decimal places
  work.totalParticipation = Math.round((work.totalParticipation + Number.EPSILON) * 10000) / 10000;
  return work.totalParticipation;
};

/**
  * Add's an acknowledgement to a Work's societyIdentifiers.
  *
  * Calls callback(errors) with an [error] if it occurs.
  *
  * @method
  * @param {object} acknowledgement - Acknowledgement to add.
  * @param {boolean} receivingParty - The receiving party (society).
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.updateWithAcknowledgement = async function (clientId, acknowledgement, receivingParty, callback) {
  const work = this;
  if (acknowledgement.partnerId && acknowledgement.partnerId !== '00000000000') {
    work.societyIdentifiers.push({ society: receivingParty, identifier: acknowledgement.partnerId });
    if ((!work.tunecode || work.tunecode === '') && (receivingParty === 'PRS' || receivingParty === 'MCPS')) { work.tunecode = acknowledgement.partnerId; }
  }

  // Add valid Society Identifiers included in the ACK file (if not already defined)
  const validIdentifiers = (acknowledgement.societyIdentifiers ?? []).filter((si) => si.identifierType === 'W' && si.validity === 'Y');

  if (validIdentifiers.length > 0) {
    if (!work.societyIdentifiers.length) work.societyIdentifiers = [];
    let tunecode = null;

    for (const identifier of validIdentifiers) {
      const societyCode = societyCodesInverted[identifier.societyCode];
      if (!tunecode && (societyCode === 'PRS' || societyCode === 'MCPS')) {
        tunecode = identifier.workIdentifier;
      }
      const alreadyAdded = work.societyIdentifiers.find((si) => si.society + si.identifier === societyCode + identifier.fullIdentifier);
      if (alreadyAdded) continue;
      work.societyIdentifiers.push({
        society: societyCode,
        identifier: identifier.workIdentifier,
      });
    }

    // Set tunecode if included from matching society
    if ((!work.tunecode || work.tunecode === '') && tunecode) work.tunecode = tunecode;
  }

  // Flush through any duplicate identifiers
  work.societyIdentifiers = work.uniqueSocietyIdentifiers();

  const set = { $set: { tunecode: work.tunecode, societyIdentifiers: work.societyIdentifiers } };
  // check works for ISWC
  if (acknowledgement?.iswc) {
    Work.find({ _id: { $ne: work._id }, clientId, iswc: acknowledgement.iswc })
      .then((iswcDuplicates) => {
        const errors = [];

        if (iswcDuplicates?.length) {
          errors.push({
            error: 'Duplicate ISWC detected in Acknowledgement file - a report has been emailed to you',
            iswcDuplicates,
            work,
          });
        } else if (work.iswc && work.iswc !== acknowledgement.iswc) {
          errors.push({
            error: 'Conflict detected: Existing ISWC conflicts with Acknowledgement ISWC',
            existingIswc: work.iswc,
            newIswc: acknowledgement.iswc,
            work,
          });
        } else if (!work.iswc) {
          work.iswc = acknowledgement.iswc;
          set.$set.iswc = work.iswc;
        }

        if (errors.length > 0) {
          callback(errors);
        } else {
          Work.findByIdAndUpdate(work._id, set)
            .then(() => {
              callback();
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } else {
    Work.findByIdAndUpdate(work._id, set)
      .then(() => {
        callback();
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
 * Returns an array of the Work's unique society identifiers and assigns it to works.societyIdentifiers.
 *
 * @method
 */
workSchema.methods.uniqueSocietyIdentifiers = function () {
  return uniqBy(this.societyIdentifiers, (value) => value.society + value.identifier);
};
const Work = mongoose.model(name, workSchema);

module.exports = Work;
