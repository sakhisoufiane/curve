import { escapeRegExp } from 'lodash';
import type { Model, HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { Publisher as PublisherSchema } from '@curveroyaltysystems/models/dist/publisher';

import { clearBlankStrings } from '../utils';

// Mongoose Model types
type PublisherModel = Model<PublisherSchema>;

// Instance types (document instance)
type PublisherInstance = HydratedDocument<
  PublisherSchema & {
    _excludeIdsForValidation?: string[];
  }
>;

export async function preSave({ publisher, Publisher }: { publisher: PublisherInstance; Publisher: PublisherModel }) {
  potentialDuplicateCount(publisher);
  normalizeCae(publisher);
  filterPublisherAgreements(publisher);
  await preSaveValidation(publisher, Publisher, publisher._excludeIdsForValidation ?? []);
  setLowerCaseName(publisher);
  await issuePartyNo(publisher, Publisher);
  await issueInterestedPartyId(publisher, Publisher);
  await validateInterestedPartyId(publisher, Publisher, publisher._excludeIdsForValidation ?? []);
}

export function potentialDuplicateCount(publisher: PublisherInstance) {
  publisher.potentialDuplicatesCount = publisher.potentialDuplicates?.length ?? 0;
}

export function normalizeCae(publisher: PublisherInstance) {
  if (publisher.cae && publisher.cae !== '0') {
    publisher.cae = publisher.cae.replace(/[^a-zA-Z0-9]/gi, '');
    publisher.caeWithoutLeadingZeros = publisher.cae.replace(/^0+/, '');
  } else {
    publisher.cae = '00000000000';
    publisher.caeWithoutLeadingZeros = '';
  }
}

export function filterPublisherAgreements(publisher: PublisherInstance) {
  if (Array.isArray(publisher.publisherAgreements)) {
    clearBlankStrings(publisher, ['publisherAgreements']);
  }
}

function removeLeadingZeros(value: string): string {
  if (value) return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  return '';
}

export async function preSaveValidation(
  publisher: PublisherInstance,
  Publisher: PublisherModel,
  excludeIds: string[] = []
) {
  if (!publisher.name) {
    throw new Error('Name is required');
  }

  let errorMessage = 'CAE is required to be unique';
  const excludeConditions = [{ _id: { $ne: publisher._id } }, ...excludeIds.map((id) => ({ _id: { $ne: id } }))];

  const filter: Record<string, unknown> = {
    clientId: publisher.clientId,
    $and: [
      ...excludeConditions,
      {
        $or: [
          { cae: publisher.cae },
          { cae: publisher.caeWithoutLeadingZeros },
          { caeWithoutLeadingZeros: publisher.caeWithoutLeadingZeros },
        ],
      },
    ],
  };

  if (!removeLeadingZeros(publisher.cae)) {
    filter.lowerCaseName = publisher.name ? publisher.name.toLowerCase() : '';
    errorMessage = 'CAE can not be empty, if the name is not unique';
  }

  const count = await Publisher.countDocuments(filter);
  if (count > 0) {
    throw new Error(errorMessage);
  }

  const aliases = publisher.aliases ?? [];
  const excludeFilter: Record<string, unknown> = {
    _id: { $nin: [publisher._id, ...excludeIds] },
    clientId: publisher.clientId,
  };

  if (aliases.some((a) => !a || a.trim() === '')) {
    throw new Error('Alias cannot be empty');
  }

  if (aliases.length > 0) {
    const lowerAliases = aliases.map((a) => a.toLowerCase());

    const seen = new Set<string>();
    for (const lowerAlias of lowerAliases) {
      if (seen.has(lowerAlias)) {
        const original = aliases.find((a) => a.toLowerCase() === lowerAlias);
        throw new Error(`Duplicate alias '${original}' within the same publisher`);
      }
      seen.add(lowerAlias);
    }

    const publisherLowerName = publisher.name?.toLowerCase() ?? '';
    const selfNameConflict = aliases.find((a) => a.toLowerCase() === publisherLowerName);
    if (selfNameConflict) {
      throw new Error(`Alias '${selfNameConflict}' matches the publisher's own name`);
    }

    const aliasRegexes = aliases.map((a) => new RegExp(`^${escapeRegExp(a)}$`, 'i'));

    const nameConflict = await Publisher.findOne({ ...excludeFilter, lowerCaseName: { $in: lowerAliases } });
    if (nameConflict) {
      const conflictingAlias = aliases.find((a) => a.toLowerCase() === nameConflict.lowerCaseName);
      throw new Error(`Cannot add alias '${conflictingAlias}'. This is the primary name of another publisher.`);
    }

    const aliasConflict = await Publisher.findOne({ ...excludeFilter, aliases: { $in: aliasRegexes } });
    if (aliasConflict) {
      const conflictingAlias = aliases.find((a) =>
        aliasConflict.aliases.some((existing) => existing.toLowerCase() === a.toLowerCase())
      );
      throw new Error(
        `Cannot add alias '${conflictingAlias}'. This alias is already used by publisher '${aliasConflict.name}'.`
      );
    }
  }

  if (publisher.name) {
    const nameAsAlias = await Publisher.findOne({
      ...excludeFilter,
      aliases: { $regex: new RegExp(`^${escapeRegExp(publisher.name)}$`, 'i') },
    });
    if (nameAsAlias) {
      throw new Error(`The name '${publisher.name}' conflicts with an alias on publisher '${nameAsAlias.name}'.`);
    }
  }
}

export function setLowerCaseName(publisher: PublisherInstance) {
  publisher.lowerCaseName = publisher.name ? publisher.name.toLowerCase() : '';
}

export async function issuePartyNo(publisher: PublisherInstance, Publisher: PublisherModel) {
  let count = 0;
  if (publisher.partyNo) {
    count = await Publisher.countDocuments({
      _id: { $ne: publisher._id },
      clientId: publisher.clientId,
      partyNo: publisher.partyNo,
    });
  }

  let issue: boolean;
  if (count > 0) {
    issue = true;
  } else if (count === 0 && publisher.partyNo) {
    issue = false;
  } else {
    issue = true;
  }

  if (issue) {
    const foundPublishers = await Publisher.find({ clientId: publisher.clientId }, { partyNo: 1 })
      .sort({ partyNo: -1 })
      .limit(1);
    if (!foundPublishers || foundPublishers.length === 0) {
      publisher.partyNo = 1;
    } else {
      publisher.partyNo = (foundPublishers[0]?.partyNo ?? 0) + 1;
    }
  }
}

export async function issueInterestedPartyId(publisher: PublisherInstance, Publisher: PublisherModel) {
  if (publisher.interestedPartyId) return;
  if (!publisher.partyNo) throw new Error('An error occurred, the Party Number is required.');

  const paddedId = String(publisher.partyNo).padStart(8, '0');
  publisher.interestedPartyId = `P${paddedId}`;

  const foundPublisher = await Publisher.findOne({
    clientId: publisher.clientId,
    interestedPartyId: publisher.interestedPartyId,
    _id: { $ne: publisher._id },
  });
  if (foundPublisher) {
    throw new Error(`An error occurred, the Interested Party ID ${publisher.interestedPartyId} already exists.`);
  }
}

export async function validateInterestedPartyId(
  publisher: PublisherInstance,
  Publisher: PublisherModel,
  excludeIds: string[] = []
) {
  const conflicts = await Publisher.find({
    _id: { $nin: [publisher._id, ...excludeIds] },
    clientId: publisher.clientId,
    interestedPartyId: publisher.interestedPartyId,
  });
  if (conflicts.length > 0) {
    throw new Error(`An error occurred, the Interested Party ID ${publisher.interestedPartyId} already exists.`);
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
};
