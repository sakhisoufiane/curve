/* eslint-disable no-await-in-loop */
const { eachLimit } = require('async');
const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;

const AppSettings = require('../../models/appSettings');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Period = require('../../models/period');
const Release = require('../../models/release');
const Statement = require('../../models/statement');
const Task = require('../../models/task');
const Track = require('../../models/track');
const User = require('../../models/user');
const BulkSplits = require('../../models/bulkSplits');

const sendEmail = require('../../libs/sendEmail');
const StatementController = require('../statement');
const { throwError } = require('../../libs/errors');

// Common
const devMode = (process.env.environmentName?.toLowerCase() === 'development');

const validateDateParam = (dateParam) => {
  const isValidDate = !isNaN(Date.parse(dateParam));

  if (!isValidDate) {
    throwError({
      message: 'Invalid date param',
      details: { note: 'Should be a valid date format (YYYY-MM-DD)' },
      code: 400,
      cause: 'INVALID_FIELDS',
    });
  }
};

const validateClient = async (clientId) => {
  if (!clientId || !ObjectId.isValid(clientId)) throwError({ message: 'Valid organisation ID required', code: 400, cause: 'INVALID_CLIENT_ID' });

  const client = await Client.findById(clientId);
  if (!client) throwError({ message: 'Organisation not found', code: 404, cause: 'CLIENT_NOT_FOUND' });

  return client;
};

const validatePayee = async (clientId, subOrgId) => {
  if (!subOrgId) throwError({ message: 'Sub Organisation ID required', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields: ['subOrgId'] } });

  const payee = await Payee.findOne({ clientId, foreignId: subOrgId });
  if (!payee) throwError({ message: `Payee not found for Sub Org Id: ${subOrgId}`, code: 404, cause: 'SUB_ORG_PAYEE_NOT_FOUND' });

  return payee;
};

const validateStatement = async (statementId) => {
  if (!statementId || !ObjectId.isValid(statementId)) throwError({ message: 'Valid Statement ID required', code: 400, cause: 'INVALID_STATEMENT_ID' });

  const statement = await Statement.findById(statementId);
  if (!statement) throwError({ message: `Statement not found with ID ${statementId}`, code: 404, cause: 'STATEMENT_NOT_FOUND' });

  return statement;
};

// White Label
const sumConfigurations = ({ phrase, configurations = [] }) => {
  let sumUnits = 0;
  for (const config of configurations) {
    if (config.type.toLowerCase().indexOf(phrase) > -1) {
      sumUnits += config.units;
    }
  }
  return sumUnits;
};

const getStatementCurrency = async ({ statement }) => {
  const contract = await Contract.findOne({ clientId: statement.clientId, _id: statement.contractId });
  if (!contract.currency === 'Home Currency') {
    return contract.currency;
  }

  const client = await Client.findOne({ _id: statement.clientId });

  return client.homeCurrency;
};

const getWhiteLabelStatements = async ({ clientId, subOrgId, query }) => {
  await validateClient(clientId);
  const payee = await validatePayee(clientId, subOrgId);

  const formattedStatements = await getFormattedStatements({ clientId, payeeId: payee._id.toString(), query });

  return formattedStatements;
};

const getWhiteLabelStatement = async ({ clientId, subOrgId, statementId }) => {
  await validateClient(clientId);
  const payee = await validatePayee(clientId, subOrgId);
  const statement = await validateStatement(statementId);

  const formattedStatement = await getFormattedStatement({ statement, payeeName: payee.name });

  return formattedStatement;
};

const getFormattedStatements = async ({ clientId, payeeId, query }) => {
  let perPage = Number(query?.per_page) || 10;
  if (perPage < 1 || perPage > 1000) perPage = 10;

  let page = Number(query?.page) || 1;
  if (page < 1) page = 1;

  const offset = page > 1 ? (page - 1) * perPage : 0;

  const contracts = await Contract.find({ clientId, 'payees.payeeId': payeeId }, '_id');
  const contractIds = contracts.map((item) => item._id.toString());
  const statements = await Statement.find({ clientId, status: 'Published', contractId: { $in: contractIds } }).skip(offset).sort({ createdAt: -1 }).limit(perPage);

  const formattedStatements = statements.map((statement) => ({
    id: statement.id,
    name: statement.name,
    url: `https://${devMode ? 'dev' : 'app'}.curveroyaltysystems.com/#/statements/${statement.id}`,
    packageLink: statement.allFilesZipPublicLink,
  }));

  return formattedStatements || [];
};

