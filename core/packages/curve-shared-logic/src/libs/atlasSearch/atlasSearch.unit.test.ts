import { ObjectId } from 'mongodb';
import type { Model, PipelineStage } from 'mongoose';
import {
  atlasSearchEqualLessGreaterThan,
  buildSearchAggregation,
  getSearchCount,
  getSearchResults,
} from './atlasSearch';
import type {
  PayeeDocument,
  AtlasSearchTextOperator,
  AtlasSearchEqualsOperator,
  AtlasSearchWildcardOperator,
  AtlasSearchRangeOperator,
  AtlasSearchInOperator,
} from './atlasSearch';

const makePayee = (clientId?: string) =>
  ({ findById: jest.fn().mockResolvedValue(clientId ? { clientId } : null) }) as unknown as Model<PayeeDocument>;

const makeModel = (aggregateResult: object[] = []) =>
  ({
    aggregate: jest.fn().mockReturnValue({
      allowDiskUse: jest.fn().mockResolvedValue(aggregateResult),
    }),
  }) as unknown as Model<unknown>;

const baseUser = { clientId: 'client-1' };
const baseParams = {
  searchIndex: 'workSearch',
  limit: 10,
  filterItems: [],
};

describe('atlasSearchEqualLessGreaterThan', () => {
  it('returns null when path is missing', () => {
    expect(atlasSearchEqualLessGreaterThan({ comparison: { symbol: '<', value: 50 }, path: '' })).toBeNull();
  });

  it('returns null when comparison is missing value', () => {
    expect(atlasSearchEqualLessGreaterThan({ comparison: { symbol: '<', value: '' }, path: 'ownership' })).toBeNull();
  });

  it('returns null when value is undefined', () => {
    expect(
      atlasSearchEqualLessGreaterThan({ comparison: { symbol: '<', value: undefined }, path: 'ownership' })
    ).toBeNull();
  });

  it('handles value of 0', () => {
    const result = atlasSearchEqualLessGreaterThan({ comparison: { symbol: '<', value: 0 }, path: 'ownership' });
    expect(result).not.toBeNull();
    expect(result?.filter?.[0]?.range.lt).toBe(0);
  });

  it('returns filter with lt for < symbol', () => {
    const result = atlasSearchEqualLessGreaterThan({
      comparison: { symbol: '<', value: 50 },
      path: 'ownership',
    });
    expect(result?.filter).toHaveLength(1);
    expect(result?.filter?.[0]?.range).toEqual({ path: 'ownership', lt: 50 });
  });

  it('returns filter with gt for > symbol', () => {
    const result = atlasSearchEqualLessGreaterThan({
      comparison: { symbol: '>', value: 50 },
      path: 'ownership',
    });
    expect(result?.filter?.[0]?.range).toEqual({ path: 'ownership', gt: 50 });
  });

  it('returns filter with lte for =< symbol', () => {
    const result = atlasSearchEqualLessGreaterThan({
      comparison: { symbol: '=<', value: 50 },
      path: 'ownership',
    });
    expect(result?.filter?.[0]?.range).toEqual({ path: 'ownership', lte: 50 });
  });

  it('returns filter with gte for => symbol', () => {
    const result = atlasSearchEqualLessGreaterThan({
      comparison: { symbol: '=>', value: 50 },
      path: 'ownership',
    });
    expect(result?.filter?.[0]?.range).toEqual({ path: 'ownership', gte: 50 });
  });

  it('returns mustNot with lt and gt ranges for = symbol', () => {
    const result = atlasSearchEqualLessGreaterThan({
      comparison: { symbol: '=', value: 50 },
      path: 'ownership',
    });
    expect(result?.mustNot).toHaveLength(2);
    expect(result?.mustNot?.[0]?.range).toEqual({ lt: 50, path: 'ownership' });
    expect(result?.mustNot?.[1]?.range).toEqual({ gt: 50, path: 'ownership' });
  });

  it('converts string value to number', () => {
    const result = atlasSearchEqualLessGreaterThan({
      comparison: { symbol: '<', value: '25' },
      path: 'ownership',
    });
    expect(result?.filter?.[0]?.range.lt).toBe(25);
  });
});

