import { testUtils } from '@curveroyaltysystems/platform-shared-utils';
import Cwr from './cwr';
import CwrReader from './cwrReader';

const { randomId, randomString } = testUtils;

describe('CWR', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cwr: any;

  beforeEach(() => {
    cwr = new Cwr({
      params: { version: '2.2', senderType: 'CURVE', ipiNo: '123', senderName: 'Downtown Music Publishing' },
    });
  });

  describe('performer', () => {
    it('should write the performer name to the CWR output', (done) => {
      // Arrange / Act
      cwr.performer('Freddy K', () => {
        // Assert
        ['PER', 'FREDDY K'].forEach((str) => expect(cwr.output.join('')).toContain(str));
        done();
      });
    });

    it('should not write the performer name to the CWR output if it only contains special characters', (done) => {
      // Arrange / Act
      cwr.performer('Äńæ', () => {
        // Assert
        expect(cwr.output).toEqual([]);
        done();
      });
    });

    it('should remove any special characters when writing the performer name to the CWR output', (done) => {
      // Arrange / Act
      cwr.performer('Äńæis Mätsson', () => {
        // Assert
        ['PER', 'IS MTSSON'].forEach((str) => expect(cwr.output.join('')).toContain(str));
        done();
      });
    });

    it('should convert the performer name to a string if it only contains numbers (CUR-3385)', (done) => {
      cwr.performer(123456789, () => {
        ['PER', '123456789'].forEach((str) => expect(cwr.output.join('')).toContain(str));
        done();
      });
    });
  });

  describe('addHeader', () => {
    it('should add the group header of specified type to the output', (done) => {
      // Arrange / Act
      cwr.setup(() => {
        cwr.addHeader('REV');
        const lines = cwr.output.join('').split('\n');

        // Assert
        expect(lines[1]!).toContain('GRHREV');
        expect(lines[1]!.slice(6, 11)).toBe('00001');
        done();
      });
    });

    it('should only add the header once when there are >10k works', (done) => {
      // Arrange
      const works: object[] = [];
      for (let i = 0; i < 20_000; i += 1) {
        works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
      }
      // Act
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          cwr.addTrailer();

          // Assert
          const lines = cwr.output.join('').split('\n');
          const headerLines = lines.filter((line: string) => line.startsWith('GRHREV'));
          expect(headerLines.length).toBe(1);
          expect(headerLines[0]!.slice(6, 11)).toBe('00001');
          done();
        });
      });
    });
  });

  describe('addTrailer', () => {
    it('should add the group trailer with the works count to the output', (done) => {
      // Arrange
      const works = [
        { _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [] },
        { _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [] },
      ];
      // Act
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          cwr.addTrailer();
          // Assert
          const lines = cwr.output.join('').split('\n');
          const trailerLine = lines[lines.length - 2]!;
          expect(trailerLine.startsWith('GRT')).toBeTruthy();
          expect(trailerLine).toContain(works.length.toString());
          const groupCount = trailerLine.slice(3, 8);
          expect(groupCount).toBe('00001');
          const groupTransactionCount = trailerLine.trim().slice(-5);
          expect(groupTransactionCount).toBe('00004');
          done();
        });
      });
    });

    it('should only add the trailer once when there are >10k works', (done) => {
      // Arrange
      const works: object[] = [];
      for (let i = 0; i < 20_000; i += 1) {
        works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
      }
      // Act
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          cwr.addTrailer();
          // Assert
          const lines = cwr.output.join('').split('\n');
          const trailerLines = lines.filter((line: string) => line.startsWith('GRT'));
          expect(trailerLines.length).toBe(1);
          const groupCount = trailerLines[0]!.slice(3, 8);
          expect(groupCount).toBe('00001');
          const groupTransactionCount = trailerLines[0]!.trim().slice(-5);
          expect(groupTransactionCount).toBe('20002');

          done();
        });
      });
    });

    it('should not reset the work line count when calling addWorks >1', async () => {
      // Arrange
      const works: object[] = [];
      for (let i = 0; i < 10_500; i += 1) {
        works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
      }

      // Act
      await new Promise((resolve) => cwr.setup(resolve));
      cwr.addHeader('REV');
      // Batch 1
      await new Promise((resolve) => cwr.addWorks(works.slice(0, 10_000), 'REV', ['WW'], resolve));
      // Batch 2
      await new Promise((resolve) => cwr.addWorks(works.slice(10_000), 'REV', ['WW'], resolve));
      cwr.addTrailer();

      // Assert
      const lines = cwr.output.join('').split('\n');
      const trailerLines = lines.filter((line: string) => line.startsWith('GRT'));
      expect(trailerLines.length).toBe(1);
      const groupCount = trailerLines[0]!.slice(3, 8);
      expect(groupCount).toBe('00001');
      const groupTransactionCount = trailerLines[0]!.trim().slice(-5);
      expect(groupTransactionCount).toBe('10502');
      const revLines = lines.filter((line: string) => line.startsWith('REV'));
      const revNum = (revLine: string) => parseInt(revLine.substring(3, 11), 10);
      expect(revNum(revLines[9999]!)).toBe(9999);
      expect(revNum(revLines[10_000]!)).toBe(10_000);
      expect(revNum(revLines[10_001]!)).toBe(10_001);
      expect(revNum(revLines[10_499]!)).toBe(10_499);
    });
  });

  describe('close', () => {
    it('should add the trailer footer line to the output', (done) => {
      // Arrange
      const works = [
        { _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [] },
        { _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [] },
      ];
      // Act
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          cwr.addTrailer();
          cwr.close(() => {
            // Assert
            const lines = cwr.output.join('').split('\n');
            const trailerFooterLine = lines[lines.length - 2]!;
            expect(trailerFooterLine.startsWith('TRL')).toBe(true);
            expect(trailerFooterLine).toContain(works.length.toString());
            const groupCount = trailerFooterLine.slice(3, 8);
            expect(groupCount).toBe('00001');
            const groupTransactionCount = trailerFooterLine.trim().slice(-5);
            expect(groupTransactionCount).toBe('00006');
            done();
          });
        });
      });
    });

    it('should only add the trailer footer once when there are >10k works', (done) => {
      // Arrange
      const works: object[] = [];
      for (let i = 0; i < 20_000; i += 1) {
        works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
      }
      // Act
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          cwr.addTrailer();
          cwr.close(() => {
            // Assert
            const lines = cwr.output.join('').split('\n');
            const trailerFooterLines = lines.filter((line: string) => line.startsWith('TRL'));
            expect(trailerFooterLines).toHaveLength(1);
            const groupCount = trailerFooterLines[0]!.slice(3, 8);
            expect(groupCount).toBe('00001');
            const groupTransactionCount = trailerFooterLines[0]!.trim().slice(-5);
            expect(groupTransactionCount).toBe('20004');
            done();
          });
        });
      });
    });
  });

  describe('societyCode', () => {
    it('should return the society code for the specified territory', (done) => {
      // Arrange / Act
      const societyCode = cwr.societyCode('EDEM');
      // Assert
      expect(societyCode).toEqual(338);
      done();
    });
  });

  describe('fileName', () => {
    it('should convert MUSIXMATCH to MXM in the filename', () => {
      // Arrange
      const cwrWithMusixmatch = new Cwr({
        version: '2.2',
        senderType: 'CURVE',
        ipiNo: '123',
        senderName: 'Downtown Music Publishing',
        receivingParty: 'MUSIXMATCH',
        sequenceNo: 1,
      });

      // Act
      const fileName = cwrWithMusixmatch.fileName();

      // Assert
      expect(fileName).toContain('_MXM.');
      expect(fileName).not.toContain('MUSIXMATCH');
    });

    it('should not affect other receiving parties', () => {
      // Arrange
      const cwrWithOtherParty = new Cwr({
        version: '2.2',
        senderType: 'CURVE',
        ipiNo: '123',
        senderName: 'Downtown Music Publishing',
        receivingParty: 'EDEM',
        sequenceNo: 1,
      });

      // Act
      const fileName = cwrWithOtherParty.fileName();

      // Assert
      expect(fileName).not.toContain('MXM');
      expect(fileName).not.toContain('MUSIXMATCH');
    });
  });

  describe('getComposersFromChains', () => {
    it('adds a single composer with correct shares and territory', () => {
      // Arrange / Act
      const result = cwr.getComposersFromChains([
        {
          territory: 'US',
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics',
              controlled: false,
              composer: { partyNo: 'C001', name: 'John Doe', controlled: true },
              mechanicalCollection: 10,
              mechanicalOwnership: 20,
              performanceCollection: 30,
              performanceOwnership: 40,
            },
          ],
        },
      ]);

      // Assert
      const key = 'C001 | Lyrics | false';
      expect(result).toHaveProperty(key);
      expect(result[key]).toMatchObject({ name: 'John Doe', contractType: 'Lyrics', controlled: false });
      expect(result[key].chainTerritories).toEqual(['US']);
      expect(result[key].shares.US).toEqual({
        mechanicalCollection: 10,
        mechanicalOwnership: 20,
        performanceCollection: 30,
        performanceOwnership: 40,
      });
    });

    it('includes a parent publisher with contract and controlled values', () => {
      // Arrange / Act
      const result = cwr.getComposersFromChains([
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              publisher: { partyNo: 'P001', name: 'Pub1', controlled: false },
              contractType: 'Sub Publisher',
              controlled: false,
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Original Publisher',
                  controlled: false,
                  composer: { partyNo: 'C002', name: 'Pub2', controlled: true },
                  mechanicalCollection: 5,
                  mechanicalOwnership: 5,
                  performanceCollection: 5,
                  performanceOwnership: 5,
                },
              ],
            },
          ],
        },
      ]);

      // Assert
      const key = 'C002 | Original Publisher | false';
      expect(result[key].publishers).toHaveLength(1);
      expect(result[key].publishers[0]).toEqual({
        partyNo: 'P001',
        name: 'Pub1',
        contractType: 'Sub Publisher',
        controlled: false,
      });
    });

    it('handles multiple territories when main territory is "specific"', () => {
      // Arrange / Act
      const result = cwr.getComposersFromChains([
        {
          territory: 'specific',
          territoryCodes: { codes: ['US', 'CA'] },
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics & Music',
              controlled: true,
              composer: { partyNo: 'C003', name: 'Bob' },
              mechanicalCollection: 1,
              mechanicalOwnership: 2,
              performanceCollection: 3,
              performanceOwnership: 4,
            },
          ],
        },
      ]);
      // Assert
      const key = 'C003 | Lyrics & Music | true';
      expect(Object.keys(result[key].shares)).toEqual(['US', 'CA']);
      expect(result[key].shares.US.mechanicalOwnership).toBe(2);
      expect(result[key].shares.CA.performanceCollection).toBe(3);
    });

    it('creates separate entries for the same composer with different contractType or controlled values', () => {
      // Arrange / Act
      const result = cwr.getComposersFromChains([
        {
          territory: 'WW',
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics',
              controlled: true,
              composer: { partyNo: 'C004', name: 'Sam', controlled: true },
              mechanicalCollection: 1,
              mechanicalOwnership: 1,
              performanceCollection: 1,
              performanceOwnership: 1,
            },
            {
              type: 'Composer',
              contractType: 'Music',
              controlled: false,
              composer: { partyNo: 'C004', name: 'Sam', controller: true },
              mechanicalCollection: 2,
              mechanicalOwnership: 2,
              performanceCollection: 2,
              performanceOwnership: 2,
            },
          ],
        },
      ]);
      // Assert
      const composer1 = result['C004 | Lyrics | true'];
      expect(composer1).not.toBeUndefined();
      const composer2 = result['C004 | Music | false'];
      expect(composer2).not.toBeUndefined();
      expect(composer1.shares.WW.mechanicalCollection).toBe(1);
      expect(composer2.shares.WW.mechanicalCollection).toBe(2);
    });

    it('sums shares correctly when composer appears multiple times', () => {
      // Arrange / Act
      const result = cwr.getComposersFromChains([
        {
          territory: 'US',
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics',
              controlled: true,
              composer: { partyNo: 'C005', name: 'Dana', controlled: false },
              mechanicalCollection: 1,
              mechanicalOwnership: 2,
              performanceCollection: 3,
              performanceOwnership: 4,
            },
            {
              type: 'Composer',
              contractType: 'Lyrics',
              controlled: true,
              composer: { partyNo: 'C005', name: 'Dana', controlled: false },
              mechanicalCollection: 1,
              mechanicalOwnership: 2,
              performanceCollection: 3,
              performanceOwnership: 4,
            },
          ],
        },
      ]);
      // Assert
      const shares = result['C005 | Lyrics | true'].shares.US;
      expect(shares.mechanicalCollection).toBe(2);
      expect(shares.mechanicalOwnership).toBe(4);
      expect(shares.performanceCollection).toBe(6);
      expect(shares.performanceOwnership).toBe(8);
    });

    it('uses the chain controlled value instead of the composer default controlled value (CUR-4571)', () => {
      // Arrange / Act
      const result = cwr.getComposersFromChains([
        {
          territory: 'US',
          children: [
            {
              type: 'Composer',
              contractType: 'Lyrics',
              // Chain controlled value is false
              controlled: false,
              // Composer default controlled value is true
              composer: { partyNo: 'C001', name: 'John Doe', controlled: true },
              mechanicalCollection: 10,
              mechanicalOwnership: 20,
              performanceCollection: 30,
              performanceOwnership: 40,
            },
          ],
        },
      ]);
      // Assert
      const key = 'C001 | Lyrics | false';
      expect(result[key].controlled).toBeFalsy();
    });
  });

  describe('writeComposerIncludesTerritoryLine', () => {
    it('should have a matching mechanical and sync collection share', () => {
      // Arrange
      cwr.workLineCount = 0;
      const performanceShare = 25;
      const mechanicalShare = 75;

      // Act
      cwr.writeComposerIncludesTerritoryLine({
        composer: {
          interestedPartyId: randomString(),
          shares: {
            WW: {
              performanceCollection: performanceShare,
              mechanicalCollection: mechanicalShare,
            },
          },
        },
        territory: 2136,
        allTerritories: ['WW'],
        composerTerritoriesCount: 1,
      });
      const swtLine = cwr.output.join('');

      // Assert
      const cwrReader = new CwrReader();
      const work = {};
      cwrReader.readSwtLine(swtLine, work, () => {
        // @ts-expect-error No types exist yet here, fine for this test
        const [territory] = Object.values(work.composers)[0].territories;
        expect(territory.prCollectionShare).toEqual(performanceShare);
        expect(territory.mrCollectionShare).toEqual(mechanicalShare);

        // Sync Collection Share should always match the Mechanical Collection Share
        expect(territory.srCollectionShare).toEqual(mechanicalShare);
      });
    });
  });
});