const getFormattedStatement = async ({ statement, payeeName }) => {
  const formattedStatement = {};
  const currency = await getStatementCurrency({ statement });
  formattedStatement.currency = currency;
  formattedStatement.packageLink = statement.allFilesZipPublicLink;

  formattedStatement.totals = {
    streams: sumConfigurations({ phrase: 'stream', configurations: statement?.analysis?.net?.configurations }),
    downloads: sumConfigurations({ phrase: 'download', configurations: statement?.analysis?.net?.configurations }),
    netRevenue: statement.netAmount,
    salesIncome: statement.grossAmount,
    mutationsTotals: statement.netCosts,
  };

  formattedStatement.financialTotals = [{
    salesIncome: statement.grossAmount,
    companyRoyalty: statement.netAmount,
    mutationsTotals: statement.netCosts,
    royaltiesEarned: statement.netOutput,
    organizationName: payeeName,
  }];

  formattedStatement.topNetRevenues = {
    assets: statement?.analysis?.net?.tracks?.map((item) => ({
      name: item.title,
      value: item.value,
    }))?.sort((a, b) => b.value - a.value),
    labels: [],
    stores: statement?.analysis?.net?.sources?.map((item) => ({
      name: item.type,
      value: item.value,
    }))?.sort((a, b) => b.value - a.value),
    artists: [],
    products: statement?.analysis?.net?.releases?.map((item) => ({
      name: item.title,
      value: item.value,
    }))?.sort((a, b) => b.value - a.value),
    countries: statement?.analysis?.net?.territories?.map((item) => ({
      name: item.type,
      value: item.value,
    }))?.sort((a, b) => b.value - a.value),
  };

  return formattedStatement;
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
    alternativeId: track.alternativeId,
    tags: track.tags,
    releases: [],
    payeeCount: 0,
    contracts: [],
  };

  formattedTrack.contracts = await Promise.all(track.salesReturnsRights.map(async (contract) => {
    const foundContract = await Contract.findById(contract.contractId);
    if (foundContract) {
      // Default to first payee for now
      const firstPayeeId = foundContract.payees?.[0]?.payeeId;
      if (!firstPayeeId) {
        logger.error(`Skipping contract ${foundContract._id} with no payees on track ${formattedTrack.id}`);
        return undefined;
      }
      const foundPayee = await Payee.findById(firstPayeeId);

      if (foundPayee) {
        return {
          payeeId: foundPayee._id.toString(),
          payeeName: foundPayee.name,
          payeeEmail: foundPayee.email,
          percentage: contract.percentage,
          ...(foundContract.isMainSubClientContract
            ? {
              isMainSubClientContract: true,
              salesTermsRate: foundContract.salesTerms[0].rate,
            }
            : {})
          ,
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

const updateTrack = async ({ track, params, clientId }) => {
  if (track) {
    track.title = params?.title ? params.title : track.title;
    track.version = params?.version ? params.version : track.version;
    track.artist = params?.artist ? params.artist : track.artist;
    track.duration = params?.duration ? params.duration : track.duration;
    track.isrc = params?.isrc ? params.isrc : track.isrc;

    if (params?.fugaId) { track.fugaId = params.fugaId; }

    if (!Array.isArray(track.salesReturnsRights)) { track.salesReturnsRights = []; }

    const newContractEntries = []; // New Entries is used detect any new contracts, we use this list to notify the users

    if (params?.contracts) {
      const newRights = [];

      if (params.contracts && !Array.isArray(params.contracts)) { params.contracts = JSON.parse(params.contracts); }

      for (const contract of params.contracts) {
        // eslint-disable-next-line no-await-in-loop
        const foundContract = await Contract.findOne({ clientId: track.clientId, 'payees.payeeId': contract.payeeId }); // Default to first payee for now

        if (foundContract) {
          // Find any new contract entries in this request, this is so we can notify those newly added users/contracts
          const isNewEntry = track.salesReturnsRights.find((contract) => contract.contractId === foundContract._id.toString());
          if (!isNewEntry) { newContractEntries.push(contract); }

          // Update all incoming rights
          if (contract.percentage || contract.percentage === 0) {
            newRights.push({ contractId: foundContract._id.toString(), percentage: contract.percentage });
          }
        } else {
          logger.info(`Skipping split - no contract found for payee ${contract.payeeId} on client ${track.clientId}`);
        }
      }

      track.salesReturnsRights = newRights;
      track.costsRights = newRights;
    }

    try {
      await track.save();
      if (newContractEntries?.length) { await notifyNewlyAddedPayees({ payees: newContractEntries, track, clientId }); }
      return track;
    } catch (err) {
      logger.error(err);
      throw (err);
    }
  }
};

const notifyNewlyAddedPayees = async ({ payees, track, clientId }) => {
  const client = await Client.findById(clientId);
  if (!client) throw new Error(`Could not find Client ID: ${clientId}`);

  logger.debug(`Notifying ${payees.length} payees on ${track._id.toString()}`);
  logger.debug(payees);

  await eachLimit(payees, 10, async (payee) => {
    const users = await User.find({ payeeIds: payee.payeeId });
    if (!users?.length) { return; }

    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await sendEmail.notifyNewlyAddedSplit({ email: user.email, client, track });
    }
  });
};

const formatRelease = async (release) => {
  const output = {
    _id: release._id.toString(),
    fugaId: release.fugaId,
    title: release.title,
    version: release.version,
    artist: release.artist,
    catNo: release.catNo,
    barcode: release.barcode,
    releaseDate: release.releaseDate,
    tracks: [],
    contracts: [],
    label: release.label ?? '',
  };

  // Get associated contracts
  const contractsOutput = await Promise.all(release.salesReturnsRights.map(async (contract) => {
    let contractOutput = {};
    const foundContract = await Contract.findById(contract.contractId);
    if (foundContract) {
      const foundPayee = await Payee.findById(foundContract.payees?.[0]?.payeeId);
      if (foundPayee) {
        contractOutput = { payeeId: foundPayee._id.toString(), payeeName: foundPayee.name, payeeEmail: foundPayee.email, percentage: contract.percentage };
      }
    }
    return contractOutput;
  }));

  // Get associated tracks
  const tracksOutput = await Promise.all(release.trackIds.map(async (trackId) => {
    const foundTrack = await Track.findById(trackId);
    if (foundTrack) {
      const trackOutput = await formatTrack(foundTrack);
      return trackOutput;
    }
  }));

  // Update output with found values
  output.tracks = tracksOutput.filter(Boolean);
  output.contracts = contractsOutput.filter(Boolean);
  return output;
};

const updateRelease = async (release, params) => {
  if (release) {
    release.title = params.title ?? release.title;
    release.version = params.version ?? release.version;
    release.artist = params.artist ?? release.artist;
    release.releaseDate = params.releaseDate ?? release.releaseDate;
    release.label = params.label ?? release.label ?? '';

    if (params.fugaId) {
      release.fugaId = params.fugaId;
    }

    if (params.contracts) {
      release.salesReturnsRights = [];
      if (params.contracts && !Array.isArray(params.contracts)) {
        params.contracts = JSON.parse(params.contracts);
      }
      await params.contracts.forEach(async (contract) => {
        // Default to first payee for now
        const foundContract = await Contract.findOne({ clientId: release.clientId, 'payees.payeeId': contract.payeeId });
        if (foundContract && (contract.percentage || contract.percentage === 0)) {
          release.salesReturnsRights.push({ contractId: foundContract._id.toString(), percentage: contract.percentage });
        }
      });
      release.costsRights = release.salesReturnsRights;
    }
    // Update tracks
    if (params.tracks) {
      const trackIds = [];
      await eachLimit(params.tracks, 3, async (track) => {
        const existingTrack = await Track.findOne({ clientId: release.clientId, fugaId: track.fugaId });
        if (existingTrack) {
          // Track found, update values
          const updatedTrack = await updateTrack({ track: existingTrack, params: track, clientId: release.clientId });
          trackIds.push(updatedTrack._id);
        } else {
          // Track not found, create and then update values
          const newTrack = new Track({ clientId: release.clientId, isrc: track.isrc });
          const updatedTrack = await updateTrack({ track: newTrack, params: track, clientId: newTrack.clientId });
          trackIds.push(updatedTrack._id);
        }
      });
      release.trackIds = trackIds;
    }
    await release.save();
  }
  return release;
};

const getBulkSplitsById = async ({ id, clientId }) => {
  const result = await BulkSplits.findOne({
    _id: id,
    clientId,
  });

  if (!result) {
    return null;
  }

  const withRestoredLinks = await restoreExpiredBulkPublicLinks([result]);

  return withRestoredLinks[0];
};

const getBulkSplits = async ({ clientId, query }) => {
  await validateClient(clientId);

  const filter = { clientId };

  if (query.createdAfter || query.createdBefore) {
    filter.createdAt = {};
  }

  if (query.createdAfter) {
    validateDateParam(query.createdAfter);

    const createdAfterDate = new Date(query.createdAfter);
    filter.createdAt.$gte = createdAfterDate;
  }

  if (query.createdBefore) {
    validateDateParam(query.createdBefore);

    const createdBeforeDate = new Date(query.createdBefore);
    filter.createdAt.$lte = createdBeforeDate;
  }

  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: query.orderBy ? Page.sortOrDefault(query.orderBy, query.orderDir) : { createdAt: -1 },
    select: query.select || null,
    lean: true,
  };

  const result = await BulkSplits.paginate(filter, paginationParams);

  const withRestoredLinks = await restoreExpiredBulkPublicLinks(result.docs);

  return {
    bulkSplits: withRestoredLinks,
    meta: {
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  };
};

const restoreExpiredBulkPublicLinks = async (bulkJobs) => Promise.all(bulkJobs.map(async (job) => {
  if (shouldRestoreBulkJobLink(job)) {
    try {
      const updates = {};
      if (job.fileKey) updates.file = await generatePublicLink7Days(job.fileKey);
      if (job.errorFileKey) updates.errorFile = await generatePublicLink7Days(job.errorFileKey);

      if (Object.keys(updates).length > 0) {
        await BulkSplits.updateOne(
          { _id: job._id },
          { $set: { ...updates, updatedAt: new Date() } },
        );

        logger.info(`Restored links for BulkSplits job ${job._id}`);
        if (updates.file) job.file = updates.file;
        if (updates.errorFile) job.errorFile = updates.errorFile;
      }

      return job;
    } catch (error) {
      logger.error(`Failed to restore links for BulkSplits job ${job._id}:`, error);
      return job;
    }
  } else {
    return job;
  }
}));

const shouldRestoreBulkJobLink = (job) => {
  const sevenDaysInMilliseconds = 1000 * 60 * 60 * 24 * 7;
  const sevenDaysAgo = new Date(Date.now() - sevenDaysInMilliseconds);

  if (job.createdAt > sevenDaysAgo) {
    return false;
  }

  const fileDate = extractDateFromS3PublicLink(job.file);
  const errorFileDate = extractDateFromS3PublicLink(job.errorFile);

  return (fileDate && fileDate < sevenDaysAgo) || (errorFileDate && errorFileDate < sevenDaysAgo);
};

const generatePublicLink7Days = (key) => new Promise((resolve, reject) => {
  fileManager.publicLink7Days(key, (err, link) => {
    if (err) reject(err);
    else resolve(link);
  });
});

const extractDateFromS3PublicLink = (publicLink) => {
  if (!publicLink) return null;

  const decodedLink = decodeURIComponent(publicLink);
  const timestampMatch = decodedLink.match(/(\d{17})/);

  if (!timestampMatch) return null;

  const timestamp = timestampMatch[1];
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(8, 10);

  return new Date(`${year}-${month}-${day}T${hour}:00:00Z`);
};

// Splits - Payees
const createPayee = async ({ curveUser, newPayee }) => {
  await validateClient(curveUser.clientId);

  if (!newPayee.name || !newPayee.email) {
    const missingFields = [];
    if (!newPayee.name) missingFields.push('name');
    if (!newPayee.email) missingFields.push('email');
    throwError({ message: 'Name and Email are required', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields } });
  }

  const payee = await Payee.findOne({ clientId: curveUser.clientId, name: newPayee.name }).lean().exec();

  // Payee Exists
  if (payee) return payee;

  // Create Payee (plus Contract and User)
  return createPayeeContractUser(curveUser, newPayee);
};

const createPayeeContractUser = async (curveUser, body) => {
  if (!body) throwError({ message: 'No body passed', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields: ['body'] } });

  if (!curveUser?.clientId) throwError({ message: 'No client ID passed', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields: ['clientId'] } });

  // Create payee
  const payee = new Payee({ clientId: curveUser.clientId, name: body.name, email: body.email });

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: payee, adminOnly: true, payeeOnly: true })) {
    throwError({ message: 'Forbidden', code: 403, cause: 'FORBIDDEN' });
  }

  await payee.save();

  // Create Contract
  // Sets default values required for splits
  const contract = new Contract({
    payees: [{ payeeId: payee._id.toString(), percentage: 100 }],
    clientId: curveUser.clientId,
    name: body.name,
    active: true,
    accountingPeriod: 'Monthly',
    salesTerms: [{ territory: 'WW', catType: 'All', catalogueGroup: 'All', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100 }],
    costsTerms: [{ type: 'All', territory: 'WW', rate: 100 }],
  });

  await contract.save();

  // Create User
  await findOrCreatePayeeUser(body.email, payee);

  // Return payee
  return payee;
};

