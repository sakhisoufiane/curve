import { eachLimit } from 'async';
import type { Model, HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { Composer as ComposerSchema } from '@curveroyaltysystems/models/dist/composer';
import type { Work as WorkSchema } from '@curveroyaltysystems/models/dist/work';
import { logger } from '@curveroyaltysystems/platform-shared-utils';

import { clearBlankStrings } from '../utils';

// Mongoose Model types
type ComposerModel = Model<ComposerSchema>;
type WorkModel = Model<WorkSchema>;

// Instance types (document instance)
type ComposerInstance = HydratedDocument<
  ComposerSchema & {
    _excludeIdsForValidation?: string[];
  }
>;

type ChainNode = {
  type?: string;
  composerId?: string;
  caeNumber?: string;
  name?: string;
  children?: ChainNode[];
  [key: string]: unknown;
};

export async function preSave({
  composer,
  Composer,
  Work,
}: {
  composer: ComposerInstance;
  Composer: ComposerModel;
  Work: WorkModel;
}) {
  potentialDuplicateCount(composer);
  normalizeCae(composer);
  filterPublisherAgreements(composer);
  await preSaveValidation(composer, Composer, composer._excludeIdsForValidation ?? []);
  setLowerCaseName(composer);
  await issuePartyNo(composer, Composer);
  await issueInterestedPartyId(composer, Composer);
  await validateInterestedPartyId(composer, Composer, composer._excludeIdsForValidation ?? []);
  await updateComposerWorks(composer, Work);
}

export function potentialDuplicateCount(composer: ComposerInstance) {
  composer.potentialDuplicatesCount = composer.potentialDuplicates?.length ?? 0;
}

export function normalizeCae(composer: ComposerInstance) {
  if (composer.cae && composer.cae !== '0') {
    composer.cae = composer.cae.replace(/[^a-zA-Z0-9]/gi, '');
    composer.caeWithoutLeadingZeros = composer.cae.replace(/^0+/, '');
  } else {
    composer.cae = '00000000000';
    composer.caeWithoutLeadingZeros = '';
  }
}

export function filterPublisherAgreements(composer: ComposerInstance) {
  if (Array.isArray(composer.publisherAgreements)) {
    clearBlankStrings(composer, ['publisherAgreements']);
  }
}

function removeLeadingZeros(value: string): string {
  if (value) return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  return '';
}

export async function preSaveValidation(
  composer: ComposerInstance,
  Composer: ComposerModel,
  excludeIds: string[] = []
) {
  if (!composer.name) {
    throw new Error('Name is required');
  }

  let errorMessage = 'CAE is required to be unique';
  const excludeConditions = [{ _id: { $ne: composer._id } }, ...excludeIds.map((id) => ({ _id: { $ne: id } }))];

  const filter: Record<string, unknown> = {
    clientId: composer.clientId,
    $and: [
      ...excludeConditions,
      {
        $or: [
          { cae: composer.cae },
          { cae: composer.caeWithoutLeadingZeros },
          { caeWithoutLeadingZeros: composer.caeWithoutLeadingZeros },
        ],
      },
    ],
  };

  if (!removeLeadingZeros(composer.cae)) {
    filter.lowerCaseName = composer.name ? composer.name.toLowerCase() : '';
    errorMessage = 'CAE can not be empty, if the name is not unique';
  }

  const count = await Composer.countDocuments(filter);
  if (count > 0) {
    throw new Error(errorMessage);
  }
}

export function setLowerCaseName(composer: ComposerInstance) {
  composer.lowerCaseName = composer.name ? composer.name.toLowerCase() : '';
}

export async function issuePartyNo(composer: ComposerInstance, Composer: ComposerModel) {
  let count = 0;
  if (composer.partyNo) {
    count = await Composer.countDocuments({
      _id: { $ne: composer._id },
      clientId: composer.clientId,
      partyNo: composer.partyNo,
    });
  }

  let issue: boolean;
  if (count > 0) {
    issue = true;
  } else if (count === 0 && composer.partyNo) {
    issue = false;
  } else {
    issue = true;
  }

  if (issue) {
    const foundComposers = await Composer.find({ clientId: composer.clientId }, { partyNo: 1 })
      .sort({ partyNo: -1 })
      .limit(1);
    if (!foundComposers || foundComposers.length === 0) {
      composer.partyNo = 1;
    } else {
      composer.partyNo = (foundComposers[0]?.partyNo ?? 0) + 1;
    }
  }
}

export async function issueInterestedPartyId(composer: ComposerInstance, Composer: ComposerModel) {
  if (composer.interestedPartyId) return;
  if (!composer.partyNo) throw new Error('An error occurred, the Party Number is required.');

  const paddedId = String(composer.partyNo).padStart(8, '0');
  composer.interestedPartyId = `C${paddedId}`;

  const foundComposer = await Composer.findOne({
    clientId: composer.clientId,
    interestedPartyId: composer.interestedPartyId,
    _id: { $ne: composer._id },
  });
  if (foundComposer) {
    throw new Error(`An error occurred, the Interested Party ID ${composer.interestedPartyId} already exists.`);
  }
}

export async function validateInterestedPartyId(
  composer: ComposerInstance,
  Composer: ComposerModel,
  excludeIds: string[] = []
) {
  const conflicts = await Composer.find({
    _id: { $nin: [composer._id, ...excludeIds] },
    clientId: composer.clientId,
    interestedPartyId: composer.interestedPartyId,
  });
  if (conflicts.length > 0) {
    throw new Error(`An error occurred, the Interested Party ID ${composer.interestedPartyId} already exists.`);
  }
}

export async function updateComposerWorks(composer: ComposerInstance, Work: WorkModel) {
  const id = composer._id.toString();
  const works = await Work.find({ clientId: composer.clientId, usedComposerIds: { $in: id } }, ['rightsChain']);

  const findComposers = (chain: ChainNode[], fn: (node: ChainNode) => void) => {
    for (const item of chain) {
      if (item.children && item.children.length > 0) findComposers(item.children, fn);
      if (item.type === 'Composer') fn(item);
    }
  };

  const worksToUpdate: (typeof works)[number][] = [];
  for (const work of works) {
    let chainUpdated = false;
    findComposers(work.rightsChain as ChainNode[], (chainComposer) => {
      if (chainComposer.composerId === id) {
        if (chainComposer.caeNumber === composer.cae && chainComposer.name === composer.name) return;
        if (chainComposer.caeNumber !== composer.cae) {
          chainComposer.caeNumber = composer.cae;
          chainUpdated = true;
        }
        if (chainComposer.name && chainComposer.name !== composer.name) {
          chainComposer.name = composer.name;
          chainUpdated = true;
        }
      }
    });
    if (chainUpdated) worksToUpdate.push(work);
  }

  if (worksToUpdate.length === 0) return;
  try {
    await eachLimit(worksToUpdate, 10, async (updatedWork) => {
      await Work.updateOne({ _id: updatedWork._id }, { $set: { rightsChain: updatedWork.rightsChain } });
    });
  } catch (err) {
    logger.error('Error in batch update of composer works', err);
    throw new Error('Error updating Composer works with new caeNumber number');
  }
}

export default {
  preSave,
  potentialDuplicateCount,
  normalizeCae,
  filterPublisherAgreements,
  preSaveValidation,
  setLowerCaseName,
  issuePartyNo,
  issueInterestedPartyId,
  validateInterestedPartyId,
  updateComposerWorks,
};
