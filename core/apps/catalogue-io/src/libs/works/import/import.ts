// @ts-expect-error — no type declarations for platform-shared-utils
import { logger } from '@curveroyaltysystems/platform-shared-utils';
// @ts-expect-error — no type declarations for platform-shared-utils
import { WorkPreSave, TerritoryHelper } from '@curveroyaltysystems/curve-shared-logic';
import moment from 'moment';
import { createInterface } from 'readline';
import fs from 'fs';
import appRootDirModule from 'app-root-dir';
import { Types } from '@curveroyaltysystems/models/mongoose';
import { Client, Work, DeliveredWork, Composer, Publisher, TerritoryGroup, Track, Contract } from '../../../models';
import { type ClientDocument, type WorkDocument } from '../../../models';
import { getDataByTemplate as csvGetDataByTemplate } from '../utils/importCSV';
import {
  IMPORT_FILES, WORKS_TEMPLATE, LITE_WORKS_TEMPLATE, ALTERNATE_TITLES_TEMPLATE,
  PARTICIPATORS_TEMPLATE, SPECIFIC_RATES_TEMPLATE, SOCIETY_IDENTIFIERS_TEMPLATE,
  IP_CHAINS_TEMPLATE, PARTNER_IP_CHAINS_TEMPLATE,
  WORK_DESCRIPTION_CATEGORIES, WORK_LANGUAGES, COMPOSITE_TYPES, VERSION_TYPES,
  ARRANGEMENT_TYPES, LYRIC_ADAPTION_TYPES, allTerritories,
} from './import.constants';
import {
  writeArrayToFile, turnArrayIntoIndexedObject, isObjectPopulated,
  getItemsFromIndexedObject, createMissingTracksUsingWorks, findRelatedTracks,
  withConcurrency, writeIndexedObjectToFile, readIndexedObjectForBatch,
} from './import-utils';
import {
  formatIpChainComposerNames, getComposersPublishersFromChain, saveChainComposersPublishers,
  addIpChains, addPartnerIpChains, buildComposerPublisherMaps,
} from './import-ip-chain';
import type { ImportFileName } from './import.constants';
import type {
  CurveUser, ImportFile, ImportRow, IndexedObject, IndexedComposersPublishers,
  WorkDataAccumulator,
} from './import.types';

export type { CurveUser, ImportFile };