const findOrCreatePayeeUser = async (email, payee) => {
  if (!email) throwError({ message: 'No email passed', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields: ['email'] } });

  if (!payee) throwError({ message: 'No payee passed', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields: ['payee'] } });

  return new Promise((resolve, reject) => {
    // Create user using standard request
    User.createUser({ email, payeeId: payee._id.toString() }, (err, user) => {
      if (err) {
        return reject(err);
      }
      resolve(user);
    });
  });
};

const formatPayees = async (payees) => {
  const output = await Promise.all(payees.map(async (payee) => {
    const status = await getPayeeStatus(payee);
    return { _id: payee._id, name: payee.name, email: payee.email, status: status.status, tracks: status.tracks, releases: status.releases, createdAt: payee.createdAt, updatedAt: payee.updatedAt };
  }));
  return output;
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

const getPayeeAssociatedTracks = async (payee, query, paginationParams) => {
  // Get contracts associated with payee
  const contracts = await Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString() }, { _id: 1 });
  // Check how many tracks payee is associated with
  const contractIds = contracts.map((contract) => contract._id.toString());
  const filter = { clientId: payee.clientId, 'salesReturnsRights.contractId': { $in: contractIds } };
  if (typeof query.tags === 'string') {
    filter.tags = { $in: [query.tags] };
  }
  if (typeof query.excludeTags === 'string') {
    filter.tags = { $nin: [query.excludeTags] };
  }
  const result = await Track.paginate(filter, paginationParams);
  // Format track output for return
  const tracks = await Promise.all(result.docs.map(async (track) => {
    const outputTrack = await formatTrack(track);
    return outputTrack;
  }));

  return ({
    tracks,
    meta: {
      currentPage: paginationParams.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  });
};

