/* eslint-disable no-await-in-loop */
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const SubClient = require('../../models/subClient');
const Payee = require('../../models/payee');
const Contract = require('../../models/contract');
const User = require('../../models/user');
const Track = require('../../models/track');
const Release = require('../../models/release');
const { throwError } = require('../../libs/errors');

const validateClient = async (clientId) => {
  if (!clientId || !ObjectId.isValid(clientId)) throwError({ message: 'Valid organisation ID required', code: 403, cause: 'ORG01' });

  const client = await Client.findById(clientId);
  if (!client) throwError({ message: 'Organisation not found', code: 404, cause: 'ORG02' });

  return client;
};

const createSubClient = async ({ curveUser, newSubClient }) => {
  const operations = [];

  try {
    logger.info('subOrg Splits: Starting to create subClient');
    await validateClient(curveUser.clientId);

    if (!newSubClient.name || !newSubClient.salesTerms || !newSubClient.subOrgId) {
      throwError({ message: 'Name, subOrgId and salesTerms are required', code: 400, cause: 'ITEM03' });
    }

    logger.debug(`subOrg Splits: Checking for existing payee with name: ${newSubClient.name}`);
    const existingPayee = await Payee.findOne({ clientId: curveUser.clientId, name: newSubClient.name }).lean().exec();

    if (existingPayee) {
      throwError({ message: 'Payee already exists', code: 400, cause: 'FORB02' });
    }

    logger.debug(`subOrg Splits: Checking for existing subClient with subOrgId: ${newSubClient.subOrgId}`);
    const existingSubClient = await SubClient.findOne({ clientId: curveUser.clientId, subOrgId: newSubClient.subOrgId }).lean().exec();

    if (existingSubClient) {
      throwError({ message: 'SubClient already exists', code: 400, cause: 'FORB02' });
    }

    logger.debug(`subOrg Splits: Creating subClient with name: ${newSubClient.name}`);
    const subClient = new SubClient({
      clientId: curveUser.clientId,
      name: newSubClient.name,
      subOrgId: newSubClient.subOrgId,
    });
    await subClient.save();
    operations.push({ model: SubClient, document: subClient });

    logger.debug(`subOrg Splits: Creating Payee with name: ${newSubClient.name}`);
    const payee = new Payee({
      clientId: curveUser.clientId,
      name: newSubClient.name,
    });
    await payee.save();
    operations.push({ model: Payee, document: payee });

    logger.debug(`subOrg Splits: Creating contract for subClient ID: ${subClient._id}`);
    const contract = new Contract({
      clientId: curveUser.clientId,
      name: newSubClient.name,
      payees: [{ payeeId: payee._id.toString(), percentage: 100 }],
      subClientId: subClient._id.toString(),
      accountingPeriod: 'Monthly',
      salesTerms: [newSubClient.salesTerms],
      isMainSubClientContract: true,
    });
    contract.fromLBAroute = true;
    await contract.save();
    operations.push({ model: Contract, document: contract });

    logger.info(`subOrg Splits: SubClient created successfully with ID: ${subClient._id}`);
    return {
      ...subClient.toObject(),
      payeeId: payee._id.toString(),
      contractId: contract._id.toString(),
    };
  } catch (error) {
    logger.error(`subOrg Splits: Error occurred, rolling back changes: ${error.message}`);
    const rollbackOperations = operations.map((op) => op.model.findByIdAndDelete(op.document._id).exec());
    await Promise.all(rollbackOperations);
    throw error;
  }
};

