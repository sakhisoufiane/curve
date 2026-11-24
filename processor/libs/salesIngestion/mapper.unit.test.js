const mapper = require('./mapper');

describe('mapper', () => {
  describe('calculateCatType', () => {
    it('returns catType when it is already defined', () => {
      expect(mapper.calculateCatType({
        catType: 'whatever',
        originalIdentifier: 'orig',
        iswc: 'iswc',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('whatever');
    });
    it('returns Work when originalIdentifier is defined', () => {
      expect(mapper.calculateCatType({
        originalIdentifier: 'orig',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Work');
    });
    it('returns Work when tunecode is defined', () => {
      expect(mapper.calculateCatType({
        tunecode: 'tunecode',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Work');
    });
    it('returns Work when iswc is defined', () => {
      expect(mapper.calculateCatType({
        iswc: 'iswc',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Work');
    });
    it('returns Work when songCode is defined', () => {
      expect(mapper.calculateCatType({
        songCode: 'songCode',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Work');
    });
    it('returns Work when originalWorkTitle is defined', () => {
      expect(mapper.calculateCatType({
        originalWorkTitle: 'orig',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Work');
    });
    it('returns Work when originalComposers is defined', () => {
      expect(mapper.calculateCatType({
        originalComposers: 'orig',
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Work');
    });
    it('returns Track when isrc is defined', () => {
      expect(mapper.calculateCatType({
        isrc: 'isrc',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Track');
    });
    it('returns Track when alternativeId is defined', () => {
      expect(mapper.calculateCatType({
        alternativeId: 'alt',
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Track');
    });
    it('returns Release when catNo is defined', () => {
      expect(mapper.calculateCatType({
        catNo: 'catNo',
        contractIdentifier: 'contract',
      })).toEqual('Release');
    });
    it('returns Release when barcode is defined', () => {
      expect(mapper.calculateCatType({
        barcode: 'barcode',
        contractIdentifier: 'contract',
      })).toEqual('Release');
    });
    it('returns Contract when contractIdentifier is defined', () => {
      expect(mapper.calculateCatType({
        contractIdentifier: 'contract',
      })).toEqual('Contract');
    });
    it('returns null when none of the above are defined', () => {
      expect(mapper.calculateCatType({
        foo: 'bar',
      })).toBe(null);
    });
  });
  describe('mapToCatalogue', () => {
    const catalogue = {
      tracks: {
        'alt-000': '000',
        'isrc-111': '111',
      },
      releases: {
        'isrc-222': '222',
        'catno-333': '333',
        'barcode-444': '444',
      },
      contracts: {
        'contractid-555': '555',
      },
    };
    describe.each([
      { catType: 'Track', object: {} },
      { catType: 'Contract', object: {} },
      // TODO add other catTypes
    ])('when catType is "$catType"', ({ catType, object }) => {
      // TODO add more testcases for 'Contract' for workId mapping
      test.each([
        {
          desc: 'no trackId, no releaseId, alternativeId matches Track, catNo matches Release: mapped ISRC->Track, catNo->Release, contractIdentifier->Contract',
          object: {
            catType,
            alternativeId: 'alt-000',
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
          },
          expected: {
            catType,
            alternativeId: 'alt-000',
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '000',
            releaseId: '333',
            contractId: '555',
          },
        },
        {
          desc: 'no trackId, releaseId already set, alternativeId matches Track, catNo matches Release: mapped ISRC->Track, catNo->Release, contractIdentifier->Contract',
          object: {
            catType,
            alternativeId: 'alt-000',
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            releaseId: '001',
          },
          expected: {
            catType,
            alternativeId: 'alt-000',
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '000',
            releaseId: '001',
            contractId: '555',
          },
        },
        {
          desc: 'no trackId, no releaseId, ISRC matches Track, catNo matches Release: mapped ISRC->Track, catNo->Release, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
          },
          expected: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '111',
            releaseId: '333',
            contractId: '555',
          },
        },
        {
          desc: 'no trackId, releaseId already set, ISRC matches Track, catNo matches Release: mapped ISRC->Track, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            releaseId: '001',
          },
          expected: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '111',
            releaseId: '001',
            contractId: '555',
          },
        },
        {
          desc: 'no trackId, no releaseId, ISRC matches Track, no catNo match, barcode matches Release: mapped ISRC->Track, barcode->Release, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-xxx',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
          },
          expected: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-xxx',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '111',
            releaseId: '444',
            contractId: '555',
          },
        },
        {
          desc: 'no trackId, no releaseId, ISRC matches Release instead of Track: mapped ISRC->Release, contractIdentifier->Contract; catType set to Release',
          object: {
            catType,
            isrc: 'isrc-222',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
          },
          expected: {
            catType: 'Release',
            isrc: 'isrc-222',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: undefined,
            releaseId: '222',
            contractId: '555',
          },
        },

        {
          desc: 'no trackId, no releaseId, no ISRC match, catNo matches Release: mapped catNo->Release, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-xxx',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
          },
          expected: {
            catType,
            isrc: 'isrc-xxx',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: undefined,
            releaseId: '333',
            contractId: '555',
          },
        },
        {
          desc: 'no trackId, no releaseId, no ISRC match or catNo match, barcode matches Release: mapped barcode->Release, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-xxx',
            catNo: 'catno-xxx',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
          },
          expected: {
            catType,
            isrc: 'isrc-xxx',
            catNo: 'catno-xxx',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: undefined,
            releaseId: '444',
            contractId: '555',
          },
        },
        {
          desc: 'trackId already set, no releaseId, no ISRC match, catNo matches Release: mapped catNo->Release, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '001',
          },
          expected: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-333',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '001',
            releaseId: '333',
            contractId: '555',
          },
        },
        {
          desc: 'trackId already set, no releaseId, no ISRC match or catNo match, barcode matches Release: mapped barcode->Release, contractIdentifier->Contract',
          object: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-xxx',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '001',
          },
          expected: {
            catType,
            isrc: 'isrc-111',
            catNo: 'catno-xxx',
            barcode: 'barcode-444',
            contractIdentifier: 'contractid-555',
            trackId: '001',
            releaseId: '444',
            contractId: '555',
          },
        },
      ])('$desc', ({ desc, object, expected }, done) => {
        mapper.mapToCatalogue(object, {}/* templateSource */, catalogue, (err, result) => {
          if (err) {
            return done(err);
          }
          expect(result).toBe(object);
          expect(result).toEqual(expected);
          done();
        });
      });
    });
  });
});