const getPayeeAssociatedReleases = async (payee, limit = 25, offset = 0) => {
  // Get contracts associated with payee
  const contracts = await Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString() }, { _id: 1 });
  // Check how many tracks payee is associated with
  const contractIds = contracts.map((contract) => contract._id.toString());
  const releases = await Release.find({ clientId: payee.clientId, 'salesReturnsRights.contractId': { $in: contractIds } }).sort({ _id: -1 }).limit(limit).skip(offset);
  const output = await Promise.all(releases.map(async (release) => {
    const outputRelease = await formatRelease(release);
    return outputRelease;
  }));
  return output;
};

const deletePayee = async (payee) => {
  // Check if payee is associated with any tracks or releases
  const contracts = await Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString() }, { _id: 1 });
  // Check how many tracks payee is associated with
  const contractIds = contracts.map((contract) => contract._id.toString());
  const tracks = await Track.find({ clientId: payee.clientId, 'salesReturnsRights.contractId': { $in: contractIds } }, { _id: 1, fugaId: 1 });
  const releases = await Release.find({ clientId: payee.clientId, 'salesReturnsRights.contractId': { $in: contractIds } }, { _id: 1, fugaId: 1 });
  if (tracks.length === 0 && releases.length === 0) {
    // Delete payee and contracts
    // TODO .deleteOne is now using pre-hooks instead of .remove, was the assumption here to delete a payee document and skip validation??
    await Payee.deleteOne({ _id: payee._id.toString() });
    await Contract.deleteMany({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString() });
    // Decide how to delete user
    return { status: true, message: 'Payee deleted' };
  }
  // Prepare IDs for returning
  const trackIds = tracks.map((track) => {
    if (track.fugaId) {
      return track.fugaId;
    }
    return track._id.toString();
  });
  const releaseIds = releases.map((release) => {
    if (release.fugaId) {
      return release.fugaId;
    }
    return release._id.toString();
  });
  // Return error including IDs
  return { status: false, message: 'Payee has associated tracks or releases', trackIds, releaseIds };
};

