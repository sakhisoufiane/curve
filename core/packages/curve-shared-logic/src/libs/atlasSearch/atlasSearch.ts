import { ObjectId } from 'mongodb';
import { Model, PipelineStage } from 'mongoose';

export interface PayeeDocument {
  clientId?: string;
}

interface UserDoc {
  clientId: string;
  payeeId?: string;
  contractIds?: string[];
}

type FilterItemType =
  | 'custom'
  | 'text'
  | 'wildcard'
  | 'boolean'
  | 'before'
  | 'after'
  | 'beforeInclusive'
  | 'afterInclusive'
  | 'equalLessGreaterThan'
  | 'objectIds'
  | 'objectId'
  | 'excludeText'
  | 'emptyList'
  | 'exact';

type ContractStatus = 'Retention' | 'Collection' | 'Expired';
interface FilterItem {
  name: string;
  field: string;
  type: FilterItemType;
  handler?: (val: ContractStatus) => AtlasSearchOperator[];
}

interface SearchParams {
  searchIndex: string;
  page?: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filterItems: FilterItem[];
  payeeFilterFields?: string[];
  textSearchFields?: string[];
  project?: Record<string, unknown>;
}

interface Comparison {
  symbol?: '<' | '>' | '=<' | '=>' | '=';
  value?: number | string;
}

export type AtlasSearchTextOperator = { text: { query: string | string[]; path: string | string[] } };
export type AtlasSearchEqualsOperator = { equals: { value: string | boolean | ObjectId | null; path: string } };
export type AtlasSearchRangeOperator = {
  range: { path: string; lt?: Date | number; lte?: Date | number; gt?: Date | number; gte?: Date | number };
};
export type AtlasSearchWildcardOperator = {
  wildcard: { query: string; path: string | string[]; allowAnalyzedField: boolean };
};
export type AtlasSearchAutocompleteOperator = { autocomplete: { query: string | undefined; path: string } };
export type AtlasSearchInOperator = { in: { value: string[] | number[] | boolean[] | ObjectId[]; path: string } };

export type AtlasSearchOperator =
  | AtlasSearchTextOperator
  | AtlasSearchEqualsOperator
  | AtlasSearchRangeOperator
  | AtlasSearchWildcardOperator
  | AtlasSearchAutocompleteOperator
  | AtlasSearchInOperator;

interface FilterInput {
  text?: string;
  [key: string]: unknown;
}

const isDateOnly = (val: unknown): boolean => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);

