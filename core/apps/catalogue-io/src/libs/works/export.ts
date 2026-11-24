import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { keyBy, chunk } from 'lodash';
import appRootDir from 'app-root-dir';
// @ts-expect-error — no type declarations for platform-shared-utils
import { logger, fileManager } from '@curveroyaltysystems/platform-shared-utils';
import archiver from 'archiver';

import { Client, Work, Contract, TerritoryGroup, Track, Composer, Publisher, DeliveryPartner } from '../../models';
import { sendWorksExportNotification } from '../exportNotification/exportNotification';
import { convertWorks } from './utils/xlsx';
import {
  workHeaders,
  workLiteHeaders,
  alternateTitlesHeaders,
  participatorsHeaders,
  specificParticipationRatesHeaders,
  societyIdentifiersHeaders,
  ipChainHeaders,
  partnerIpChainsHeaders,
} from './utils/csvHeaders';
import { createStream, writeCsvLine, closeStream } from '../exports/csv';

const uploadToS3 = promisify(fileManager.uploadToS3.bind(fileManager)) as (
  key: string,
  filePath: string,
) => Promise<string>;

const publicLink24Hours = promisify(fileManager.publicLink24Hours.bind(fileManager)) as (
  key: string,
) => Promise<string>;

const CSV_BATCH_PROCESSING_SIZE = 10_000;

export interface CurveUser {
  id: string;
  clientId: string;
  email: string;
}

export type WorkFilter = Record<string, unknown>;

export async function exportWorks(taskId: string, filter: WorkFilter, curveUser: CurveUser): Promise<void> {
  const { clientId, email } = curveUser;
  const logKey = `Client: ${clientId} | Task: ${taskId} | Export Works |`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = await Client.findById(clientId);
  if (!client) throw new Error(`Client with ID ${clientId} not found`);

  // Resolve work IDs — use pre-supplied IDs if available, otherwise fetch them
  let workIds: string[];
  const existingIds = (filter._id as { $in?: string[] } | undefined)?.$in;
  if (existingIds?.length) {
    workIds = existingIds;
  } else {
    const docs = await Work.find(filter).select({ _id: 1 }).lean() as { _id: { toString(): string } }[];
    workIds = docs.map((d) => d._id.toString());
  }

  const worksCount = workIds.length;
  const resolvedFilter: WorkFilter = { ...filter, _id: { $in: workIds } };

  logger.info(logKey, 'Total Works to export:', worksCount);

  try {
    const filePath = await createCsvExport({ logKey, client, filter: resolvedFilter, worksCount });

    logger.info(logKey, 'Export file created at:', filePath);

    const ext = filePath.split('.').pop();
    const s3Path = `exports/${client.name} Work Export ${moment().format('YYYYMMDDHHmmssSSS')}.${ext}`;
    const s3Key = await uploadToS3(s3Path, filePath);
    const downloadUrl = await publicLink24Hours(s3Key);

    logger.info(logKey, 'Sending download notification to:', email);
    await sendWorksExportNotification({ client, email, url: downloadUrl, isError: false });
  } catch (err) {
    logger.error(logKey, err);
    logger.info(logKey, 'Sending error notification to:', email);
    await sendWorksExportNotification({ client, email, url: null, isError: true });
    throw err;
  }
}

interface WithId { _id: { toString(): string } }
interface ContractLean extends WithId { name?: string }
interface TerritoryGroupLean extends WithId { name?: string }
interface TrackLean extends WithId { isrc?: string }
interface ComposerLean extends WithId { name?: string; firstName?: string; middleNames?: string; surname?: string; cae?: string }
interface PublisherLean extends WithId { name?: string; cae?: string }
interface DeliveryPartnerLean extends WithId { name?: string }
interface ClientDoc { _id: { toString(): string }; name: string; paymentTier?: string; features?: Record<string, boolean> }

async function getWorksExportData(client: ClientDoc) {
  const clientId: string = client._id.toString();

  const [contracts, territoryGroups, tracks, composers, publishers, deliveryPartners] = await Promise.all([
    Contract.find({ clientId }).select({ _id: 1, name: 1 }).lean() as Promise<ContractLean[]>,
    TerritoryGroup.find({ clientId }).select({ _id: 1, name: 1 }).lean() as Promise<TerritoryGroupLean[]>,
    Track.find({ clientId }).select({ _id: 1, isrc: 1 }).lean() as Promise<TrackLean[]>,
    Composer.find({ clientId }).select({ _id: 1, name: 1, firstName: 1, middleNames: 1, surname: 1, cae: 1 }).lean() as Promise<ComposerLean[]>,
    Publisher.find({ clientId }).select({ _id: 1, name: 1, cae: 1 }).lean() as Promise<PublisherLean[]>,
    client?.features?.partnerChains
      ? DeliveryPartner.find({ clientId }).select({ _id: 1, name: 1 }).lean() as Promise<DeliveryPartnerLean[]>
      : Promise.resolve([] as DeliveryPartnerLean[]),
  ]);

  return {
    contractsById: keyBy(contracts, (c) => c._id.toString()),
    territoryGroupsById: keyBy(territoryGroups, (g) => g._id.toString()),
    composersById: keyBy(composers, (c) => c._id.toString()),
    publishersById: keyBy(publishers, (p) => p._id.toString()),
    deliveryPartnersById: keyBy(deliveryPartners, (p) => p._id.toString()),
    trackIsrcsById: Object.fromEntries(tracks.flatMap((t) => t.isrc ? [[t._id.toString(), t.isrc]] : [])),
  };
}