const updateTrackErrorToFugaId = async (errorMessage) => {
  // Get ID from last word of errorMessage
  const splitError = errorMessage.split(' ');
  const curveId = splitError.pop();
  // Get track
  const track = await Track.findOne({ _id: curveId });
  if (track?.fugaId) {
    splitError.push(track.fugaId);
    return splitError.join(' ');
  }
  return errorMessage;
};

const updateReleaseErrorToFugaId = async (errorMessage) => {
  // Get ID from last word of errorMessage
  const splitError = errorMessage.split(' ');
  const curveId = splitError.pop();
  // Get track
  const release = await Release.findOne({ _id: curveId });
  if (release?.fugaId) {
    splitError.push(release.fugaId);
    return splitError.join(' ');
  }
  return errorMessage;
};

// Set default Period sort order if none set
const setDefaultPeriodSortOrder = (query) => {
  if (!query.orderBy) {
    query.orderBy = 'createdAt';
    query.orderDir = 'desc';
  }
};

// Splits - Periods
const getPeriods = async ({ clientId, query }) => {
  await validateClient(clientId);

  Period.schema.virtual('notpublished', {
    ref: 'Statement',
    localField: '_id',
    foreignField: 'periodId',
    count: true,
    match: { status: { $ne: 'Published' }, clientId },
  });

  setDefaultPeriodSortOrder(query);

  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: Page.sortOrDefault(query.orderBy, query.orderDir),
    select: '_id clientId name setupStage year accountingPeriod accountingPeriodType startDate endDate accountingDate status contractType runNo locked createdAt calculationStatus grossAmount grossCosts netAmount netCosts totalContractsForCalculation processEndTime fuga',
    lean: true,
    populate: { path: 'notpublished' },
  };

  const result = await Period.paginate({ clientId, status: 'Complete' }, paginationParams);

  result.docs.forEach((period) => {
    // Update Period status if all Statements published
    if (period.notpublished === 0) {
      period.status = 'Published';
    }

    // Remove the virtual field
    period.notpublished = undefined;
  });

  return {
    periods: result.docs,
    meta: {
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  };
};

const isPeriodPublished = async ({ clientId, periodId }) => {
  const statementsNotPublished = await Statement.countDocuments({ clientId, periodId, status: { $ne: 'Published' } });
  return statementsNotPublished === 0;
};

const getPeriod = async ({ clientId, periodId, curveUser, publishedCheck = true }) => {
  await validateClient(clientId);

  if (!ObjectId.isValid(periodId)) {
    throwError({
      message: `Couldn't find a Period matching this ID: ${periodId}`,
      code: 404,
      cause: 'PERIOD_NOT_FOUND',
    });
  }

  const result = await Period.findById(periodId)
    .select('_id clientId name setupStage year accountingPeriod accountingPeriodType startDate endDate accountingDate currencyExchangeRates '
      + 'status contractType usedReleaseIds usedTrackIds usedWorkIds completedCatalogueItems runNo locked createdBy lastModifiedBy calculationNotes '
      + 'createdAt calculationStatus processStartTime totalContractsForCalculation grossAmount grossCosts lines netAmount netCosts units '
      + 'unreportedSalesCsv unreportedCostsCsv calculationError processEndTime unreportedCostsCsvPublicLink unreportedSalesCsvPublicLink valid fuga');

  if (!result) {
    throwError({
      message: `Couldn't find a Period matching this ID: ${periodId}`,
      code: 404,
      cause: 'PERIOD_NOT_FOUND',
    });
  }

  if (publishedCheck && await isPeriodPublished({ clientId, periodId })) {
    result.status = 'Published';
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: result, clientOnly: true })) {
    throwError({
      message: 'Forbidden',
      code: 403,
      cause: 'FORBIDDEN',
    });
  }

  return result;
};