const normalizeToEndOfDay = (val: string): Date => {
  const d = new Date(val);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const normalizeToStartOfDay = (val: string): Date => {
  const d = new Date(val);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const getSearchResults = async ({
  Payee,
  Model,
  filterInput,
  user,
  params,
}: {
  Payee: Model<PayeeDocument>;
  Model: Model<unknown>;
  filterInput?: FilterInput;
  user: UserDoc;
  params: SearchParams;
}): Promise<{ docs: unknown[]; total: number; totalPages: number }> => {
  const { aggregation, postSearchMatch } = await buildSearchAggregation({ Payee, filterInput, user, params });

  const hasPostSearchFilters = Object.keys(postSearchMatch).length;
  aggregation.push({
    $facet: {
      docs: [],
      meta: [{ $replaceWith: '$$SEARCH_META' }, { $limit: 1 }],
      // When postSearchMatch filters are applied, we need accurate count after $match
      ...(hasPostSearchFilters && { count: [{ $count: 'total' }] }),
    },
  });

  // Call aggregation
  const result = await Model.aggregate(aggregation).allowDiskUse(true);
  const docs = result[0]?.docs?.length ? result[0].docs : [];

  // Use count from $count stage if postSearchMatch filters were applied, otherwise use $search metadata
  const total =
    hasPostSearchFilters && result[0]?.count?.[0]?.total
      ? result[0].count[0].total
      : result[0]?.meta[0]?.count?.total || 0;
  const totalPages = Math.ceil(total / params.limit);
  return { docs, total, totalPages };
};

export const getSearchCount = async ({
  Payee,
  Model,
  filterInput,
  user,
  params,
}: {
  Payee: Model<PayeeDocument>;
  Model: Model<unknown>;
  filterInput: FilterInput;
  user: UserDoc;
  params: SearchParams;
}): Promise<number> => {
  const { aggregation, postSearchMatch } = await buildSearchAggregation({ Payee, filterInput, user, params });

  const countPipeline = aggregation.filter(
    (stage) => !('$skip' in stage) && !('$limit' in stage) && !('$project' in stage)
  );

  if (Object.keys(postSearchMatch).length) {
    countPipeline.push({ $count: 'total' });
    const result = await Model.aggregate(countPipeline).allowDiskUse(true);
    return result[0]?.total || 0;
  }

  countPipeline.push({ $replaceWith: '$$SEARCH_META' }, { $limit: 1 });
  const result = await Model.aggregate(countPipeline).allowDiskUse(true);
  return result[0]?.count?.total || 0;
};

export const buildSearchAggregation = async ({
  Payee,
  filterInput,
  user,
  params,
}: {
  Payee?: Model<PayeeDocument>;
  filterInput?: FilterInput;
  user: UserDoc;
  params: SearchParams;
}): Promise<{ aggregation: PipelineStage[]; postSearchMatch: Record<string, unknown> }> => {
  let clientId = user?.clientId;
  const skip = params.page ? (params.page - 1) * params.limit : params.limit;
  let filter: AtlasSearchOperator[] = [];
  let mustNot: AtlasSearchOperator[] = [];
  const should: AtlasSearchOperator[] = [];
  const postSearchMatch: Record<string, unknown> = {}; // Filters to apply after $search stage (for operations not supported in $search, eg. empty array filter)

  if (user.payeeId && typeof Payee?.findById === 'function') {
    if (!params.payeeFilterFields) {
      throw new Error('Payee filter fields and Payee model are required for payee user search');
    }
    const payee = await Payee.findById(user.payeeId, 'clientId');
    if (payee && payee.clientId) {
      ({ clientId } = payee);
    }
    if (user.contractIds?.length) {
      filter.push({
        text: {
          query: user.contractIds,
          path: params.payeeFilterFields,
        },
      });
    } else {
      // ensure no results are returned for payees with no contracts by adding _id:null to filter
      filter.push({
        equals: {
          path: '_id',
          value: null,
        },
      });
    }
  }
  if (!clientId) {
    throw new Error('Client ID is required for search');
  }
  // filter to always include clientId
  filter.push({
    equals: {
      path: 'clientId',
      value: clientId,
    },
  });

  // Loop through items to add to filter
  params.filterItems.forEach((filterItem) => {
    const val = filterInput?.[filterItem.name];
    const path = filterItem.field;
    const { type } = filterItem;

    if (type === 'custom' && filterItem.handler) {
      const customFilters = filterItem.handler(val as ContractStatus);
      if (Array.isArray(customFilters)) {
        filter.push(...customFilters);
      }
    } else if ((val || val === false) && path) {
      // path: dont add filter for All contractType.
      if (path === 'contractType') {
        if (val !== 'All' && val !== 'all') {
          if (val === 'Artist') {
            mustNot.push({
              text: {
                query: 'Mechanical',
                path,
              },
            });
          } else {
            filter.push({
              text: {
                query: val as string | string[],
                path,
              },
            });
          }
        }
        // type: text, used for catalogueGroups etc.
      } else if (type === 'text') {
        const textVal = val as string | string[];
        if (Array.isArray(textVal) ? textVal.length > 0 : textVal) {
          filter.push({
            text: {
              query: textVal,
              path,
            },
          });
        }
      } else if (type === 'wildcard') {
        filter.push({
          wildcard: {
            query: `*${val}*`,
            path,
            allowAnalyzedField: true,
          },
        });
      } else if (type === 'boolean') {
        // type: boolean, used for valid etc. (can be supplied as true|false or 'true'|'false')
        filter.push({
          equals: {
            // @TODO: this input.valid is a quick fix. We should look to standardise what we're passing from the Front-end to API.
            value: val !== false && val !== 'false', // converts 'false' and 'true' to Boolean
            path,
          },
        });
      } else if (type === 'before') {
        const date = isDateOnly(val) ? normalizeToStartOfDay(val as string) : new Date(val as string | number | Date);
        filter.push({
          range: {
            lt: date,
            path,
          },
        });
      } else if (type === 'after') {
        const date = isDateOnly(val) ? normalizeToEndOfDay(val as string) : new Date(val as string | number | Date);
        filter.push({
          range: {
            gt: date,
            path,
          },
        });
      } else if (type === 'beforeInclusive') {
        const date = isDateOnly(val) ? normalizeToEndOfDay(val as string) : new Date(val as string | number | Date);
        filter.push({
          range: {
            lte: date,
            path,
          },
        });
      } else if (type === 'afterInclusive') {
        const date = isDateOnly(val) ? normalizeToStartOfDay(val as string) : new Date(val as string | number | Date);
        filter.push({
          range: {
            gte: date,
            path,
          },
        });
      } else if (type === 'equalLessGreaterThan') {
        // type: equalLessGreaterThan, used for participation, ownership etc.
        const result = atlasSearchEqualLessGreaterThan({ comparison: val as Comparison, path });
        if (result) {
          filter = [...filter, ...result.filter];
          mustNot = [...mustNot, ...result.mustNot];
        }
      } else if (type === 'objectIds') {
        // type: objectIds, used for ids etc.
        const ids = val as string[];
        if (ids.length > 0) {
          filter.push({
            in: {
              value: ids.map((id) => new ObjectId(id)),
              path,
            },
          });
        }
      } else if (type === 'objectId') {
        // type: objectId, used for single object id
        filter.push({
          equals: {
            value: new ObjectId(val as string),
            path,
          },
        });
      } else if (type === 'excludeText') {
        mustNot.push({
          text: {
            query: val as string | string[],
            path,
          },
        });
      } else if (type === 'emptyList') {
        if (val === 'true') {
          postSearchMatch[`${path}.0`] = { $exists: false };
        } else if (val === 'false') {
          postSearchMatch[`${path}.0`] = { $exists: true };
        }
      } else if (type === 'exact') {
        if (Array.isArray(val)) {
          const vals = val as string[];
          if (vals.length > 0) {
            filter.push({ in: { value: vals, path } });
          }
        } else {
          filter.push({ equals: { value: val as string, path } });
        }
      }
    }
  });

  // build text search filter
  if (Array.isArray(params.textSearchFields)) {
    if (filterInput?.text?.length === 24 && ObjectId.isValid(filterInput.text)) {
      // if the text filter is an object id, add _id clause to filter
      filter.push({
        equals: {
          value: new ObjectId(filterInput.text),
          path: '_id',
        },
      });
    } else if (filterInput?.text && filterInput.text !== '') {
      // otherwise add to should clauses
      should.push({
        wildcard: {
          query: `*${filterInput.text}*`,
          path: params.textSearchFields,
          allowAnalyzedField: true,
        },
      });
    }
  }

  const search = {
    index: params.searchIndex,
    compound: {},
    count: {
      type: 'total',
    },
  } as PipelineStage.Search['$search'];

  if (filter.length) {
    search.compound.filter = filter;
  }
  if (mustNot.length) {
    search.compound.mustNot = mustNot;
  }
  if (should.length) {
    search.compound.should = should;
    search.compound.minimumShouldMatch = 1; // ensure at least of the should clauses match
  }

  // Alternative search using Autocomplete edgeGram data type
  if (params?.searchIndex === 'contractAutocomplete' && filterInput?.text) {
    search.compound = {
      filter,
      mustNot,
      should: [
        {
          autocomplete: {
            query: filterInput.text,
            path: 'name',
          },
        },
      ],
      minimumShouldMatch: 1,
    };
  }

  // Add sorting if used
  if (params.sortBy) {
    search.sort = {
      [params.sortBy]: params?.sortOrder === 'desc' ? -1 : 1,
    };
  }

  const aggregation: PipelineStage[] = [{ $search: search }];

  // Add $match stage for filters not supported in $search (e.g., emptyList checks)
  if (Object.keys(postSearchMatch).length) {
    aggregation.push({
      $match: postSearchMatch,
    });
  }

  if (skip) {
    aggregation.push({ $skip: skip });
  }
  if (params.limit) {
    aggregation.push({ $limit: params.limit });
  }
  if (params.project) {
    aggregation.push({
      $project: params.project,
    });
  }

  return { aggregation, postSearchMatch };
};

/**
 * Converts `=`, `<`, `>`, `=<`, `=>` to atlas search range filters
 *
 * @param {string} comparison.symbol - Symbol for comparison
 * @param {number|string} comparison.value - Value to compare to
 * @param {string} path - Indexed field path to apply the range filter to
 * @returns {object} object containing either `filter` or `mustNot` property as array
 */
export const atlasSearchEqualLessGreaterThan = ({
  comparison,
  path,
}: {
  comparison: Comparison;
  path: string;
}): { filter: AtlasSearchRangeOperator[]; mustNot: AtlasSearchRangeOperator[] } | null => {
  if (path && comparison?.symbol && (comparison.value || comparison.value === 0)) {
    const { symbol } = comparison;
    const numberVal = Number(comparison.value);
    if (symbol === '<' || symbol === '>' || symbol === '=<' || symbol === '=>') {
      const range: { path: string; lt?: number; lte?: number; gt?: number; gte?: number } = {
        path,
      };
      if (symbol === '<') {
        range.lt = numberVal;
      } else if (symbol === '>') {
        range.gt = numberVal;
      } else if (symbol === '=<') {
        range.lte = numberVal;
      } else if (symbol === '=>') {
        range.gte = numberVal;
      }
      return { filter: [{ range }], mustNot: [] };
    }
    // @TODO: waiting on docs from Mongo to see if we can use near to equal a number and add to filter instead
    // filter.push({
    //   near: {
    //     origin: numberVal,
    //     path,
    //     pivot: 1,
    //   },
    // });
    return {
      filter: [],
      mustNot: [
        {
          range: {
            lt: numberVal,
            path,
          },
        },
        {
          range: {
            gt: numberVal,
            path,
          },
        },
      ],
    };
  }
  return null;
};