async function createCsvExport({
  logKey,
  client,
  filter,
  worksCount,
}: {
  logKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  filter: WorkFilter;
  worksCount: number;
}): Promise<string> {
  logger.info(logKey, 'Exporting works in format: CSV');
  logger.info(logKey, 'Fetching related export data...');
  const worksExportData = await getWorksExportData(client);

  const partnerChainsEnabled = !!client?.features?.partnerChains;
  const currentDate = moment().format('DD-MM-YYYY HH_mm_sss');
  const root = appRootDir.get() as string;
  const baseFilePath = `${root}/tmp/Work Export - ${currentDate}`;

  const headers = client.paymentTier !== 'Lite' ? workHeaders : workLiteHeaders;

  const worksFilePath = `${baseFilePath}.csv`;
  const alternateTitlesFilePath = `${baseFilePath} - Alternate Titles.csv`;
  const participatorsFilePath = `${baseFilePath} - Participation Rates.csv`;
  const specificParticipationRatesFilePath = `${baseFilePath} - Specific Participation Rates.csv`;
  const societyIdentifiersFilePath = `${baseFilePath} - Society Identifiers.csv`;
  const ipChainFilePath = `${baseFilePath} - IP Chains.csv`;
  const partnerIpChainsFilePath = `${baseFilePath} - Partner IP Chains.csv`;

  const worksCsvStream = createStream(worksFilePath, headers);
  const alternateTitlesCsvStream = createStream(alternateTitlesFilePath, alternateTitlesHeaders);
  const participatorsCsvStream = createStream(participatorsFilePath, participatorsHeaders);
  const specificParticipationRatesCsvStream = createStream(specificParticipationRatesFilePath, specificParticipationRatesHeaders);
  const societyIdentifiersCsvStream = createStream(societyIdentifiersFilePath, societyIdentifiersHeaders);
  const ipChainCsvStream = createStream(ipChainFilePath, ipChainHeaders);
  const partnerIpChainsCsvStream = partnerChainsEnabled
    ? createStream(partnerIpChainsFilePath, partnerIpChainsHeaders)
    : null;

  const ids = (filter._id as { $in: string[] }).$in;
  const totalBatches = Math.ceil(worksCount / CSV_BATCH_PROCESSING_SIZE);
  const batchedIds = chunk(ids, CSV_BATCH_PROCESSING_SIZE);

  let currentBatch = 0;
  for (const batchIds of batchedIds) {
    logger.info(logKey, `Exporting batch of works (${currentBatch + 1}/${totalBatches})`);
    const worksBatch = await Work.find({ clientId: client._id.toString(), _id: { $in: batchIds } }).lean();

    const [works, titles, participators, rights, identifiers, rightsChains, partnerRightsChains] = convertWorks({
      client,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      works: worksBatch as any[],
      ...worksExportData,
    });

    for (const work of works) writeCsvLine(worksCsvStream, work);
    for (const title of titles) writeCsvLine(alternateTitlesCsvStream, title);
    for (const participator of participators) writeCsvLine(participatorsCsvStream, participator);
    for (const identifier of identifiers) writeCsvLine(societyIdentifiersCsvStream, identifier);
    for (const rate of rights) writeCsvLine(specificParticipationRatesCsvStream, rate);
    for (const rightsChain of rightsChains) writeCsvLine(ipChainCsvStream, rightsChain);
    if (partnerChainsEnabled && partnerIpChainsCsvStream) {
      for (const partnerRightsChain of partnerRightsChains) {
        writeCsvLine(partnerIpChainsCsvStream, partnerRightsChain);
      }
    }

    currentBatch += 1;
  }

  await closeStream(worksCsvStream);
  await closeStream(alternateTitlesCsvStream);
  await closeStream(participatorsCsvStream);
  await closeStream(specificParticipationRatesCsvStream);
  await closeStream(societyIdentifiersCsvStream);
  await closeStream(ipChainCsvStream);
  if (partnerChainsEnabled && partnerIpChainsCsvStream) {
    await closeStream(partnerIpChainsCsvStream);
  }

  const allFilesZipPath = `${baseFilePath}.zip`;
  const outputStream = fs.createWriteStream(allFilesZipPath);
  const zipStream = archiver('zip', { zlib: { level: 9 } });
  zipStream.pipe(outputStream);

  zipStream.append(fs.createReadStream(worksFilePath), { name: path.basename(worksFilePath) });
  zipStream.append(fs.createReadStream(alternateTitlesFilePath), { name: path.basename(alternateTitlesFilePath) });
  zipStream.append(fs.createReadStream(participatorsFilePath), { name: path.basename(participatorsFilePath) });
  zipStream.append(fs.createReadStream(specificParticipationRatesFilePath), { name: path.basename(specificParticipationRatesFilePath) });
  zipStream.append(fs.createReadStream(societyIdentifiersFilePath), { name: path.basename(societyIdentifiersFilePath) });
  zipStream.append(fs.createReadStream(ipChainFilePath), { name: path.basename(ipChainFilePath) });
  if (partnerChainsEnabled) {
    zipStream.append(fs.createReadStream(partnerIpChainsFilePath), { name: path.basename(partnerIpChainsFilePath) });
  }

  await zipStream.finalize();

  const zipFinished = new Promise<void>((resolve, reject) => {
    const onFinish = () => {
      outputStream.removeListener('error', onError);
      resolve();
    };
    const onError = (err: Error) => {
      outputStream.removeListener('finish', onFinish);
      reject(err);
    };
    outputStream.once('finish', onFinish);
    outputStream.once('error', onError);
  });

  outputStream.end();
  await zipFinished;

  return allFilesZipPath;
}