const getPayeeName = (statement) => {
  const { contractId } = statement;

  if (contractId?.payees && contractId?.payees.length > 0) {
    return contractId?.payees?.[0]?.payeeId?.name;
  }

  return null;
};

const getStatements = ({ statements, clientHomeCurrency }) => statements.map((item) => ({
  sendings: item.settings,
  locked: item.locked,
  _id: item._id,
  clientId: item.clientId,
  periodId: item.periodId,
  contractId: item.contractId?._id,
  payeeName: getPayeeName(item),
  name: item.name,
  date: item.date,
  year: item.year,
  accountingPeriod: item.accountingPeriod,
  periodType: item.periodType,
  status: item.status,
  salesFilesIds: item.salesFilesIds,
  costIds: item.costIds,
  releaseIds: item.releaseIds,
  trackIds: item.trackIds,
  workIds: item.workIds,
  openingBalance: item.openingBalance,
  units: item.units,
  grossAmount: item.grossAmount,
  netAmount: item.netAmount,
  grossCosts: item.grossCosts,
  netCosts: item.netCosts,
  reservesWithheld: item.reservesWithheld,
  reservesReleased: item.reservesReleased,
  netOutput: item.netOutput,
  closingBalance: item.closingBalance,
  lines: item.lines,
  invalidLines: item.invalidLines,
  profitShareRate: item.profitShareRate,
  profitShareNetAmount: item.profitShareNetAmount,
  currency: !item.currency ? null : getCurrency(item.currency, clientHomeCurrency),
  createdAt: item.createdAt,
  contractType: item.contractType,
  pdf: item.pdf,
  statementOfAccount: item.statementOfAccount,
  salesCsv: item.salesCsv,
  costsCsv: item.costsCsv,
  allFilesZip: item.allFilesZip,
  salesCsvPublicLink: item.salesCsvPublicLink,
  costsCsvPublicLink: item.costsCsvPublicLink,
  pdfPublicLink: item.pdfPublicLink,
  statementOfAccountPublicLink: item.statementOfAccountPublicLink,
  allFilesZipPublicLink: item.allFilesZipPublicLink,
}));

const statementFields = 'sendings locked _id clientId periodId contractId name date year accountingPeriod periodType status salesFilesIds costIds '
  + 'releaseIds trackIds workIds openingBalance units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased '
  + 'netOutput closingBalance lines invalidLines profitShareRate profitShareNetAmount currency createdAt contractType pdf statementOfAccount '
  + 'salesCsv costsCsv allFilesZip salesCsvPublicLink costsCsvPublicLink pdfPublicLink statementOfAccountPublicLink allFilesZipPublicLink';

const getPeriodStatements = async ({ clientId, periodId, query, curveUser }) => {
  const client = await validateClient(clientId);
  await getPeriod({ clientId, periodId, curveUser });

  const defaultOrderBy = 'date name';
  const defaultOrderDir = 'desc';

  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: Page.sortOrDefault(query.orderBy || defaultOrderBy, query.orderDir || defaultOrderDir),
    populate: {
      path: 'contractId',
      model: 'Contract',
      select: 'payees',
      // Link to Contracts and Payees to get Payee name. Note. assumed single Payee on Fuga Contract
      populate: { path: 'payees.payeeId', model: 'Payee', select: 'name' },
    },
    select: statementFields,
  };

  const result = await Statement.paginate({ clientId, periodId }, paginationParams);
  const statements = getStatements({ statements: result.docs, clientHomeCurrency: client.homeCurrency });

  return {
    statements,
    meta: {
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  };
};

const getStatement = async ({ clientId, statementId, curveUser }) => {
  await validateClient(clientId);

  if (!ObjectId.isValid(statementId)) {
    throwError({
      message: `Couldn't find a Statement matching this ID: ${statementId}`,
      code: 404,
      cause: 'STATEMENT_NOT_FOUND',
    });
  }

  const result = await Statement.findById(statementId)
    .select('sendings locked _id clientId periodId contractId name date year accountingPeriod periodType status salesFilesIds costIds '
      + 'releaseIds trackIds workIds openingBalance units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased '
      + 'withholdingTax netOutput closingBalance lines invalidLines profitShareRate profitShareNetAmount profitShareUnrecoupedAdvanceStart '
      + 'profieShareAdvanceRecouped currency contractType partitionNo pdf statementOfAccount selfBillingInvoice salesCsv costsCsv allFilesZip '
      + 'salesCsvPublicLink costsCsvPublicLink pdfPublicLink statementOfAccountPublicLink selfBillingInvoicePublicLink allFilesZipPublicLink payments');

  if (!result) {
    throwError({
      message: `Couldn't find a Statement matching this ID: ${statementId}`,
      code: 404,
      cause: 'STATEMENT_NOT_FOUND',
    });
  }

  if (result.clientId !== clientId) {
    throwError({
      message: `Couldn't find a Statement for this Organisation ID: ${clientId}`,
      code: 404,
      cause: 'STATEMENT_NOT_FOUND_FOR_CLIENT',
    });
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'statements', document: result, clientOnly: true })) {
    throwError({
      message: 'Forbidden',
      code: 403,
      cause: 'FORBIDDEN',
    });
  }

  return result;
};