const createSplitPayee = async ({ curveUser, payeeData }) => {
  const operations = [];

  try {
    logger.info('subOrg Splits: Starting to create split payee');
    await validateClient(curveUser.clientId);

    const { name, email, subOrgId, createUser = true } = payeeData;

    // Validate required fields
    if (!name || !subOrgId) {
      throwError({ message: 'Name and subOrgId are required', code: 400, cause: 'ITEM03' });
    }

    // Email is required only if we're creating a user
    if (createUser && !email) {
      throwError({ message: 'Email is required when creating a user', code: 400, cause: 'ITEM03' });
    }
    logger.debug(`subOrg Splits: Checking for existing payee with name: ${name}`);
    let payeeToUse = await Payee.findOne({ clientId: curveUser.clientId, name }).exec();

    if (createUser) {
      logger.debug(`subOrg Splits: Checking for existing user with email: ${email}`);
      const existingUser = await User.findOne({ email }).exec();

      if (payeeToUse) {
        if (existingUser) {
          if (existingUser.payeeIds?.includes(payeeToUse._id.toString())) {
            logger.debug(`subOrg Splits: Payee already linked to user with email: ${email}`);
          } else {
            throwError({ message: 'Payee not linked to provided user email', code: 409, cause: 'FORB01' });
          }
        } else {
          throwError({ message: 'Payee exists but user does not exist', code: 409, cause: 'FORB01' });
        }
      } else {
      // Create new Payee
        logger.debug(`subOrg Splits: Creating new payee with name: ${name}`);
        payeeToUse = new Payee({ clientId: curveUser.clientId, name, email });
        await payeeToUse.save();
        operations.push({ model: Payee, document: payeeToUse, action: 'delete' });

        if (!existingUser) {
        // Create new User
          logger.debug(`subOrg Splits: Creating new user with email: ${email}`);
          const newUser = await new Promise((resolve, reject) => {
            User.createUser(
              { email, payeeIds: [payeeToUse._id.toString()], clientId: curveUser.clientId },
              (err, user) => {
                if (err) reject(err);
                else resolve(user);
              },
            );
          });
          operations.push({ model: User, document: newUser, action: 'delete' });
        } else {
        // Update existing User
          logger.debug(`subOrg Splits: Updating existing user with payee: ${payeeToUse._id.toString()}`);
          const originalUserState = JSON.parse(JSON.stringify(existingUser));
          operations.push({
            model: User,
            documentId: existingUser._id,
            originalState: originalUserState,
            action: 'restore',
          });
          existingUser.payeeIds.push(payeeToUse._id.toString());
          await existingUser.save();
        }
      }
    } else {
    // Skip user creation/validation and just create payee if it doesn't exist
      if (!payeeToUse) {
        logger.debug(`subOrg Splits: Creating new payee with name: ${name}`);
        payeeToUse = new Payee({
          clientId: curveUser.clientId,
          name,
          email: email || null,
        });
        await payeeToUse.save();
        operations.push({ model: Payee, document: payeeToUse, action: 'delete' });
      }
      logger.debug(`subOrg Splits: Payee created successfully with ID: ${payeeToUse._id}`);
    }

    logger.debug(`subOrg Splits: Finding subClient with subOrgId: ${subOrgId}`);
    const subClient = await SubClient.findOne({ subOrgId });
    if (!subClient) {
      throwError({ message: 'sub client for suborg not found', code: 400, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Finding subClient contract for ID: ${subClient._id}`);
    const subOrgContract = await Contract.findOne({ clientId: curveUser.clientId, subClientId: subClient._id.toString(), isMainSubClientContract: true }).lean().exec();
    if (!subOrgContract) {
      throwError({ message: 'Sub-organisation contract not found', code: 400, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Validating if a contract already exists for payee ID: ${payeeToUse._id} and subClient ID: ${subClient._id}`);
    const existingContract = await Contract.findOne({
      clientId: curveUser.clientId,
      subClientId: subClient._id.toString(),
      'payees.payeeId': payeeToUse._id.toString(),
    }).lean().exec();

    if (existingContract) {
      throwError({ message: 'A contract for this payee and sub-client already exists.', code: 409, cause: 'FORB01' });
    }

    logger.debug(`subOrg Splits: Creating split contract for payee ID: ${payeeToUse._id}`);

    const splitContract = new Contract({
      clientId: curveUser.clientId,
      name: `${name} - ${subClient.name}`,
      payees: [{ payeeId: payeeToUse._id.toString(), percentage: 100 }],
      subClientId: subClient._id.toString(),
      accountingPeriod: 'Monthly',
      salesTerms: [...subOrgContract.salesTerms],
      crossContracts: [{
        condition: 'Always transfer Income',
        process: 'Subtract From',
        contractId: subOrgContract._id.toString(),
        percentage: 100,
      },
      ],
    });
    splitContract.fromLBAroute = true;
    await splitContract.save();
    operations.push({ model: Contract, document: splitContract });
    await payeeToUse.save();
    logger.info(`subOrg Splits: Split payee created successfully with ID: ${payeeToUse._id}`);
    return payeeToUse;
  } catch (error) {
    const rollbackOperations = operations.map(async (op) => {
      if (op.action === 'restore') {
        // Restore original document state
        op.model.updateOne({ _id: op.documentId }, op.originalState).exec();
      } else if (op.action === 'delete') {
        op.model.findByIdAndDelete(op.document._id).exec();
      }
    });
    await Promise.all(rollbackOperations);
    throw error;
  }
};

const linkTrackSplits = async ({ curveUser, linkTrackData }) => {
  const operations = [];

  try {
    const { fugaTrackId, subOrgId } = linkTrackData;

    logger.info(`subOrg Splits: Starting to link track${fugaTrackId}`);
    await validateClient(curveUser.clientId);

    if (!fugaTrackId || !subOrgId) {
      throwError({ message: 'Fuga Track id and subOrgId are required', code: 400, cause: 'ITEM03' });
    }

    logger.debug(`subOrg Splits: Looking up track with fugaTrackId: ${fugaTrackId}`);
    const track = await Track.findOne({ fugaId: fugaTrackId, clientId: curveUser.clientId }).exec();
    const originalTrack = JSON.parse(JSON.stringify(track));
    if (!track) {
      throwError({ message: 'Track not found', code: 404, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Looking up subClient ID with subOrgId: ${subOrgId}`);
    const subClient = await SubClient.findOne({ subOrgId }, '_id').exec();

    if (!subClient) {
      throwError({ message: `SubClient not found for subOrgId: ${subOrgId}`, code: 404, cause: 'ITEM02' });
    }

    const { salesReturnsRights } = track;

    logger.debug(`subOrg Splits: checking if track is already linked: ${fugaTrackId}`);
    const contractIds = salesReturnsRights.map((right) => right.contractId);
    const contracts = await Contract.find({ _id: { $in: contractIds } }).exec();
    const alreadyLinkedMainContract = contracts.find((contract) => contract.isMainSubClientContract);
    if (alreadyLinkedMainContract) {
      if (alreadyLinkedMainContract.subClientId.equals(subClient._id)) {
        return track;
      }
      throwError({
        message: `Track already linked to a subOrg via contract ID: ${alreadyLinkedMainContract._id.toString()}`,
        code: 409,
        cause: 'FORB01',
      });
    }

    logger.debug(`subOrg Splits: Looking up contracts for subClientId: ${subClient._id}`);
    const mainContract = await Contract.findOne({
      subClientId: subClient._id,
      isMainSubClientContract: true,
    }).exec();

    if (!mainContract) {
      throwError({ message: `Main contract not found for subClientId: ${subClient._id}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug('subOrg Splits: Adding main contract to salesReturnsRights');
    track.salesReturnsRights = [{
      contractId: mainContract._id.toString(),
      percentage: 100,
    }];
    operations.push({ model: Track, document: track, action: 'restore', originalState: originalTrack });
    track.fromLBAroute = true;
    await track.save();

    logger.info(`subOrg Splits: Successfully updated track with ID: ${track._id}`);
    return track;
  } catch (error) {
    logger.error(`subOrg Splits: Error occurred, rolling back changes: ${error.message}`);
    const rollbackOperations = operations.map(async (op) => {
      await op.model.updateOne({ _id: op.document._id }, op.originalState).exec();
    });
    await Promise.all(rollbackOperations);
    throw error;
  }
};

const formatTrack = async (track) => {
  const formattedTrack = {
    id: track._id.toString(),
    fugaId: track.fugaId || null,
    isrc: track.isrc,
    title: track.title,
    artist: track.artist || '',
    version: track.version || '',
    duration: track.duration || null,
    releases: [],
    payeeCount: 0,
    contracts: [],
  };

  formattedTrack.contracts = await Promise.all(track.salesReturnsRights.map(async (contract) => {
    const foundContract = await Contract.findById(contract.contractId);
    if (foundContract) {
      const foundPayee = await Payee.findById(foundContract.payees?.[0]?.payeeId);
      if (foundPayee) {
        return {
          payeeId: foundPayee._id.toString(),
          payeeName: foundPayee.name,
          payeeEmail: foundPayee.email,
          percentage: contract.percentage,
          ...(foundContract.isMainSubClientContract ? { isMainSubClientContract: true, salesTermsRate: foundContract.salesTerms[0].rate } : {}),
        };
      }
    }
  }));

  formattedTrack.contracts = formattedTrack.contracts.filter(Boolean);
  formattedTrack.payeeCount = formattedTrack.contracts?.length || 0;

  // Get releases
  const releases = await Release.find({ clientId: track.clientId, trackIds: formattedTrack.id }).lean().exec();
  formattedTrack.releases = releases.map((release) => ({
    releaseId: release._id.toString(),
    name: release.title,
  }));

  return formattedTrack;
};

const addSplitsTrack = async ({ curveUser, splitTrackData }) => {
  const operations = [];

  try {
    const { fugaTrackId, subOrgId, splits } = splitTrackData;

    logger.info(`subOrg Splits: Starting to add splits to track ${fugaTrackId}`);
    await validateClient(curveUser.clientId);
    if (!fugaTrackId || !subOrgId || splits === undefined) {
      throwError({ message: 'Fuga Track ID, subOrgId, and splits are required', code: 400, cause: 'ITEM03' });
    }
    const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
    if (totalPercentage > 100) {
      throwError({
        message: `The total percentage of splits exceeds 100. Current total: ${totalPercentage}`,
        code: 400,
        cause: 'ITEM04',
      });
    }

    logger.debug(`subOrg Splits: Finding track with Fuga ID: ${fugaTrackId}`);
    const track = await Track.findOne({ fugaId: fugaTrackId, clientId: curveUser.clientId }).exec();

    if (!track) {
      throwError({ message: `Track not found with Fuga ID: ${fugaTrackId}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Looking up subClient ID with subOrgId: ${subOrgId}`);
    const subClient = await SubClient.findOne({ subOrgId, clientId: curveUser.clientId }, '_id').exec();

    if (!subClient) {
      throwError({ message: `SubClient not found for subOrgId: ${subOrgId}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Finding main contract linked to track: ${fugaTrackId}`);
    const mainContract = await Contract.findOne({
      clientId: curveUser.clientId,
      subClientId: subClient._id,
      isMainSubClientContract: true,
    }).exec();

    if (!mainContract) {
      throwError({ message: `Main contract not found for subOrgId: ${subOrgId}`, code: 404, cause: 'ITEM02' });
    }

    if (!track.salesReturnsRights || !track.salesReturnsRights.some((right) => right.contractId === mainContract._id.toString())) {
      throwError({ message: `Track with Fuga ID: ${fugaTrackId} has not been linked to subOrg: ${subOrgId}`, code: 409, cause: 'FORB01' });
    }

    const originalTrack = JSON.parse(JSON.stringify(track));

    const payeeContracts = await Promise.all(
      splits.map(async (split) => {
        if (!split.payeeId || !ObjectId.isValid(split.payeeId)) throwError({ message: `Invalid Payee ID format: ${split.payeeId}`, code: 400, cause: 'ITEM03' });
        logger.debug(`subOrg Splits: Finding payee with ID: ${split.payeeId}`);
        const payee = await Payee.findOne({ _id: split.payeeId, clientId: curveUser.clientId }).exec();
        if (!payee) {
          throwError({ message: `Payee not found with ID: ${split.payeeId}`, code: 404, cause: 'ITEM02' });
        }

        logger.debug(`subOrg Splits: Finding contract for payee ID: ${payee._id}`);
        const payeeContract = await Contract.findOne({
          clientId: curveUser.clientId,
          subClientId: subClient._id,
          isMainSubClientContract: false,
          payees: { $elemMatch: { payeeId: payee._id.toString() } },
        }).exec();
        if (!payeeContract) {
          throwError({ message: `Contract not found under subclient for payee ID: ${payee._id}`, code: 404, cause: 'ITEM02' });
        }

        return {
          contractId: payeeContract._id.toString(),
          percentage: split.percentage,
        };
      }),
    );

    logger.debug('subOrg Splits: Adding payee contracts to track salesTerms');
    track.salesReturnsRights = [
      {
        contractId: mainContract._id.toString(),
        percentage: 100,
      },
      ...payeeContracts,
    ];

    operations.push({ model: Track, document: track, action: 'restore', originalState: originalTrack });
    track.fromLBAroute = true;
    await track.save();

    logger.info(`subOrg Splits: Successfully added splits to track ${track._id}`);
    const formattedTrack = await formatTrack(track);
    return formattedTrack;
  } catch (error) {
    logger.error(`subOrg Splits: Error occurred, rolling back changes: ${error.message}`);
    const rollbackOperations = operations.map(async (op) => {
      await op.model.updateOne({ _id: op.document._id }, op.originalState).exec();
    });
    await Promise.all(rollbackOperations);
    throw error;
  }
};

const updateSubClientSalesTerms = async ({ subOrgId, salesTerms }) => {
  const operations = [];

  try {
    logger.info(`subOrg Splits: Starting to update sales terms for subOrgId: ${subOrgId}`);

    if (!subOrgId || !salesTerms) {
      throwError({ message: 'subOrgId and salesTerms are required', code: 400, cause: 'ITEM03' });
    }

    logger.debug(`subOrg Splits: Looking up subClient with subOrgId: ${subOrgId}`);
    const subClient = await SubClient.findOne({ subOrgId }).exec();

    if (!subClient) {
      throwError({ message: `SubClient not found with subOrgId: ${subOrgId}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Finding contracts associated with subClient ID: ${subClient._id}`);
    const contracts = await Contract.find({ subClientId: subClient._id }).exec();

    if (!contracts || contracts.length === 0) {
      throwError({ message: `No contracts found for subClient ID: ${subClient._id}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug(`subOrg Splits: Updating sales terms for ${contracts.length} contracts associated with subClient ID: ${subClient._id}`);

    for (const contract of contracts) {
      const originalContract = JSON.parse(JSON.stringify(contract));
      operations.push({ model: Contract, document: contract, action: 'restore', originalState: originalContract });

      contract.salesTerms = [salesTerms];
      contract.fromLBAroute = true;
      await contract.save();
    }

    logger.info(`subOrg Splits: Successfully updated sales terms for subClient ID: ${subClient._id}`);
    return { subClientId: subClient._id, updatedContracts: contracts.map((contract) => contract._id) };
  } catch (error) {
    logger.error(`subOrg Splits: Error occurred, rolling back changes: ${error.message}`);
    const rollbackOperations = operations.map(async (op) => {
      await op.model.updateOne({ _id: op.document._id }, op.originalState).exec();
    });
    await Promise.all(rollbackOperations);
    throw error;
  }
};

const getSubClientBySubOrgId = async (subOrgId) => {
  try {
    logger.info(`Starting to fetch SubClient and main contract for subOrgId: ${subOrgId}`);

    logger.debug(`Looking up SubClient with subOrgId: ${subOrgId}`);
    const subClient = await SubClient.findOne({ subOrgId }).lean().exec();

    if (!subClient) {
      throwError({ message: `SubClient not found with subOrgId: ${subOrgId}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug(`Finding main contract associated with SubClient ID: ${subClient._id}`);
    const mainContract = await Contract.findOne({
      subClientId: subClient._id,
      isMainSubClientContract: true,
    }).lean().exec();

    if (!mainContract) {
      throwError({ message: `Main contract not found for SubClient ID: ${subClient._id}`, code: 404, cause: 'ITEM02' });
    }

    logger.info(`Successfully fetched SubClient and main contract for subOrgId: ${subOrgId}`);

    return {
      ...subClient,
      salesTerms: mainContract.salesTerms,
    };
  } catch (error) {
    logger.error(`Error fetching SubClient and main contract for subOrgId: ${subOrgId} - ${error.message}`);
    throw error;
  }
};

const getPayeeStatus = async (payee) => {
  // Get contracts associated with payee
  const contracts = await Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString() }, { _id: 1 });

  // Check how many tracks payee is associated with
  const contractIds = contracts.map((contract) => contract._id.toString());
  const trackCount = await Track.countDocuments({ clientId: payee.clientId, 'salesReturnsRights.contractId': { $in: contractIds } });
  const releaseCount = await Release.countDocuments({ clientId: payee.clientId, 'salesReturnsRights.contractId': { $in: contractIds } });

  // Check if user has logged in ever
  const user = await User.findOne({ payeeIds: payee._id.toString() });
  return { status: user?.lastLogin ? 'Active' : 'Inactive', tracks: trackCount, releases: releaseCount };
};

const formatPayees = async (payees) => {
  if (!payees || payees.length === 0) return [];

  const output = await Promise.all(payees.map(async (payee) => {
    const status = await getPayeeStatus(payee);
    return { _id: payee._id, name: payee.name, email: payee.email, status: status.status, tracks: status.tracks, releases: status.releases, createdAt: payee.createdAt, updatedAt: payee.updatedAt };
  }));
  return output;
};

const getPayeesBySubClient = async ({ subOrgId, search, page = 1, limit = 25 }) => {
  try {
    logger.info(`Fetching Payees for subOrgId: ${subOrgId}`);

    const subClient = await SubClient.findOne({ subOrgId }, '_id').lean();
    if (!subClient) {
      throwError({ message: `SubClient not found for subOrgId: ${subOrgId}`, code: 404, cause: 'ITEM02' });
    }

    logger.debug(`Found SubClient with ID: ${subClient._id}`);

    const contracts = await Contract.find({ subClientId: subClient._id, isMainSubClientContract: false }, 'payees').lean();
    if (!contracts || contracts.length === 0) {
      logger.debug(`No contracts found for subClientId: ${subClient._id}`);
      return {
        payees: [],
        meta: {
          currentPage: 1,
          totalPages: 1,
          total: 0,
        },
      };
    }

    logger.debug(`Found ${contracts.length} contracts for SubClient ID: ${subClient._id}`);

    const payeeIds = [...new Set(contracts.flatMap((contract) => contract.payees.map((payee) => payee.payeeId)))];

    logger.debug(`Extracted ${payeeIds.length} unique Payee IDs`);

    const regex = new RegExp(search, 'i');
    const filter = { _id: { $in: payeeIds }, name: regex };
    const paginationParams = {
      page,
      limit,
      select: 'name _id email createdAt updatedAt clientId',
      lean: true,
    };

    const result = await Payee.paginate(filter, paginationParams);
    result.pages = result?.totalPages;
    result.total = result?.totalDocs;

    const { docs: payees, total: totalDocs, pages: totalPages, page: currentPage } = result;

    logger.info(`Returning ${payees.length} Payees for subOrgId: ${subOrgId}`);
    return {
      payees: await formatPayees(payees),
      meta: {
        currentPage,
        totalPages,
        total: totalDocs,
      },
    };
  } catch (error) {
    logger.error(`Error fetching payees for subOrgId: ${subOrgId} - ${error.message}`);
    throw error;
  }
};

module.exports = {
  formatPayees,
  formatTrack,
  createSubClient,
  createSplitPayee,
  linkTrackSplits,
  addSplitsTrack,
  updateSubClientSalesTerms,
  getSubClientBySubOrgId,
  getPayeesBySubClient,
};
