const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { getPayeesFromReturnsRights } = require('../../../../libs/payees/payees');
const Contract = require('../../../../models/contract');
const Payee = require('../../../../models/payee');
const Track = require('../../../../models/track');
const User = require('../../../../models/user');

const getTrackData = async (track) => {
  try {
    const trackData = {
      id: track._id.toString(),
      alternativeId: track.alternativeId,
      title: track.title,
      artist: track.artist,
      isrc: track.isrc,
      payees: [],
    };

    const payees = await getPayeesFromReturnsRights(track.salesReturnsRights, { withUserEmail: true });
    trackData.payees = payees;

    return {
      success: true,
      track: trackData,
    };
  } catch (error) {
    logger.error(`Error processing track ${track._id}:`, error);
    const partialTrackData = {
      id: track._id.toString(),
      title: track.title || '',
      artist: track.artist || '',
      isrc: track.isrc || '',
      payees: [],
    };

    return {
      success: false,
      errors: [error.message || 'Unknown error'],
      track: partialTrackData,
    };
  }
};

const updateTrack = async ({ clientId, trackId, payees }) => {
  const operations = [];

  try {
    const trackToUpdate = await Track.findOne({ _id: trackId, clientId }).exec();

    if (!trackToUpdate) {
      throw new Error(`Track with id: ${trackId} not found.`);
    }

    const originalTrack = JSON.parse(JSON.stringify(trackToUpdate));

    const splits = await getSplitsAndUpdatePayees(clientId, payees, operations);

    if (!areSplitsTheSame(trackToUpdate.salesReturnsRights, splits)) {
      trackToUpdate.salesReturnsRights = splits;
      operations.push({ model: Track, document: trackToUpdate, action: 'restore', originalState: originalTrack });

      await trackToUpdate.save();
    }

    return {
      id: trackToUpdate._id.toString(),
      title: trackToUpdate.title,
      artist: trackToUpdate.artist || '',
      isrc: trackToUpdate.isrc,
      alternativeId: trackToUpdate.alternativeId || '',
      payees,
    };
  } catch (error) {
    await rollbackTrackUpdate(operations);
    logger.error(`Error updating track ${trackId}:`, error);
    throw new Error(`Updating track data failed: ${error.message}`);
  }
};

const getSplitsAndUpdatePayees = async (clientId, payees, operations) => {
  const splits = await Promise.all(payees.map(async (payeeData) => {
    const payee = await Payee.findOne({ clientId, name: payeeData.name }).lean().exec();

    let contract;

    if (!payee) {
      contract = await createPayeeWithUserAndContract({
        clientId,
        name: payeeData.name,
        email: payeeData.email,
        operations,
      });
    } else {
      contract = await Contract.findOne({
        clientId,
        'payees.payeeId': payee._id.toString(),
      }).lean().exec();

      if (!contract) {
        throw new Error(`Contract not found for payee: ${payeeData.name}`);
      }
    }

    return {
      contractId: contract._id.toString(),
      percentage: payeeData.percentage,
    };
  }));

  return splits;
};

const createPayeeWithUserAndContract = async ({ clientId, name, email, operations }) => {
  try {
    const newPayee = new Payee({
      clientId,
      name,
      email,
    });

    await newPayee.save();
    operations.push({ model: Payee, document: newPayee, action: 'delete' });

    const newContract = new Contract({
      payees: [{ payeeId: newPayee._id.toString(), percentage: 100 }],
      clientId,
      name,
      contractType: 'Artist',
      type: 'Royalty',
      active: true,
      payeeBalanceCondition: 'Never',
      accountingPeriod: 'Monthly',
      salesTerms: [{
        territory: 'WW',
        catType: 'All',
        catalogueGroup: 'All',
        channel: 'All',
        configuration: 'All',
        priceCategory: 'All',
        source: 'All',
        type: 'Net Receipts',
        rate: 100,
      }],
    });

    await newContract.save();
    operations.push({ model: Contract, document: newContract, action: 'delete' });

    const existingUser = await User.findOne({ email }).exec();

    if (existingUser) {
      logger.info(`User with the provided payee email: ${email} already exists. Adding payee: ${name}, ${email} to user: ${existingUser._id.toString()}`);
      const originalUserState = JSON.parse(JSON.stringify(existingUser));

      existingUser.payeeIds.push(newPayee._id.toString());
      await existingUser.save();
      operations.push({ model: User, document: existingUser, action: 'restore', originalState: originalUserState });
    } else {
      const newUser = new User({
        email,
        payeeIds: [newPayee._id.toString()],
        clientId,
      });

      await newUser.save();
      operations.push({ model: User, document: newUser, action: 'delete' });
    }

    return newContract;
  } catch (error) {
    logger.error('Error creating payee with user and contract:', error);
    throw error;
  }
};

const rollbackTrackUpdate = async (operations) => {
  const rollbackOperations = operations.reverse().map(async (operation) => {
    try {
      if (operation.action === 'delete') {
        await operation.model.deleteOne({ _id: operation.document._id });
        logger.info(`Rolled back ${operation.model.modelName} creation of: ${operation.document._id}`);
      } else if (operation.action === 'restore') {
        await operation.model.updateOne(
          { _id: operation.document._id },
          { $set: operation.originalState },
        );
        logger.info(`Rolled back ${operation.model.modelName} update of: ${operation.document._id}`);
      }
    } catch (rollbackError) {
      logger.error(`Rollback failed for ${operation.model.modelName}:`, rollbackError);
    }
  });
  await Promise.all(rollbackOperations);
};

function areSplitsTheSame(current, updated) {
  if (current.length !== updated.length) {
    return false;
  }

  return current.every((item) => updated.some((updated) => item.contractId === updated.contractId && item.percentage === updated.percentage));
}

module.exports = { getTrackData, updateTrack, rollbackTrackUpdate };