const publishAllStatements = async ({ clientId, periodId, curveUser }) => {
  await validateClient(clientId);
  const period = await getPeriod({ clientId, periodId, curveUser });

  // Publish Statements
  await StatementController.updateStatementStatus({ period, curveUser, status: 'Published' });

  // Send Statements
  await StatementController.sendStatements({ period, curveUser, sendAll: true });
};

const validateEmailAddresses = (emailAddresses) => {
  // It is valid to provide no email addresses
  if (!emailAddresses) {
    return;
  }

  if (!Array.isArray(emailAddresses) || emailAddresses.length === 0) {
    throwError({
      message: 'Emails should be passed as an array of strings.',
      code: 400,
      cause: 'INVALID_EMAIL',
    });
  }

  if (emailAddresses.some((email) => !email || typeof email !== 'string' || email.indexOf('@') === -1)) {
    throwError({
      message: 'Emails should be passed as an array of strings.',
      code: 400,
      cause: 'INVALID_EMAIL',
    });
  }
};

const fileInProgress = async (taskName, clientId, periodId, file) => {
  const documentCount = await Task.countDocuments(
    {
      name: { $in: [taskName] },
      clientId,
      status: { $in: ['Pending', 'In Progress'] },
      value: { periodId, file },
    },
  );
  return documentCount > 0;
};

const STATEMENT_TYPES = ['pdf', 'salesCsv', 'costsCsv', 'statementOfAccount', 'feesInvoice', 'selfBillingInvoice'];

const emailAllStatements = async ({ clientId, periodId, emailAddresses, curveUser }) => {
  const client = await validateClient(clientId);
  await getPeriod({ clientId, periodId, curveUser });
  validateEmailAddresses(emailAddresses);

  let emailList = emailAddresses;
  if (!emailList) {
    emailList = client.fugaIntegration?.fugaNotifyEmails;
  }

  const taskName = 'Period Statements Zip';

  for (const file of STATEMENT_TYPES) {
    if (await fileInProgress(taskName, clientId, periodId, file)) {
      throwError({
        message: 'This task is already running - please wait until it has completed before running again',
        code: 400,
        cause: 'TASK_ALREADY_RUNNING',
      });
    }

    // Check if the selected statement file exists
    const statementsFound = await Statement.countDocuments({ clientId, periodId, [file]: { $exists: true, $ne: null } });
    if (statementsFound) {
      try {
        await TaskHelpers.createTaskAndSendMessage(Task, {
          name: taskName,
          clientId,
          clientName: client.name,
          email: emailList.join(', '),
          value: { periodId, file },
        });
      } catch (err) {
        throwError({
          message: 'Failed to queue task',
          code: 500,
          cause: 'TASK_FAILED',
        });
      }
    }
  }
};

const emailSummary = async ({ clientId, periodId, emailAddresses, curveUser }) => {
  const client = await validateClient(clientId);
  const period = await getPeriod({ clientId, periodId, curveUser });
  validateEmailAddresses(emailAddresses);

  const emailList = emailAddresses || client.fugaIntegration?.fugaNotifyEmails;

  period.sendStatementExport(curveUser, emailList);
};

const sendBlockedNotificationEmail = async ({ client, periodName, periodId, blockedStatus, message }) => {
  const { fuga } = await AppSettings.findOne();
  const fugaOrgId = client.fugaIntegration?.fugaOrgId ? `(${client.fugaIntegration?.fugaOrgId})` : ' ';
  const subject = `FUGA Splits Client ${client.name} ${fugaOrgId} has ${blockedStatus ? 'blocked' : 'unblocked'} the Period ${periodName} (${periodId})`;

  sendEmail.genericEmail(fuga.periodBlockedEmails, client, subject, message);
};

const updateBlockedStatus = async ({ clientId, periodId, blockedStatus, curveUser, message }) => {
  const client = await validateClient(clientId);
  const period = await getPeriod({ clientId, periodId, curveUser, publishedCheck: false });

  if (typeof blockedStatus !== 'boolean') {
    throwError({
      message: 'Block status should only be Blocked or Unblocked.',
      code: 400,
      cause: 'INVALID_STATUS',
    });
  }

  await sendBlockedNotificationEmail({ client, periodName: period.name, periodId, blockedStatus, message });

  period.fuga.blockedStatus = blockedStatus;
  await period.save();

  return period;
};

const getCurrency = (statementCurrency, clientHomeCurrency) => {
  if (statementCurrency !== 'Home Currency') {
    return statementCurrency;
  }

  return clientHomeCurrency || null;
};

