/* eslint-disable no-promise-executor-return */
process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Cwr = require('../../../libs/cwr/cwr');
const { CISAC_APPROVED_COUNTRIES_CODES, CISAC_APPROVED_TERRITORIES_REVERSED } = require('../../../libs/cwr/territories');

const codesToNumber = (territoryCodes) => territoryCodes.map((code) => CISAC_APPROVED_TERRITORIES_REVERSED[code]);

describe('CWR', () => {
  let cwr;
  beforeEach((done) => {
    cwr = new Cwr({
      params: {
        version: '2.2',
        senderType: 'CURVE',
        ipiNo: '123',
        senderName: 'Downtown Music Publishing',
      },
    });
    done();
  });

  describe('performer', () => {
    it('should write the performer name to the CWR output', (done) => {
      cwr.performer('Freddy K', () => {
        ['PER', 'FREDDY K'].forEach((str) => expect(cwr.output).to.contains(str));
        done();
      });
    });
    it('should not write the performer name to the CWR output if it only contains special characters', (done) => {
      cwr.performer('Äńæ', () => {
        expect(cwr.output).to.be.undefined;
        done();
      });
    });
    it('should remove any special characters when writing the performer name to the CWR output', (done) => {
      cwr.performer('Äńæis Mätsson', () => {
        ['PER', 'IS MTSSON'].forEach((str) => expect(cwr.output).to.contains(str));
        done();
      });
    });
    it('should convert the performer name to a string if it only contains numbers (CUR-3385)', (done) => {
      cwr.performer(123456789, () => {
        ['PER', '123456789'].forEach((str) => expect(cwr.output).to.contains(str));
        done();
      });
    });
  });

  describe('addHeader', () => {
    it('should add the group header of specified type to the output', (done) => {
      // Arrange
      cwr.setup(() => {
        // Act
        cwr.addHeader('REV');
        // Assert
        const lines = cwr.output.split('\n');
        expect(lines[1]).to.include('GRHREV');
        // Group ID should always be 1 as we never have >1 groups/header rows
        expect(lines[1].slice(6, 11)).to.equal('00001');
        done();
      });
    });

    describe('when there are >10k works', () => {
      it('should only add the header once', (done) => {
        // Arrange
        const works = [];
        for (let i = 0; i < 20_000; i += 1) {
          works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
        }
        cwr.setup(() => {
          cwr.addHeader('REV');
          cwr.addWorks(works, 'REV', ['WW'], () => {
            // Act
            cwr.addTrailer();
            // Assert
            const lines = cwr.output.split('\n');
            const headerLines = lines.filter((line) => line.startsWith('GRHREV'));
            expect(headerLines.length).to.equal(1);
            // Group ID should always be 1 as we never have >1 groups/header rows
            expect(headerLines[0].slice(6, 11)).to.equal('00001');
            done();
          });
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
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          // Act
          cwr.addTrailer();
          // Assert
          const lines = cwr.output.split('\n');
          const trailerLine = lines[lines.length - 2];
          expect(trailerLine.startsWith('GRT')).to.equal(true);
          expect(trailerLine).to.include(works.length);

          // Group count should always be one
          const groupCount = trailerLine.slice(3, 8);
          expect(groupCount).to.equal('00001');

          // Group Transaction count
          const groupTransactionCount = trailerLine.trim().slice(-5);
          expect(groupTransactionCount).to.equal('00004');

          done();
        });
      });
    });

    describe('when there are >10k works', () => {
      it('should only add the trailer once', (done) => {
        // Arrange
        const works = [];
        for (let i = 0; i < 20_000; i += 1) {
          works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
        }
        cwr.setup(() => {
          cwr.addHeader('REV');
          cwr.addWorks(works, 'REV', ['WW'], () => {
            // Act
            cwr.addTrailer();
            // Assert
            const lines = cwr.output.split('\n');
            const trailerLines = lines.filter((line) => line.startsWith('GRT'));
            expect(trailerLines.length).to.equal(1);

            // Group count should always be one
            const groupCount = trailerLines[0].slice(3, 8);
            expect(groupCount).to.equal('00001');

            // Group Transaction count
            const groupTransactionCount = trailerLines[0].trim().slice(-5);
            expect(groupTransactionCount).to.equal('20002');

            done();
          });
        });
      });

      it('should not reset the work line count when calling addWorks >1', async () => {
        // Arrange
        const works = [];
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
        const lines = cwr.output.split('\n');
        const trailerLines = lines.filter((line) => line.startsWith('GRT'));
        expect(trailerLines.length).to.equal(1);

        // Group count should always be one
        const groupCount = trailerLines[0].slice(3, 8);
        expect(groupCount).to.equal('00001');

        // Group Transaction count
        const groupTransactionCount = trailerLines[0].trim().slice(-5);
        expect(groupTransactionCount).to.equal('10502');

        const revLines = lines.filter((line) => line.startsWith('REV'));
        const revNum = (revLine) => parseInt(revLine.substring(3, 11), 10);
        expect(revNum(revLines[9999])).to.equal(9999);
        // Work count should not reset to 0 when the 2nd batch of works is added
        expect(revNum(revLines[10_000])).to.equal(10_000);
        expect(revNum(revLines[10_001])).to.equal(10_001);
        expect(revNum(revLines[10_499])).to.equal(10_499);
      });
    });
  });

  describe('close', () => {
    it('should add the trailer footer line to the output', (done) => {
      // Arrange
      const works = [
        { _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [] },
        { _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [] },
      ];
      cwr.setup(() => {
        cwr.addHeader('REV');
        cwr.addWorks(works, 'REV', ['WW'], () => {
          cwr.addTrailer();
          // Act
          cwr.close(() => {
            // Assert
            const lines = cwr.output.split('\n');
            const trailerFooterLine = lines[lines.length - 2];
            expect(trailerFooterLine.startsWith('TRL')).to.equal(true);
            expect(trailerFooterLine).to.include(works.length);

            // Group count should always be one
            const groupCount = trailerFooterLine.slice(3, 8);
            expect(groupCount).to.equal('00001');

            // Group Transaction count
            const groupTransactionCount = trailerFooterLine.trim().slice(-5);
            expect(groupTransactionCount).to.equal('00006');

            done();
          });
        });
      });
    });

    describe('when there are >10k works', () => {
      it('should only add the trailer footer once', (done) => {
        // Arrange
        const works = [];
        for (let i = 0; i < 20_000; i += 1) {
          works.push({ _id: randomId(), rightsChain: [], alternateTitles: [], recordings: [], title: `work-${i + 1}` });
        }
        cwr.setup(() => {
          cwr.addHeader('REV');
          cwr.addWorks(works, 'REV', ['WW'], () => {
            cwr.addTrailer();
            // Act
            cwr.close(() => {
              // Assert
              const lines = cwr.output.split('\n');
              const trailerFooterLines = lines.filter((line) => line.startsWith('TRL'));
              expect(trailerFooterLines.length).to.equal(1);

              // Group count should always be one
              const groupCount = trailerFooterLines[0].slice(3, 8);
              expect(groupCount).to.equal('00001');

              // Group Transaction count
              const groupTransactionCount = trailerFooterLines[0].trim().slice(-5);
              expect(groupTransactionCount).to.equal('20004');

              done();
            });
          });
        });
      });
    });
  });

  describe('territoriesToGroups', () => {
    describe('delivery territory is all world', () => {
      beforeEach((done) => {
        cwr.deliveryTerritory = ['WW'];
        done();
      });
      describe('chain territories are <= half of the world', () => {
        describe('for a Publisher', () => {
          it('should include only the chain territories', (done) => {
            cwr.territoriesToGroups(
              null,
              ['NL', 'GB', 'SE'],
              [['NL', 'GB', 'SE'], ['SE', 'NO', 'DK']],
              CISAC_APPROVED_COUNTRIES_CODES,
              ['NL', 'GB', 'SE'],
              false,
              'Publisher',
              (err, includes, excludes) => {
                expect(includes).to.eql(codesToNumber(['NL', 'GB', 'SE']));
                expect(excludes).to.eql([]);
                done();
              },
            );
          });
        });
        describe('for a Composer', () => {
          it('should include only the chain territories', (done) => {
            cwr.territoriesToGroups(
              null,
              ['NL', 'GB', 'SE'],
              [['NL', 'GB', 'SE'], ['SE', 'NO', 'DK']],
              CISAC_APPROVED_COUNTRIES_CODES,
              ['NL', 'GB', 'SE'],
              false,
              'Composer',
              (err, includes, excludes) => {
                expect(includes).to.eql(codesToNumber(['NL', 'GB', 'SE']));
                expect(excludes).to.eql([]);
                done();
              },
            );
          });
        });
      });
      describe('chain territories are > half of the world', () => {
        describe('for a Publisher', () => {
          it('should flip to world excl. remaining territories', (done) => {
            cwr.territoriesToGroups(
              null,
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201)
              [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES], // Chains
              CISAC_APPROVED_COUNTRIES_CODES, // World
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
              false,
              'Publisher',
              (err, includes, excludes) => {
                expect(includes).to.eql([2136]);
                expect(excludes).to.eql(codesToNumber(CISAC_APPROVED_COUNTRIES_CODES.slice(188)));
                done();
              },
            );
          });
        });
        describe('for a Composer', () => {
          it('should flip to world excl. remaining territories', (done) => {
            cwr.territoriesToGroups(
              null,
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201)
              [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES], // Chains
              CISAC_APPROVED_COUNTRIES_CODES, // World
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
              false,
              'Composer',
              (err, includes, excludes) => {
                expect(includes).to.eql([2136]);
                expect(excludes).to.eql(codesToNumber(CISAC_APPROVED_COUNTRIES_CODES.slice(188)));
                done();
              },
            );
          });
        });
      });
      describe('chain territories are all world', () => {
        describe('for a Publisher', () => {
          it('should only include all world', (done) => {
            cwr.territoriesToGroups(
              null,
              CISAC_APPROVED_COUNTRIES_CODES,
              [CISAC_APPROVED_COUNTRIES_CODES], // Chains
              CISAC_APPROVED_COUNTRIES_CODES, // World
              CISAC_APPROVED_COUNTRIES_CODES,
              false,
              'Publisher',
              (err, includes, excludes) => {
                expect(includes).to.eql([2136]);
                expect(excludes).to.eql([]);
                done();
              },
            );
          });
        });
        describe('for a Composer', () => {
          it('should only include all world', (done) => {
            cwr.territoriesToGroups(
              null,
              CISAC_APPROVED_COUNTRIES_CODES,
              [CISAC_APPROVED_COUNTRIES_CODES], // Chains
              CISAC_APPROVED_COUNTRIES_CODES, // World
              CISAC_APPROVED_COUNTRIES_CODES,
              false,
              'Composer',
              (err, includes, excludes) => {
                expect(includes).to.eql([2136]);
                expect(excludes).to.eql([]);
                done();
              },
            );
          });
        });
      });
    });

    describe('delivery territory is a specific group (i.e. not all world)', () => {
      beforeEach((done) => {
        cwr.deliveryTerritory = CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188);
        done();
      });
      describe('chain territories are <= half of the world', () => {
        describe('for a Publisher', () => {
          it('should not include chain territories which are not in the delivery territory', (done) => {
            cwr.territoriesToGroups(
              null,
              ['NL', 'GB', 'SE'],
              [['NL', 'GB', 'SE'], ['SE', 'NO', 'DK']],
              CISAC_APPROVED_COUNTRIES_CODES,
              ['NL', 'GB', 'SE'],
              false,
              'Publisher',
              (err, includes, excludes) => {
                // GB is in the chain territory but not in the delivery territory, so should not be present in the includes array
                expect(includes).to.eql(codesToNumber(['NL', 'SE']));
                expect(excludes).to.eql([]);
                done();
              },
            );
          });
        });
        describe('for a Composer', () => {
          it('should not include chain territories which are not in the delivery territory', (done) => {
            cwr.territoriesToGroups(
              null,
              ['NL', 'GB', 'SE'],
              [['NL', 'GB', 'SE'], ['SE', 'NO', 'DK']],
              CISAC_APPROVED_COUNTRIES_CODES,
              ['NL', 'GB', 'SE'],
              false,
              'Composer',
              (err, includes, excludes) => {
                // GB is in the chain territory but not in the delivery territory, so should not be present in the includes array
                expect(includes).to.eql(codesToNumber(['NL', 'SE']));
                expect(excludes).to.eql([]);
                done();
              },
            );
          });
        });
      });
      describe('chain territories are > half of the world', () => {
        describe('for a Publisher', () => {
          it('should flip to world excl. remaining territories', (done) => {
            cwr.territoriesToGroups(
              null,
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201)
              [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES], // Chains
              CISAC_APPROVED_COUNTRIES_CODES, // World
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
              false,
              'Publisher',
              (err, includes, excludes) => {
                expect(includes).to.eql([2136]);
                expect(excludes).to.eql(codesToNumber(CISAC_APPROVED_COUNTRIES_CODES.slice(188)));
                done();
              },
            );
          });
        });
        describe('for a Composer', () => {
          it('should flip to world excl. remaining territories', (done) => {
            cwr.territoriesToGroups(
              null,
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), // Most of the world (188/201)
              [CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188), CISAC_APPROVED_COUNTRIES_CODES], // Chains
              CISAC_APPROVED_COUNTRIES_CODES, // World
              CISAC_APPROVED_COUNTRIES_CODES.slice(0, 188),
              false,
              'Composer',
              (err, includes, excludes) => {
                expect(includes).to.eql([2136]);
                expect(excludes).to.eql(codesToNumber(CISAC_APPROVED_COUNTRIES_CODES.slice(188)));
                done();
              },
            );
          });
        });
      });
    });
    describe('If the publisher is on both the WW chain with collection rights and other specific chains with no collection rights,', () => {
      it('exclude territories where it has 0 mechanical and performance rights', (done) => {
        cwr.deliveryTerritory = ['WW'];
        const publisher = {};
        const excludes = [];
        publisher.territoryCollection = {
          WW: { mechanicalCollection: 100, performanceCollection: 50 },
          US: { mechanicalCollection: 0, performanceCollection: 0 },
          NL: { mechanicalCollection: 0, performanceCollection: 0 },
          BE: { mechanicalCollection: 0, performanceCollection: 0 },
          DE: { mechanicalCollection: 0, performanceCollection: 0 },
        };
        cwr.addExclusionsForZeroRights(publisher, excludes);
        expect(excludes).to.eql(codesToNumber(['US', 'NL', 'BE', 'DE']));
        done();
      });
    });
    describe('societyCode', () => {
      it('should return the society code for the specified territory', (done) => {
        const societyCode = cwr.societyCode('EDEM');
        expect(societyCode).to.equal(338);
        done();
      });
    });
  });

  describe('getComposersFromChains', () => {
    it('adds a single composer with correct shares and territory', () => {
      // Act
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
      expect(result).to.have.property(key);
      expect(result[key]).to.include({ name: 'John Doe', contractType: 'Lyrics', controlled: false });
      expect(result[key].chainTerritories).to.deep.equal(['US']);
      expect(result[key].shares.US).to.deep.equal({
        mechanicalCollection: 10,
        mechanicalOwnership: 20,
        performanceCollection: 30,
        performanceOwnership: 40,
      });
    });

    it('includes a parent publisher with contract and controlled values', () => {
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

      const key = 'C002 | Original Publisher | false';
      expect(result[key].publishers).to.have.lengthOf(1);
      expect(result[key].publishers[0]).to.deep.equal({
        partyNo: 'P001',
        name: 'Pub1',
        contractType: 'Sub Publisher',
        controlled: false,
      });
    });

    it('handles multiple territories when main territory is "specific"', () => {
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

      const key = 'C003 | Lyrics & Music | true';
      expect(result[key].shares).to.have.keys(['US', 'CA']);
      expect(result[key].shares.US.mechanicalOwnership).to.equal(2);
      expect(result[key].shares.CA.performanceCollection).to.equal(3);
    });

    it('creates separate entries for the same composer with different contractType or controlled values', () => {
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

      const composer1 = result['C004 | Lyrics | true'];
      expect(composer1).to.not.be.undefined;
      const composer2 = result['C004 | Music | false'];
      expect(composer2).to.not.be.undefined;
      expect(composer1.shares.WW.mechanicalCollection).to.equal(1);
      expect(composer2.shares.WW.mechanicalCollection).to.equal(2);
    });

    it('sums shares correctly when composer appears multiple times', () => {
      // Act
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
      expect(shares.mechanicalCollection).to.equal(2);
      expect(shares.mechanicalOwnership).to.equal(4);
      expect(shares.performanceCollection).to.equal(6);
      expect(shares.performanceOwnership).to.equal(8);
    });

    it('uses the chain controlled value instead of the composer default controlled value (CUR-4571)', () => {
      // Act
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
      expect(result[key].controlled).to.equal(false);
    });
  });
});