describe('buildSearchAggregation', () => {
  it('always includes a clientId filter', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    const search = (aggregation[0] as PipelineStage.Search).$search;
    const clientIdFilter = search.compound.filter.find(
      (f: AtlasSearchEqualsOperator) => f.equals?.path === 'clientId' && f.equals?.value === 'client-1'
    );
    expect(clientIdFilter).toBeDefined();
  });

  it('sets the correct search index', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, searchIndex: 'myIndex' },
    });
    expect((aggregation[0] as PipelineStage.Search).$search.index).toBe('myIndex');
  });

  it('adds $skip when page > 1', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, page: 2, limit: 10 },
    });
    const skip = aggregation.find((s) => '$skip' in s);
    expect((skip as PipelineStage.Skip).$skip).toBe(10);
  });

  it('adds $limit stage', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, limit: 20 },
    });
    const limit = aggregation.find((s) => '$limit' in s);
    expect((limit as PipelineStage.Limit).$limit).toBe(20);
  });

  it('adds $project stage when project is provided', async () => {
    const project = { name: 1, _id: 0 };
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, project },
    });
    const proj = aggregation.find((s) => '$project' in s);
    expect((proj as PipelineStage.Project).$project).toEqual(project);
  });

  it('adds sort when sortBy is provided', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, sortBy: 'name', sortOrder: 'desc' },
    });
    expect((aggregation[0] as PipelineStage.Search).$search.sort).toEqual({ name: -1 });
  });

  it('sorts ascending by default', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, sortBy: 'name' },
    });
    expect((aggregation[0] as PipelineStage.Search).$search.sort).toEqual({ name: 1 });
  });

  it('adds text wildcard to should when filterInput.text is provided', async () => {
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: { text: 'hello' },
      user: baseUser,
      params: { ...baseParams, textSearchFields: ['name', 'iswc'] },
    });
    const search = (aggregation[0] as PipelineStage.Search).$search;
    expect(search.compound.should[0].wildcard.query).toBe('*hello*');
    expect(search.compound.minimumShouldMatch).toBe(1);
  });

  it('adds ObjectId equals to filter when filterInput.text is a valid 24-char ObjectId', async () => {
    const id = new ObjectId().toHexString();
    const { aggregation } = await buildSearchAggregation({
      Payee: makePayee(),
      filterInput: { text: id },
      user: baseUser,
      params: { ...baseParams, textSearchFields: ['name'] },
    });
    const search = (aggregation[0] as PipelineStage.Search).$search;
    const idFilter = search.compound.filter.find((f: AtlasSearchEqualsOperator) => f.equals?.path === '_id');
    expect(idFilter.equals.value).toEqual(new ObjectId(id));
  });

  describe('filter types', () => {
    it('text type adds a text filter', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { status: 'active' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'status', field: 'status', type: 'text' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchTextOperator) => f.text?.query === 'active' && f.text?.path === 'status')).toBe(
        true
      );
    });

    it('text type adds a text filter with array filter', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { status: ['active', 'pending'] },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'status', field: 'status', type: 'text' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const textFilter = filter.find((f: AtlasSearchTextOperator) => f.text?.path === 'status');
      expect(textFilter.text.query).toEqual(['active', 'pending']);
    });

    it('text type ignores empty array', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { status: [] },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'status', field: 'status', type: 'text' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchTextOperator) => f.text?.path === 'status')).toBe(false);
    });

    it('text type ignores empty string', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { status: '' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'status', field: 'status', type: 'text' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchTextOperator) => f.text?.path === 'status')).toBe(false);
    });

    it('wildcard type wraps value with *', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { title: 'love' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'title', field: 'title', type: 'wildcard' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchWildcardOperator) => f.wildcard?.query === '*love*')).toBe(true);
    });

    it('boolean type converts string "true" to true', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { valid: 'true' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'valid', field: 'valid', type: 'boolean' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(
        filter.some((f: AtlasSearchEqualsOperator) => f.equals?.value === true && f.equals?.path === 'valid')
      ).toBe(true);
    });

    it('boolean type converts string "false" to false', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { valid: 'false' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'valid', field: 'valid', type: 'boolean' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchEqualsOperator) => f.equals?.value === false)).toBe(true);
    });

    it('before type normalizes date-only string to start of day (lt)', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { createdBefore: '2024-01-01' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'createdBefore', field: 'createdAt', type: 'before' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'createdAt');
      expect(rangeFilter.range.lt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('before type passes datetime string through unchanged', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { createdBefore: '2024-01-01T12:30:00.000Z' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'createdBefore', field: 'createdAt', type: 'before' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'createdAt');
      expect(rangeFilter.range.lt).toEqual(new Date('2024-01-01T12:30:00.000Z'));
    });

    it('after type normalizes date-only string to end of day (gt)', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { createdAfter: '2024-01-01' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'createdAfter', field: 'createdAt', type: 'after' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'createdAt');
      expect(rangeFilter.range.gt).toEqual(new Date('2024-01-01T23:59:59.999Z'));
    });

    it('after type passes datetime string through unchanged', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { createdAfter: '2024-01-01T12:30:00.000Z' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'createdAfter', field: 'createdAt', type: 'after' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'createdAt');
      expect(rangeFilter.range.gt).toEqual(new Date('2024-01-01T12:30:00.000Z'));
    });

    it('beforeInclusive type normalizes date-only string to end of day (lte)', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { endDate: '2024-12-31' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'endDate', field: 'endDate', type: 'beforeInclusive' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'endDate');
      expect(rangeFilter.range.lte).toEqual(new Date('2024-12-31T23:59:59.999Z'));
    });

    it('beforeInclusive type passes datetime string through unchanged', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { endDate: '2024-12-31T10:00:00.000Z' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'endDate', field: 'endDate', type: 'beforeInclusive' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'endDate');
      expect(rangeFilter.range.lte).toEqual(new Date('2024-12-31T10:00:00.000Z'));
    });

    it('afterInclusive type normalizes date-only string to start of day (gte)', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { startDate: '2024-01-01' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'startDate', field: 'startDate', type: 'afterInclusive' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'startDate');
      expect(rangeFilter.range.gte).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('afterInclusive type passes datetime string through unchanged', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { startDate: '2024-01-01T12:30:00.000Z' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'startDate', field: 'startDate', type: 'afterInclusive' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const rangeFilter = filter.find((f: AtlasSearchRangeOperator) => f.range?.path === 'startDate');
      expect(rangeFilter.range.gte).toEqual(new Date('2024-01-01T12:30:00.000Z'));
    });

    it('excludeText type adds to mustNot', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { excludeType: 'Draft' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'excludeType', field: 'type', type: 'excludeText' }],
        },
      });
      const { mustNot } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(mustNot.some((f: AtlasSearchTextOperator) => f.text?.query === 'Draft' && f.text?.path === 'type')).toBe(
        true
      );
    });

    it('objectIds type maps strings to ObjectIds', async () => {
      const id1 = new ObjectId().toHexString();
      const id2 = new ObjectId().toHexString();
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { ids: [id1, id2] },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'ids', field: '_id', type: 'objectIds' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const idsFilter = filter.find((f: AtlasSearchInOperator) => f.in?.path === '_id');
      expect(idsFilter.in.value).toEqual([new ObjectId(id1), new ObjectId(id2)]);
    });

    it('objectIds type ignores empty array', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { ids: [] },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'ids', field: '_id', type: 'objectIds' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchInOperator) => f.in?.path === '_id')).toBe(false);
    });

    it('objectId type adds equals filter with single ObjectId', async () => {
      const id = new ObjectId().toHexString();
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { workId: id },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'workId', field: '_id', type: 'objectId' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const idFilter = filter.find((f: AtlasSearchEqualsOperator) => f.equals?.path === '_id');
      expect(idFilter.equals.value).toEqual(new ObjectId(id));
    });

    it('emptyList type "true" adds $match for missing array element', async () => {
      const { aggregation, postSearchMatch } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { hasContracts: 'true' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'hasContracts', field: 'contracts', type: 'emptyList' }],
        },
      });
      expect(postSearchMatch['contracts.0']).toEqual({ $exists: false });
      const matchStage = aggregation.find((s) => '$match' in s);
      expect(matchStage).toBeDefined();
    });

    it('emptyList type "false" adds $match for existing array element', async () => {
      const { postSearchMatch } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { hasContracts: 'false' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'hasContracts', field: 'contracts', type: 'emptyList' }],
        },
      });
      expect(postSearchMatch['contracts.0']).toEqual({ $exists: true });
    });

    it('contractType "All" is ignored', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { contractType: 'All' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'contractType', field: 'contractType', type: 'text' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchTextOperator) => f.text?.path === 'contractType')).toBe(false);
    });

    it('contractType "Artist" adds mustNot Mechanical', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { contractType: 'Artist' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'contractType', field: 'contractType', type: 'text' }],
        },
      });
      const { mustNot } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(
        mustNot.some((f: AtlasSearchTextOperator) => f.text?.query === 'Mechanical' && f.text?.path === 'contractType')
      ).toBe(true);
    });

    it('custom type calls handler and merges returned filters', async () => {
      const customFilter = { text: { query: 'active', path: 'status' } };
      const handler = jest.fn().mockReturnValue([customFilter]);
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { myField: 'anything' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'myField', field: 'status', type: 'custom', handler }],
        },
      });
      expect(handler).toHaveBeenCalledWith('anything');
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter).toContainEqual(customFilter);
    });

    it('exact type uses equals for a single string value', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { approvalStatus: 'Approved' },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'approvalStatus', field: 'approvalStatus', type: 'exact' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(
        filter.some(
          (f: AtlasSearchEqualsOperator) => f.equals?.value === 'Approved' && f.equals?.path === 'approvalStatus'
        )
      ).toBe(true);
    });

    it('exact type uses in for an array of string values', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { catalogueGroups: ['group-a', 'group-b'] },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'catalogueGroups', field: 'catalogueGroups', type: 'exact' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      const inFilter = filter.find((f: AtlasSearchInOperator) => f.in?.path === 'catalogueGroups');
      expect(inFilter.in.value).toEqual(['group-a', 'group-b']);
    });

    it('exact type ignores empty array', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { catalogueGroups: [] },
        user: baseUser,
        params: {
          ...baseParams,
          filterItems: [{ name: 'catalogueGroups', field: 'catalogueGroups', type: 'exact' }],
        },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(filter.some((f: AtlasSearchInOperator) => f.in?.path === 'catalogueGroups')).toBe(false);
    });
  });

  describe('payee user', () => {
    it('uses payee clientId when payee is found', async () => {
      const payeeClientId = 'payee-client-999';
      const Payee = makePayee(payeeClientId);
      const { aggregation } = await buildSearchAggregation({
        Payee,
        filterInput: {},
        user: { clientId: 'original-client', payeeId: 'payee-1' },
        params: { ...baseParams, payeeFilterFields: ['contractId'] },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(
        filter.some(
          (f: AtlasSearchEqualsOperator) => f.equals?.value === payeeClientId && f.equals?.path === 'clientId'
        )
      ).toBe(true);
    });

    it('adds contractIds filter when user has contractIds', async () => {
      const contractId = 'contract-abc';
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee('payee-client'),
        filterInput: {},
        user: { clientId: 'client-1', payeeId: 'payee-1', contractIds: [contractId] },
        params: { ...baseParams, payeeFilterFields: ['contractId'] },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(
        filter.some((f: AtlasSearchTextOperator) => Array.isArray(f.text?.query) && f.text.query.includes(contractId))
      ).toBe(true);
    });

    it.each([
      ['empty array', []],
      ['undefined', undefined],
    ])('adds filter to return no results when payee user has no contractIds (%s)', async (_label, contractIds) => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee('payee-client'),
        filterInput: {},
        user: { clientId: 'client-1', payeeId: 'payee-1', contractIds },
        params: { ...baseParams, payeeFilterFields: ['contractId'] },
      });
      const { filter } = (aggregation[0] as PipelineStage.Search).$search.compound;
      expect(
        filter.some((f: AtlasSearchEqualsOperator) => f.equals?.path === '_id' && f.equals?.value === null)
      ).toBe(true);
    });
  });

  describe('contractAutocomplete index', () => {
    it('overrides compound with autocomplete should clause', async () => {
      const { aggregation } = await buildSearchAggregation({
        Payee: makePayee(),
        filterInput: { text: 'songs' },
        user: baseUser,
        params: { ...baseParams, searchIndex: 'contractAutocomplete' },
      });
      const search = (aggregation[0] as PipelineStage.Search).$search;
      expect(search.compound.should[0].autocomplete).toBeDefined();
      expect(search.compound.should[0].autocomplete.query).toBe('songs');
      expect(search.compound.minimumShouldMatch).toBe(1);
    });
  });
});