const appRootDir = appRootDirModule.get();
const { ObjectId } = Types;

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export async function importFromExcel(
  files: Record<ImportFileName, ImportFile>,
  curveUser: CurveUser,
  overwriteBlanks: boolean,
): Promise<void> {
  const file = files[IMPORT_FILES.WORKS];
  let client: ClientDocument | null = null;
  const workData: WorkDataAccumulator = {};

  try {
    client = await Client.findById(curveUser.clientId, 'dateFormat paymentTier features catalogueGroups distributionChannels issueIdentifier identifierPrefix identifierStartFrom') as ClientDocument;
    if (!client) throw Error(`Can't find a client with the ID ${curveUser.clientId}`);

    const dateFormat = client?.dateFormat ? client.dateFormat.toUpperCase() : '';

    const [contractDocs, territoryGroupDocs, publisherDocs, composerDocs] = await Promise.all([
      Contract.find({ clientId: curveUser.clientId }, '_id name').lean(),
      TerritoryGroup.find({ clientId: curveUser.clientId }, '_id name territories').lean(),
      Publisher.find({ clientId: curveUser.clientId }, '_id name lowerCaseName cae caeWithoutLeadingZeros').lean(),
      Composer.find({ clientId: curveUser.clientId }, '_id name lowerCaseName cae caeWithoutLeadingZeros firstName middleNames surname').lean(),
    ]);
    const contractByName  = new Map(contractDocs.map(c => [c.name as string, c._id]));
    const territoryByName = new Map(territoryGroupDocs.map(g => [g.name as string, { _id: g._id, territories: g.territories as string[] }]));
    const composerPublisherMaps = buildComposerPublisherMaps(
      publisherDocs as unknown as Record<string, unknown>[],
      composerDocs as unknown as Record<string, unknown>[],
    );

    let totalWorks = 0;
    const identifiers = ['_id', 'identifier', 'tunecode', 'title'];

    // Get import files data — processed sequentially with block scopes so each
    // CSV array is GC-eligible before the next sheet is parsed.
    try {
      {
        const worksTemplate = client!.paymentTier === 'Lite' ? LITE_WORKS_TEMPLATE : WORKS_TEMPLATE;
        const worksData = await csvGetDataByTemplate(files[IMPORT_FILES.WORKS].path, worksTemplate, dateFormat) as unknown as ImportRow[];
        logger.debug('Import Template: Got the Works data');
        totalWorks = worksData.length;
        workData.works = await writeArrayToFile(worksData, 'Works');
      }

      {
        const data = await csvGetDataByTemplate(files[IMPORT_FILES.ALTERNATE_TITLES].path, ALTERNATE_TITLES_TEMPLATE, dateFormat) as unknown as ImportRow[];
        logger.debug('Import Template: Got the Alternate Titles data');
        workData.alternateTitlesFile = await writeIndexedObjectToFile(turnArrayIntoIndexedObject(data, identifiers), 'AltTitles');
      }

      {
        const data = await csvGetDataByTemplate(files[IMPORT_FILES.PARTICIPATORS].path, PARTICIPATORS_TEMPLATE, dateFormat) as unknown as ImportRow[];
        logger.debug('Import Template: Got the Participators data');
        workData.participatorsFile = await writeIndexedObjectToFile(turnArrayIntoIndexedObject(data, identifiers), 'Participators');
      }

      {
        const data = await csvGetDataByTemplate(files[IMPORT_FILES.SPECIFIC_PARTICIPATION_RATES].path, SPECIFIC_RATES_TEMPLATE, dateFormat) as unknown as ImportRow[];
        logger.debug('Import Template: Got the Specific Participation Rates data');
        workData.specificRightsFile = await writeIndexedObjectToFile(turnArrayIntoIndexedObject(data, identifiers), 'SpecificRights');
      }

      {
        const data = await csvGetDataByTemplate(files[IMPORT_FILES.SOCIETY_IDENTIFIERS].path, SOCIETY_IDENTIFIERS_TEMPLATE, dateFormat) as unknown as ImportRow[];
        logger.debug('Import Template: Got the Indentifiers data');
        workData.societyIdentifiersFile = await writeIndexedObjectToFile(turnArrayIntoIndexedObject(data, identifiers), 'SocietyIdentifiers');
      }

      // CSV exports from Excel strip leading zeros from numeric strings.
      // CAE numbers must be 11 digits — restore zero-padding here so that
      // the raw caeNumber stored on chain nodes matches what Excel imports
      // would produce, and so buildUniquePublisherKey produces consistent keys.
      {
        const data = await csvGetDataByTemplate(files[IMPORT_FILES.IP_CHAINS].path, IP_CHAINS_TEMPLATE, dateFormat) as unknown as ImportRow[];
        data.forEach((row) => {
          for (const key of Object.keys(row)) {
            if (key.endsWith('CaeNumber') && typeof row[key] === 'string' && /^\d+$/.test(row[key] as string)) {
              row[key] = (row[key] as string).padStart(11, '0');
            }
          }
        });
        logger.debug('Import Template: Got the Ip Chain data');
        if (data?.length) formatIpChainComposerNames(data);
        workData.ipChainFile = await writeIndexedObjectToFile(turnArrayIntoIndexedObject(data, identifiers), 'IpChain');
        const { errors: chainErrors, indexed } = await getComposersPublishersFromChain(data, curveUser.clientId, composerPublisherMaps);
        if (chainErrors.length !== 0) throw new Error(chainErrors.join(', '));
        workData.indexedComposersPublishers = indexed;
      }

      if (client!.features?.partnerChains) {
        let data = await csvGetDataByTemplate(files[IMPORT_FILES.PARTNER_IP_CHAINS].path, PARTNER_IP_CHAINS_TEMPLATE, dateFormat) as unknown as ImportRow[];
        logger.debug('Import Template: Got the Partner Ip Chains data');
        data.forEach((row) => {
          for (const key of Object.keys(row)) {
            if (key.endsWith('CaeNumber') && typeof row[key] === 'string' && /^\d+$/.test(row[key] as string)) {
              row[key] = (row[key] as string).padStart(11, '0');
            }
          }
        });
        if (data.length) {
          data = formatIpChainComposerNames(data);
          workData.partnerRightsChainsFile = await writeIndexedObjectToFile(turnArrayIntoIndexedObject(data, [...identifiers, 'partnerName']), 'PartnerRightsChains');
          const { errors: partnerChainErrors, indexed: partnerIndexed } = await getComposersPublishersFromChain(data, curveUser.clientId, composerPublisherMaps);
          if (partnerChainErrors.length > 0) throw new Error(partnerChainErrors.join(', '));
          workData.indexedPartnerComposersPublishers = partnerIndexed;
        }
      }
    } catch (error) {
      logger.error(error);
      let errorMessage = String(error instanceof Error ? error.message : error);
      if (typeof error === 'string' && (error === 'Template does not match' || error === 'Data must be an Array')) {
        errorMessage = 'It appears the template does not match';
      }
      await NotificationGeneratePlaceholder('Your Work Import Has Errored', `${errorMessage} in file ${file.originalname}`, null, curveUser, {
        identifier: 'importError',
        curveUser,
        client,
        subject: 'Your Work Import Has Errored',
        file: file.originalname,
        error: [errorMessage],
      });
      [
        workData.works,
        workData.alternateTitlesFile,
        workData.participatorsFile,
        workData.specificRightsFile,
        workData.societyIdentifiersFile,
        workData.ipChainFile,
        workData.partnerRightsChainsFile,
      ].forEach((f) => { if (f) fs.unlinkSync(f); });
      return;
    }

    const { errors: importErrors, count, outputLocation: importedWorks } = await importWorks(
      workData.works!,
      workData.alternateTitlesFile!,
      workData.participatorsFile!,
      workData.specificRightsFile!,
      workData.societyIdentifiersFile!,
      workData.ipChainFile!,
      workData.partnerRightsChainsFile,
      workData.indexedComposersPublishers!,
      workData.indexedPartnerComposersPublishers,
      curveUser.clientId,
      overwriteBlanks,
      client!,
      contractByName,
      territoryByName,
    );

    let errors = importErrors;
    if (errors && errors.length > 0) {
      logger.error(errors);
      if (errors[0] === 'Data must be an Array') {
        errors = ['It appears the template does not match. Try downloading and checking our most up to date templates to ensure it matches.'];
      }
      await NotificationGeneratePlaceholder('Your Work Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, {
        identifier: 'importError',
        curveUser,
        client,
        subject: 'Your Work Import Has Errored',
        file: file.originalname,
        error: errors,
      });
      [
        workData.works,
        workData.alternateTitlesFile,
        workData.participatorsFile,
        workData.specificRightsFile,
        workData.societyIdentifiersFile,
        workData.ipChainFile,
        workData.partnerRightsChainsFile,
        importedWorks,
      ].forEach((f) => { if (f) fs.unlinkSync(f); });
      return;
    }

    const partialImportErrors: string[] = [];
    let workCount = 0;
    await saveChainComposersPublishers(workData.indexedComposersPublishers, partialImportErrors);

    const saveRl = createInterface({
      input: fs.createReadStream(importedWorks),
      crlfDelay: Infinity,
    });

    const clientRec = client as unknown as Record<string, unknown>;

    for await (const line of saveRl) {
      if (line !== 'Last_Line_Ignore') {
        const parsedBatch = JSON.parse(line) as ImportRow[];

        // Single query to load all works in this batch that already exist in the DB
        const ids = parsedBatch.map(w => w._id).filter(Boolean);
        const existingWorks = await Work.find({ _id: { $in: ids } });
        const existingById = new Map(existingWorks.map(w => [String((w as unknown as Record<string, unknown>)._id), w]));

        // Pre-assign sequential identifiers and partyNos so issueIdentifier / issuePartyNo
        // in preSave both exit early, making concurrent preSave calls safe
        const [lastIdentifierWork, lastPartyNoWork] = await Promise.all([
          Work.findOne({ clientId: curveUser.clientId }, { identifierNo: 1 }).sort({ identifierNo: -1 }).lean() as Promise<{ identifierNo?: number } | null>,
          Work.findOne({ clientId: curveUser.clientId }, { partyNo: 1 }).sort({ partyNo: -1 }).lean() as Promise<{ partyNo?: number } | null>,
        ]);
        let nextIdentifierNo = Math.max(
          lastIdentifierWork?.identifierNo ?? 0,
          ((clientRec.identifierStartFrom as number | undefined) ?? 1) - 1,
        );
        let nextPartyNo = lastPartyNoWork?.partyNo ?? 0;

        // Build work documents
        const preparedWorks: WorkDocument[] = [];
        for (const importedWork of parsedBatch) {
          workCount += 1;
          logger.info(`Client ${importedWork.clientId}: Importing Work ${workCount}/${totalWorks}`);
          try {
            const iw = importedWork as Record<string, unknown>;
            const existing = existingById.get(String(importedWork._id));
            let work: WorkDocument;

            if (existing) {
              work = existing;
              for (const key of Object.keys(importedWork)) {
                (work as unknown as Record<string, unknown>)[key] = iw[key];
              }
            } else {
              if (clientRec.issueIdentifier && (!importedWork.identifier || iw._creationType === 'unmapped')) {
                nextIdentifierNo += 1;
                iw.identifierNo = nextIdentifierNo;
                importedWork.identifier = clientRec.identifierPrefix
                  ? `${clientRec.identifierPrefix}${nextIdentifierNo}`
                  : String(nextIdentifierNo);
              }
              work = new Work(importedWork) as unknown as WorkDocument;
            }

            nextPartyNo += 1;
            (work as unknown as Record<string, unknown>).partyNo = nextPartyNo;
            if (!(work as unknown as Record<string, unknown>).createdBy) {
              (work as unknown as Record<string, unknown>).createdBy = curveUser.id;
            }
            (work as unknown as Record<string, unknown>).lastModifiedBy = curveUser.id;
            preparedWorks.push(work);
          } catch (error) {
            logger.error(`Error preparing work '${importedWork._id}': ${error}`);
          }
        }

        // Run preSave concurrently — sequential counters handled by pre-assignment above
        const readyToSave: WorkDocument[] = [];
        await withConcurrency(preparedWorks, 20, async (work) => {
          try {
            await WorkPreSave.preSave({ work, Work, Client, DeliveredWork, Composer, Publisher, TerritoryGroup });
            readyToSave.push(work);
          } catch (error) {
            partialImportErrors.push(`Work ${(work as unknown as Record<string, unknown>).title} did not save - ${(error as Error).message || error}`);
          }
        });

        if (readyToSave.length > 0) {
          // Sub-batch the writes to cap per-request payload to MongoDB
          const WRITE_BATCH_SIZE = 500;
          const writeChunks = Array.from(
            { length: Math.ceil(readyToSave.length / WRITE_BATCH_SIZE) },
            (_, i) => readyToSave.slice(i * WRITE_BATCH_SIZE, (i + 1) * WRITE_BATCH_SIZE),
          );
          for (const chunk of writeChunks) {
            try {
              await Work.bulkWrite(
                chunk.map(w => {
                  const doc = (w as unknown as { toObject(): Record<string, unknown> }).toObject();
                  const { _id } = doc;
                  const fields = Object.fromEntries(Object.entries(doc).filter(([k]) => k !== '_id' && k !== '__v'));
                  return { updateOne: { filter: { _id }, update: { $set: fields }, upsert: true } };
                }),
                { ordered: false },
              );
            } catch (err: unknown) {
              const bulkErr = err as { writeErrors?: Array<{ index: number; errmsg?: string }> };
              if (bulkErr.writeErrors?.length) {
                for (const writeError of bulkErr.writeErrors) {
                  const failed = chunk[writeError.index] as unknown as Record<string, unknown>;
                  partialImportErrors.push(`Work ${failed?.title ?? 'unknown'} did not save - ${writeError.errmsg ?? String(err)}`);
                }
              } else {
                partialImportErrors.push(`Batch write failed: ${(err as Error).message || err}`);
              }
            }
          }
        }
      }
    }

    if (partialImportErrors.length > 0) {
      await NotificationGeneratePlaceholder(
        'Your Work Import Was Partially Successful',
        `${partialImportErrors.length} errors in file ${file.originalname}`,
        null,
        curveUser,
        {
          identifier: 'partialImportError',
          curveUser,
          client,
          subject: 'Your Work Import Was Partially Successful',
          file: file.originalname,
          error: partialImportErrors,
        },
      );
    } else {
      await NotificationGeneratePlaceholder(
        'Your Work Import Has Completed',
        `${count} Works imported in file ${file.originalname}`,
        null,
        curveUser,
        {
          identifier: 'importComplete',
          curveUser,
          client,
          subject: 'Your Work Import Has Completed',
          file: file.originalname,
          count,
        },
      );
    }

    [
      workData.works,
      workData.alternateTitlesFile,
      workData.participatorsFile,
      workData.specificRightsFile,
      workData.societyIdentifiersFile,
      workData.ipChainFile,
      workData.partnerRightsChainsFile,
      importedWorks,
    ].forEach((f) => { if (f) fs.unlinkSync(f); });
  } catch (e) {
    await NotificationGeneratePlaceholder('Your Work Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, {
      identifier: 'importError',
      curveUser,
      client,
      subject: 'Your Work Import Has Errored',
      file: file.originalname,
      error: [e],
    });
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function importWorks(
  works: string,
  alternateTitlesFile: string,
  participatorsFile: string,
  specificRightsFile: string,
  societyIdentifiersFile: string,
  ipChainsFile: string,
  partnerRightsChainsFile: string | undefined,
  indexedComposersPublishers: IndexedComposersPublishers,
  indexedPartnerComposersPublishers: IndexedComposersPublishers | undefined,
  clientId: string,
  overwriteBlanks: boolean,
  client: ClientDocument,
  contractByName: Map<string, unknown>,
  territoryByName: Map<string, { _id: unknown; territories: string[] }>,
): Promise<{ errors: string[]; count: number; outputLocation: string }> {
  if (!clientId) {
    return { errors: ['A Client ID must be passed'], count: 0, outputLocation: '' };
  }

  let count = 0;
  let errors: string[] = [];
  let index = 0;
  const outputLocation = `${appRootDir}/tmp/ImportedWorks${moment().format('x')}.json`;
  const importedWorks = fs.createWriteStream(outputLocation);
  let importBatch: ImportRow[] = [];
  const identifiersTracker: Record<string, { count: number; lines: number[]; field: string; value: string }> = {};

  const rl = createInterface({
    input: fs.createReadStream(works),
    crlfDelay: Infinity,
  });

  for await (const batch of rl) {
    if (batch !== 'Last_Line_Ignore') {
      logger.debug(`Import: Processing batch ${index + 1}`);
      const batchValidation = `Client ${clientId}: Validating Work Batch ${5000 * index} - ${5000 * (index + 1)}`;
      console.time(batchValidation);
      index += 1;
      const parsedBatch = JSON.parse(batch) as ImportRow[];

      await createMissingTracksUsingWorks(clientId, parsedBatch);

      const batchIdentifiers = ['_id', 'identifier', 'tunecode', 'title'];
      const batchIds = parsedBatch
        .filter(w => w._id && ObjectId.isValid(String(w._id)))
        .map(w => new ObjectId(String(w._id)));
      const batchWorkIdentifiers = parsedBatch.map(w => w.identifier).filter(Boolean) as string[];
      const orClauses: Record<string, unknown>[] = [];
      if (batchIds.length) orClauses.push({ _id: { $in: batchIds } });
      if (batchWorkIdentifiers.length) orClauses.push({ identifier: { $in: batchWorkIdentifiers } });

      const [alternateTitles, participators, specificRights, societyIdentifiers, ipChains, partnerRightsChains, existingWorkDocs] = await Promise.all([
        readIndexedObjectForBatch(alternateTitlesFile, parsedBatch, batchIdentifiers),
        readIndexedObjectForBatch(participatorsFile, parsedBatch, batchIdentifiers),
        readIndexedObjectForBatch(specificRightsFile, parsedBatch, batchIdentifiers),
        readIndexedObjectForBatch(societyIdentifiersFile, parsedBatch, batchIdentifiers),
        readIndexedObjectForBatch(ipChainsFile, parsedBatch, batchIdentifiers),
        partnerRightsChainsFile
          ? readIndexedObjectForBatch(partnerRightsChainsFile, parsedBatch, batchIdentifiers)
          : Promise.resolve({} as IndexedObject),
        orClauses.length
          ? Work.find({ clientId, $or: orClauses }) as Promise<WorkDocument[]>
          : Promise.resolve([] as WorkDocument[]),
      ]);

      const existingById = new Map<string, WorkDocument>(
        (existingWorkDocs as WorkDocument[]).map(w => [String((w as unknown as Record<string, unknown>)._id), w]),
      );
      const existingByIdentifier = new Map<string, WorkDocument>(
        (existingWorkDocs as WorkDocument[])
          .filter(w => (w as unknown as Record<string, unknown>).identifier)
          .map(w => [String((w as unknown as Record<string, unknown>).identifier), w]),
      );

      for (const work of parsedBatch) {
        if (isObjectPopulated(work)) {
          for (const [field, value] of [
            ['identifier', work.identifier],
            ['tunecode', work.tunecode],
            ['iswc', work.iswc],
          ] as [string, string | undefined][]) {
            if (value) {
              const key = `${field}:${value}`;
              if (!identifiersTracker[key]) { identifiersTracker[key] = { count: 0, lines: [], field, value }; }
              identifiersTracker[key]!.count += 1;
              identifiersTracker[key]!.lines.push(work.line ?? 0);
            }
          }
          try {
            const importedWork = await importWork(
              work, alternateTitles, participators, specificRights, societyIdentifiers,
              ipChains, partnerRightsChains, indexedComposersPublishers,
              indexedPartnerComposersPublishers, clientId, overwriteBlanks, index,
              client, contractByName, territoryByName, existingById, existingByIdentifier,
            );
            if (importedWork) {
              count += 1;
              importBatch.push(importedWork);
            }
          } catch (err) {
            if (Array.isArray(err)) {
              errors = errors.concat(err as string[]);
            } else {
              errors.push(`Line ${index + 3}: ${err}`);
            }
          }
          if (importBatch.length === 5000) {
            importedWorks.write(`${JSON.stringify(importBatch)}\n`);
            importBatch = [];
          }
        }
      }
      console.timeEnd(batchValidation);
    }
  }

  logger.info(`Client ${clientId}: Done validating Works, now saving..`);
  if (importBatch.length !== 0) {
    importedWorks.write(`${JSON.stringify(importBatch)}\n`);
  }
  importedWorks.write('Last_Line_Ignore');
  importedWorks.end();
  const fieldLabel: Record<string, string> = { identifier: 'Identifier', tunecode: 'Tunecode', iswc: 'ISWC' };
  Object.values(identifiersTracker).forEach(({ count, lines, field, value }) => {
    if (count > 1) {
      lines.forEach((line) => {
        errors.push(`Line ${line}: ${fieldLabel[field] ?? field} ${value} is required to be unique`);
      });
    }
  });
  errors = errors.filter((value, index, self) => self.indexOf(value) === index);

  return { errors, count, outputLocation };
}