const getClientStatements = async ({ clientId, query }) => {
  const client = await validateClient(clientId);

  const defaultOrderBy = 'date name';
  const defaultOrderDir = 'desc';

  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: Page.sortOrDefault(query.orderBy || defaultOrderBy, query.orderDir || defaultOrderDir),
    populate: {
      path: 'contractId',
      model: 'Contract',
      select: 'payees',
      // Link to Contracts and Payees to get Payee name. Note. assumed single Payee on Fuga Contract
      populate: { path: 'payees.payeeId', model: 'Payee', select: 'name' },
    },
    select: statementFields,
  };

  const result = await Statement.paginate({ clientId }, paginationParams);
  const statements = getStatements({ statements: result.docs, clientHomeCurrency: client.homeCurrency });

  return {
    statements,
    meta: {
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  };
};

const getTrack = async ({ curveUser, trackId, fugaId }) => {
  await validateClient(curveUser.clientId);

  const selectFields = 'clientId title version isrc duration totalParticipation artist salesReturnsRights fugaId alternativeId tags';
  const trackFilter = {
    clientId: curveUser.clientId,
    ...(trackId && { _id: trackId }),
    ...(fugaId && { fugaId }),
  };

  const track = await Track.findOne(trackFilter, selectFields).lean().exec();
  if (!track) throwError({ message: `Track not found with ID ${trackId || fugaId}`, code: 404, cause: 'TRACK_NOT_FOUND' });

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: track, clientOnly: true })) {
    throwError({ message: 'Forbidden', code: 403 });
  }

  const formattedTrack = await formatTrack(track);
  return formattedTrack;
};

const getTotalPercentage = (contracts) => {
  let totalPercentage = 0;

  // Parameter can be passed as string and then needs to be parsed
  if (contracts && !Array.isArray(contracts)) contracts = JSON.parse(contracts);
  if (!contracts) contracts = [];

  totalPercentage = contracts.reduce((acc, contract) => acc + contract.percentage, 0);

  return totalPercentage;
};

const upsertTracks = async ({ curveUser, trackData }) => {
  const { clientId } = curveUser;
  await validateClient(clientId);

  if (!trackData.fugaId && !trackData.trackId) {
    throwError({ message: 'FugaId or TrackId is required', code: 400, cause: 'FIELDS_REQUIRED', details: { missingFields: ['fugaId', 'trackId'], note: 'At least one is required' } });
  }

  const trackFilter = {
    clientId,
    ...(trackData.fugaId && { fugaId: trackData.fugaId }),
    ...(trackData.trackId && { _id: trackData.trackId }),
  };
  let track = await Track.findOne(trackFilter);

  // Check if contract percentages are less than or equal to 100
  const totalPercentage = getTotalPercentage(trackData.contracts);
  if (totalPercentage > 100 || totalPercentage < 0) throwError({ message: 'Total shares must be between 0 and 100', code: 400, cause: 'TOTAL_SHARES_LIMIT_EXCEEDED' });

  if (!track) {
    track = new Track({ clientId, isrc: trackData.isrc });
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: track, clientOnly: true })) {
    throwError({ message: 'Forbidden', code: 403 });
  }

  track = await updateTrack({ track, params: trackData, clientId });

  return formatTrack(track);
};

const upsertReleases = async ({ curveUser, releaseData }) => {
  const { clientId } = curveUser;
  await validateClient(clientId);

  if (!releaseData.fugaId) {
    throwError({ code: 400, cause: 'FIELDS_REQUIRED', message: 'FugaId is required', details: { missingFields: ['fugaId'] } });
  }

  // Check if contract percentages are less than or equal to 100
  const totalPercentage = getTotalPercentage(releaseData.contracts);
  if (totalPercentage > 100 || totalPercentage < 0) throwError({ message: 'Total shares must be between 0 and 100', code: 400, cause: 'TOTAL_SHARES_LIMIT_EXCEEDED' });

  const releaseFilter = {
    clientId,
    ...(releaseData.fugaId && { fugaId: releaseData.fugaId }),
    ...(releaseData.releaseId && { _id: releaseData.releaseId }),
  };
  let release = await Release.findOne(releaseFilter);

  if (!release) {
    release = new Release({ clientId, barcode: releaseData.barcode });
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: release, clientOnly: true })) {
    throwError({ message: 'Forbidden', code: 403 });
  }

  release = await updateRelease(release, releaseData);

  return formatRelease(release);
};

module.exports = {
  getWhiteLabelStatements,
  getWhiteLabelStatement,
  getFormattedStatement,
  getFormattedStatements,
  updateTrack,
  formatRelease,
  updateRelease,
  createPayee,
  createPayeeContractUser,
  formatPayees,
  getPayeeStatus,
  getPayeeAssociatedTracks,
  getPayeeAssociatedReleases,
  deletePayee,
  updateTrackErrorToFugaId,
  updateReleaseErrorToFugaId,
  getPeriods,
  getPeriod,
  getPeriodStatements,
  getStatement,
  publishAllStatements,
  emailAllStatements,
  validateEmailAddresses,
  emailSummary,
  updateBlockedStatus,
  getClientStatements,
  upsertTracks,
  getTrack,
  upsertReleases,
  getBulkSplitsById,
  getBulkSplits,
};