describe('getSearchResults', () => {
  it('returns docs, total and totalPages from search metadata', async () => {
    const docs = [{ _id: '1' }, { _id: '2' }];
    const aggregateResult = [
      {
        docs,
        meta: [{ count: { total: 50 } }],
      },
    ];
    const result = await getSearchResults({
      Payee: makePayee(),
      Model: makeModel(aggregateResult),
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    expect(result.docs).toEqual(docs);
    expect(result.total).toBe(50);
    expect(result.totalPages).toBe(5);
  });

  it('uses $count stage total when postSearchMatch filters are applied', async () => {
    const aggregateResult = [
      {
        docs: [{ _id: '1' }],
        meta: [{ count: { total: 100 } }],
        count: [{ total: 7 }],
      },
    ];
    const result = await getSearchResults({
      Payee: makePayee(),
      Model: makeModel(aggregateResult),
      filterInput: { hasContracts: 'true' },
      user: baseUser,
      params: {
        ...baseParams,
        filterItems: [{ name: 'hasContracts', field: 'contracts', type: 'emptyList' }],
      },
    });
    expect(result.total).toBe(7);
  });

  it('returns empty docs and zero total when aggregation returns no results', async () => {
    const result = await getSearchResults({
      Payee: makePayee(),
      Model: makeModel([]),
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    expect(result.docs).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('calls Model.aggregate with allowDiskUse(true)', async () => {
    const Model = makeModel([]);
    await getSearchResults({
      Payee: makePayee(),
      Model,
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    expect(Model.aggregate).toHaveBeenCalled();
    expect(Model.aggregate().allowDiskUse).toHaveBeenCalledWith(true);
  });
});

describe('getSearchCount', () => {
  it('returns count from search metadata when no postSearchMatch filters', async () => {
    const result = await getSearchCount({
      Payee: makePayee(),
      Model: makeModel([{ count: { total: 42 } }]),
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    expect(result).toBe(42);
  });

  it('uses $count stage total when postSearchMatch filters are applied', async () => {
    const result = await getSearchCount({
      Payee: makePayee(),
      Model: makeModel([{ total: 7 }]),
      filterInput: { hasContracts: 'true' },
      user: baseUser,
      params: {
        ...baseParams,
        filterItems: [{ name: 'hasContracts', field: 'contracts', type: 'emptyList' }],
      },
    });
    expect(result).toBe(7);
  });

  it('returns 0 when aggregation returns no results', async () => {
    const result = await getSearchCount({
      Payee: makePayee(),
      Model: makeModel([]),
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    expect(result).toBe(0);
  });

  it('calls Model.aggregate with allowDiskUse(true)', async () => {
    const Model = makeModel([]);
    await getSearchCount({
      Payee: makePayee(),
      Model,
      filterInput: {},
      user: baseUser,
      params: baseParams,
    });
    expect(Model.aggregate).toHaveBeenCalled();
    expect(Model.aggregate().allowDiskUse).toHaveBeenCalledWith(true);
  });

  it('ends pipeline with $replaceWith $$SEARCH_META and $limit: 1 when no postSearchMatch filters', async () => {
    const Model = makeModel([]);
    await getSearchCount({
      Payee: makePayee(),
      Model,
      filterInput: {},
      user: baseUser,
      params: { ...baseParams, page: 2, limit: 10, project: { name: 1 } },
    });
    const pipeline = (Model.aggregate as jest.Mock).mock.calls[0][0] as PipelineStage[];
    expect(pipeline[pipeline.length - 2]).toEqual({ $replaceWith: '$$SEARCH_META' });
    expect(pipeline[pipeline.length - 1]).toEqual({ $limit: 1 });
    expect(pipeline.some((s) => '$skip' in s)).toBe(false);
    expect(pipeline.some((s) => '$project' in s)).toBe(false);
  });

  it('ends pipeline with $count and omits $skip/$limit/$project when postSearchMatch filters are applied', async () => {
    const Model = makeModel([{ total: 3 }]);
    await getSearchCount({
      Payee: makePayee(),
      Model,
      filterInput: { hasContracts: 'false' },
      user: baseUser,
      params: {
        ...baseParams,
        page: 2,
        limit: 10,
        project: { name: 1 },
        filterItems: [{ name: 'hasContracts', field: 'contracts', type: 'emptyList' }],
      },
    });
    const pipeline = (Model.aggregate as jest.Mock).mock.calls[0][0] as PipelineStage[];
    expect(pipeline[pipeline.length - 1]).toEqual({ $count: 'total' });
    expect(pipeline.some((s) => '$skip' in s)).toBe(false);
    expect(pipeline.some((s) => '$limit' in s)).toBe(false);
    expect(pipeline.some((s) => '$project' in s)).toBe(false);
  });
});