async function importWork(
  data: ImportRow,
  alternateTitles: IndexedObject,
  participators: IndexedObject,
  specificRights: IndexedObject,
  societyIdentifiers: IndexedObject,
  ipChains: IndexedObject,
  partnerRightsChains: IndexedObject | undefined,
  indexedComposersPublishers: IndexedComposersPublishers,
  indexedPartnerComposersPublishers: IndexedComposersPublishers | undefined,
  clientId: string,
  overwriteBlanks: boolean,
  index: number,
  client: ClientDocument,
  contractByName: Map<string, unknown>,
  territoryByName: Map<string, { _id: unknown; territories: string[] }>,
  existingById: Map<string, WorkDocument>,
  existingByIdentifier: Map<string, WorkDocument>,
): Promise<ImportRow | null> {
  if (!data) {
    throw new Error('Work must be passed');
  }
  if (!data.title || data.title === '') {
    return null;
  }

  try {
    let errors: string[] = [];
    let work: WorkDocument | null = null;
    if (data._id && ObjectId.isValid(data._id)) {
      work = existingById.get(String(new ObjectId(data._id))) ?? null;
    } else if (data.identifier) {
      work = existingByIdentifier.get(data.identifier) ?? null;
    }

    if (!work) {
      work = new Work({ clientId, identifier: data.identifier });
      if (data.identifier || overwriteBlanks) { (work as unknown as Record<string, unknown>).identifier = data.identifier; }
    }

    const w = work as unknown as Record<string, unknown>;
    if (data.title || overwriteBlanks) { w.title = data.title; }
    if (data.alternateTitles || overwriteBlanks) { w.alternateTitles = data.alternateTitles; }
    if (data.composer || overwriteBlanks) { w.composer = data.composer; }
    if (data.foreignId || overwriteBlanks) { w.foreignId = data.foreignId; }
    if (data.projectId || overwriteBlanks) { w.projectId = data.projectId; }
    if (data.iswc || overwriteBlanks) { w.iswc = data.iswc; }
    if (data.tunecode || overwriteBlanks) { w.tunecode = data.tunecode; }
    if (data.copyrightDate || overwriteBlanks) { w.copyrightDate = data.copyrightDate; }
    if (data.labelCopy || overwriteBlanks) { w.labelCopy = data.labelCopy; }
    if (data.performers || overwriteBlanks) { w.performers = data.performers; }
    if (data.priority || data.priority === false || overwriteBlanks) { w.priority = data.priority; }
    if (data.productionLibrary || data.productionLibrary === false || overwriteBlanks) { w.productionLibrary = data.productionLibrary; }
    if (data.compositeCount || overwriteBlanks) { w.compositeCount = data.compositeCount; }
    if (WORK_DESCRIPTION_CATEGORIES.includes(data.workDescriptionCategory ?? '') || data.workDescriptionCategory === '' || !data.workDescriptionCategory) {
      w.workDescriptionCategory = data.workDescriptionCategory;
    } else {
      errors.push(`Line ${data.line}: Category doesn't match list`);
    }
    if (WORK_LANGUAGES.includes(data.workLanguage ?? '') || data.workLanguage === '' || !data.workLanguage) {
      w.workLanguage = data.workLanguage;
    } else {
      errors.push(`Line ${data.line}: Language doesn't match list`);
    }
    if (COMPOSITE_TYPES.includes(data.compositeType ?? '') || data.compositeType === '' || !data.compositeType) {
      w.compositeType = data.compositeType;
    } else {
      errors.push(`Line ${data.line}: Composite Type doesn't match list`);
    }
    if (VERSION_TYPES.includes(data.versionType ?? '') || data.versionType === '' || !data.versionType) {
      w.versionType = data.versionType;
    } else {
      errors.push(`Line ${data.line}: Work Version doesn't match list`);
    }
    if (ARRANGEMENT_TYPES.includes(data.arrangementType ?? '') || data.arrangementType === '' || !data.arrangementType) {
      w.arrangementType = data.arrangementType;
    } else {
      errors.push(`Line ${data.line}: Arrangement Type doesn't match list`);
    }
    if (LYRIC_ADAPTION_TYPES.includes(data.lyricAdaptionType ?? '') || data.lyricAdaptionType === '' || !data.lyricAdaptionType) {
      w.lyricAdaptionType = data.lyricAdaptionType;
    } else {
      errors.push(`Line ${data.line}: Lyric Adaption doesn't match list`);
    }
    if (data.notes || overwriteBlanks) { w.notes = data.notes; }
    if ((data.aliases && data.aliases.length !== 0) || overwriteBlanks) { w.aliases = data.aliases?.filter(Boolean) ?? []; }

    if (overwriteBlanks) { work.territories = []; }
    if (data.territories && Array.isArray(data.territories) && data.territories.length) {
      if (data.territories.length === 1) {
        if (data.territories[0] === 'WW' || data.territories[0] === 'world' || data.territories[0] === 'World') {
          work.territories = TerritoryHelper.allTerritories;
        } else {
          const tg = territoryByName.get(data.territories[0]!);
          (work as unknown as Record<string, unknown>).territories = tg ? tg.territories : data.territories;
        }
      } else {
        work.territories = data.territories;
      }
    }

    if ((data.catalogueGroups && data.catalogueGroups.length !== 0) || overwriteBlanks) {
      work.catalogueGroups = [];
      if (data.catalogueGroups && data.catalogueGroups.length > 0) {
        data.catalogueGroups.forEach((catGroup) => {
          if (client.catalogueGroups.indexOf(catGroup) !== -1) {
            work!.catalogueGroups.push(catGroup);
          } else {
            errors.push(`Line ${data.line}: Catalogue Group ${catGroup} doesn't match list`);
          }
        });
      }
    }

    await findRelatedTracks(work, data, Track);

    errors = errors.concat(await addAlternateTitles(work as unknown as Record<string, unknown>, alternateTitles, clientId, overwriteBlanks));
    errors = errors.concat(await addParticipators(work as unknown as Record<string, unknown>, participators, overwriteBlanks, contractByName));

    const contractErr = checkMultipleContracts(work as unknown as Record<string, unknown>);
    if (contractErr) { errors.push(`Line ${data.line}: ${contractErr}`); }

    errors = errors.concat(await addSpecificRights(work as unknown as Record<string, unknown>, specificRights, overwriteBlanks, contractByName, territoryByName, client));
    errors = errors.concat(await addSocietyIdentifiers(work as unknown as Record<string, unknown>, societyIdentifiers, clientId, overwriteBlanks));
    errors = errors.concat(await addIpChains(work as unknown as Record<string, unknown>, ipChains, indexedComposersPublishers, clientId, overwriteBlanks, territoryByName));

    if (partnerRightsChains) {
      errors = errors.concat(await addPartnerIpChains(work as unknown as Record<string, unknown>, partnerRightsChains, indexedPartnerComposersPublishers, clientId, overwriteBlanks, territoryByName));
    }

    if (errors.length > 0) {
      throw errors;
    }

    await validateWork(work);
    return work as unknown as ImportRow;
  } catch (e) {
    if (Array.isArray(e)) throw e;
    logger.error(e);
    throw new Error('An unknown error occurred when ingesting this work. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
}

async function addAlternateTitles(
  work: Record<string, unknown>,
  indexedAltTitles: IndexedObject,
  clientId: string,
  overwriteBlanks: boolean,
): Promise<string[]> {
  const errors: string[] = [];
  if (overwriteBlanks) {
    work.alternateTitles = [];
  }
  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const titles = getItemsFromIndexedObject(work, indexedAltTitles, identifiers);

  if (titles.length === 0) {
    return errors;
  }

  work.alternateTitles = [];
  for (const title of titles) {
    if (isObjectPopulated(title)) {
      if (!title.altTitle) {
        errors.push(`Alternate Title Line ${title.line}: Title is required`);
      }
      if (title.altTitle) {
        (work.alternateTitles as Array<unknown>).push({ title: title.altTitle, language: title.language });
      }
    }
  }
  return errors;
}

async function addParticipators(
  work: Record<string, unknown>,
  indexedParticipators: IndexedObject,
  overwriteBlanks: boolean,
  contractByName: Map<string, unknown>,
): Promise<string[]> {
  const errors: string[] = [];
  if (overwriteBlanks) {
    work.salesReturnsRights = [];
    work.salesReturnsRightsDisplay = [];
  }
  for (const indexedParticipator of Object.values(indexedParticipators)) {
    const nestedParticipator = indexedParticipator[0];
    if (nestedParticipator && ((nestedParticipator.contractName && (nestedParticipator.percentage !== 0 && !nestedParticipator)) || ((nestedParticipator.percentage === 0 || nestedParticipator.percentage) && !nestedParticipator.contractName))) {
      errors.push(`Partipators Line ${nestedParticipator.line} A Contract needs to be linked to a Percentage when a Participator Right is assigned`);
    }
  }
  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const participators = getItemsFromIndexedObject(work, indexedParticipators, identifiers);

  if (participators.length === 0) {
    return errors;
  }

  work.salesReturnsRights = [];
  work.salesReturnsRightsDisplay = [];

  for (const participator of participators) {
    if (isObjectPopulated(participator)) {
      if (!participator.contractName) {
        errors.push(`Participators Line ${participator.line}: Contract name is required`);
      }

      if (!participator.percentage && participator.percentage !== '0' && participator.percentage !== 0) {
        errors.push(`Participators Line ${participator.line}: Rate is required`);
      }

      if (participator.contractName && (participator.percentage || participator.percentage === '0' || participator.percentage === 0)) {
        const contractId = contractByName.get(participator.contractName as string);
        if (contractId) {
          (work.salesReturnsRights as Array<unknown>).push({ contractId, percentage: participator.percentage });
          (work.salesReturnsRightsDisplay as Array<unknown>).push({ contractId, percentage: participator.percentage });
        } else {
          errors.push(`Participators Line ${participator.line}: Could not find contract with the name ${participator.contractName}`);
        }
      }
    }
  }
  return errors;
}

function checkMultipleContracts(work: Record<string, unknown>): string | null {
  if (runCheckOnArray(work.salesReturnsRights as Array<{ contractId: unknown }> ?? []) || runCheckOnArray(work.costsRights as Array<{ contractId: unknown }> ?? [])) {
    return 'A work can only have one instance of a contract attached to it. Please ensure a contract is only included once.';
  }
  return null;

  function runCheckOnArray(array: Array<{ contractId: unknown }>): boolean {
    const counts: Record<string, number> = {};
    array.map((right) => String(right.contractId)).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return Object.values(counts).some((c) => c > 1);
  }
}

async function addSpecificRights(
  work: Record<string, unknown>,
  indexedSpecificRights: IndexedObject,
  overwriteBlanks: boolean,
  contractByName: Map<string, unknown>,
  territoryByName: Map<string, { _id: unknown; territories: string[] }>,
  client: ClientDocument,
): Promise<string[]> {
  const errors: string[] = [];
  if (overwriteBlanks) { work.channelSpecificSalesReturnsRights = []; }

  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const specificRights = getItemsFromIndexedObject(work, indexedSpecificRights, identifiers);

  if (specificRights.length === 0) {
    return errors;
  }

  work.channelSpecificSalesReturnsRights = [];
  for (const right of specificRights) {
    if (isObjectPopulated(right)) {
      if (!right.contractName) {
        errors.push(`Specific Participation Rates Line ${right.line}: Contract name is required`);
      }
      if (!right.percentage && right.percentage !== 0 && right.percentage !== '0') {
        errors.push(`Specific Participation Rates Line ${right.line}: Rate is required`);
      }

      if (right.contractName && (right.percentage || right.percentage === 0 || right.percentage === '0')) {
        const item: {
          distributionChannel: string | undefined;
          source: string | undefined;
          percentage: string | number | undefined;
          contractId?: string;
          territory?: string;
        } = {
          distributionChannel: right.distributionChannel,
          source: right.source,
          percentage: right.percentage,
        };

        const contractId = contractByName.get(right.contractName as string);
        if (contractId) {
          item.contractId = String(contractId);
        } else if (right.contractName && right.contractName !== '') {
          errors.push(`Specific Participation Rates Line ${right.line}: Contract not found`);
        }

        const tg = territoryByName.get(right.territory as string);
        if (tg) {
          item.territory = String(tg._id);
        } else if (right.territory && right.territory !== '' && !allTerritories.includes(right.territory)) {
          errors.push(`Specific Participation Rates Line ${right.line}: Territory not found`);
        } else {
          item.territory = right.territory;
        }

        if (right.distributionChannel) {
          if (client.distributionChannels && !client.distributionChannels.includes(right.distributionChannel)) {
            errors.push(`Specific Participation Rates Line ${right.line}: Distribution Channel doesn't match list`);
          }
        }

        (work.channelSpecificSalesReturnsRights as Array<unknown>).push(item);
      }
    }
  }
  return errors;
}

async function addSocietyIdentifiers(
  work: Record<string, unknown>,
  indexedSocietyIdentifiers: IndexedObject,
  clientId: string,
  overwriteBlanks: boolean,
): Promise<string[]> {
  const errors: string[] = [];
  if (overwriteBlanks) {
    work.societyIdentifiers = [];
  }

  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const societyIdentifiers = getItemsFromIndexedObject(work, indexedSocietyIdentifiers, identifiers);

  if (societyIdentifiers.length === 0) {
    return errors;
  }

  work.societyIdentifiers = [];
  for (const identifier of societyIdentifiers) {
    if (isObjectPopulated(identifier)) {
      if (!identifier.society) {
        errors.push(`Society Identifiers Line ${identifier.line}: Society name is required`);
      }
      if (!identifier.societyIdentifier) {
        errors.push(`Society Identifiers Line ${identifier.line}: Identifier is required`);
      }
      if (identifier.society && identifier.societyIdentifier) {
        (work.societyIdentifiers as Array<unknown>).push({
          society: identifier.society,
          identifier: identifier.societyIdentifier,
        });
      }
    }
  }
  return errors;
}

async function validateWork(work: unknown): Promise<boolean> {
  return true;
}

async function NotificationGeneratePlaceholder(title: string, body: string, _random: unknown, curveUser: CurveUser, generateOptions: Record<string, unknown>): Promise<void> {
  logger.info('notification');
  logger.info(title);
  logger.info(body);
  logger.info(curveUser);
  logger.info(generateOptions.error!);
}
