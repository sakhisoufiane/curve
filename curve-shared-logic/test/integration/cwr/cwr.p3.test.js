process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const CWR = require('../../../libs/cwr/cwr');
const TestWorks = require('../../data/works-p3.json');
const TestUtils = require('../../utils');
const CwrReader = require('../../../libs/cwr/cwrReader');
const Composer = require('../../../libs/cwr/composer');
const { CISAC_COUNTRIES_EUROPE } = require('../../../libs/cwr/territories');

describe('CWR — Export (Test Client - P3 - World - 2.2)', () => {
  let cwr;
  let reader;
  let work = {};
  // Lines of the generated CWR file split by new line character
  let lines;
  // Territory of Delivery Partner
  const deliveryTerritory = ['WW'];

  beforeAll((done) => {
    // Create the tmp directory where CWR files will be stored
    TestUtils.makeTmpDir();

    // Create a CWR testing instance
    cwr = new CWR({
      senderName: '[Do No Edit] CWR Regression',
      senderType: 'PB',
      version: '2.2',
      receivingParty: 'Other',
      deliveryPartner: {
        _id: '6697b01acd2cede0db6d1a4b',
        name: "P3 - 'Other' Receiving Party, World collecting territory, no additional settings, V22",
        clientId: '6641e8cd2b6152956cad61c5',
        type: 'Export Only',
        cwrVersion: '2.2',
        outputFormat: 'CWR',
        receivingParty: 'Other',
        territory: 'WW',
        extraPartners: [],
        subPartners: [],
        ipiNo: '0000000P3',
        splitElectionPRO: null,
      },
      // DeliveryPartner,
      // sendingParty: client.cwrPartyId,
      // ipiNo,
      sequenceNo: 1,
      deliveryConfiguration: {
        splitElection: null,
        splitElectionPRO: null,
      },
    });
    cwr.setup(done);
  });

  describe('#addWorks', () => {
    it('should add works to a CWR instance and export them', async () => {
      try {
        lines = await TestUtils.exportCwr({ cwr, works: Object.values(TestWorks), territory: deliveryTerritory, filename: 'p3.V22' });
        expect(lines).to.not.be.undefined;
      } catch (err) {
        expect(err).to.be.undefined;
      }
    });
  });

  describe('Regression Works', () => {
    describe('All Works', () => {
      it('should include required header and trailer lines', (done) => {
        expect(lines[0].startsWith('HDR')).to.be.true;
        const trailerLine = lines[lines.length - 2];
        expect(trailerLine.startsWith('TRL')).to.be.true;
        // The trailer line should include the count of works added
        expect(trailerLine).to.include(Object.values(TestWorks).length);
        done();
      });
      it('should have a REV line for every work', (done) => {
        expect(lines.filter((l) => l.startsWith('REV')).length).to.equal(Object.keys(TestWorks).length);
        done();
      });
      it('should include the work title and identifier in every REV line', (done) => {
        const workSections = TestUtils.getWorkLines(lines);
        for (const [revLine] of workSections) {
          expect(revLine.startsWith('REV')).to.be.true;
          const id = revLine.substring(81, 95).trim();
          expect(id).to.not.be.undefined;
          expect(revLine).to.include(cwr.padWithValue(TestWorks[id].title, '', 60, 'start', 'TITLE'));
          expect(revLine).to.include(id);
        }
        done();
      });
    });

    beforeEach((done) => {
      reader = new CwrReader();
      done();
    });

    // --- START OF WORK REGRESSION SCENARIOS ---

    describe('#CUR1', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR1);
        done();
      });
      it('should only include the world territory and be assigned to the publisher', (done) => {
        // Publisher territories defined
        expect(work).to.include.key('publisherTerritories');
        expect(work.publisherTerritories).to.have.keys('01');
        // Only the World territory should exist
        const [territory] = work.publisherTerritories['01'];
        expect(territory).to.include({
          territories: '2136', // WW
          includeExclusionIndicator: 'I',
          prCollectionShare: 50,
          mrCollectionShare: 100,
          srCollectionShare: 100,
          interestedPartyNo: 'P00000002',
        });
        done();
      });
      it('should only include a single original publisher', (done) => {
        // Only includes one publisher
        expect(work.publisherChains).to.have.keys('01');
        // Correct details for the single publisher
        const [publisher] = work.publisherChains['01'];
        expect(publisher).to.include({
          lineType: 'SPU',
          publisherSequence: '01',
          interestedPartyNo: 'P00000002',
          publisherName: 'ORIGINAL PUBLISHER ONE IPI NS',
          publisherType: 'E', // Original Publisher
        });
        done();
      });
      it('should only include a single composer for lyrics & music', (done) => {
        const composer = work.composers.C00000001;
        expect(composer).to.not.be.undefined;
        // Composer SWR line
        expect(composer).to.include({
          lineType: 'SWR',
          interestedPartyNo: 'C00000001',
          prOwnershipShare: 50,
          writerDesignationCode: Composer.ContractType.LyricsAndMusic,
        });
        // Composer SWT (territory) line
        expect(composer.territories.length).to.equal(1); // Only includes the WW territory
        expect(composer.territories[0]).to.include({
          interestedPartyNo: 'C00000001',
          prCollectionShare: 50,
          includeExclusionIndicator: 'I',
          territories: '2136',
          sequenceNo: '001',
        });
        // Composer PWR (publisher) line
        expect(composer.publishers.length).to.equal(1);
        expect(composer.publishers[0]).to.include({
          interestedPartyNo: 'P00000002',
          publisherName: 'ORIGINAL PUBLISHER ONE IPI NS',
          publisherSequence: '01',
        });
        done();
      });
      it('should have a composite count of zero as no samples are specified', (done) => {
        const workLines = TestUtils.getWorkLines(lines, TestWorks.CUR1);
        // The Composite Count field should be blank as it is zero (the whitespace is important here)
        expect(workLines[0]).to.include('N   ');
        done();
      });
    });

    describe('#CUR2', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR2);
        done();
      });
      it('should have two child composers for the original publisher', (done) => {
        expect(work.composers).to.have.keys('C00000001', 'C00000002');
        expect(work.composers.C00000001).to.include({
          writerDesignationCode: Composer.ContractType.LyricsAndMusic,
          mrOwnershipShare: 0,
          prOwnershipShare: 25,
        });
        expect(work.composers.C00000002).to.include({
          writerDesignationCode: Composer.ContractType.LyricsAndMusic,
          mrOwnershipShare: 0,
          prOwnershipShare: 25,
        });
        done();
      });
      it('should link composers to the correct publishers (PWR lines)', (done) => {
        // Both composers are linked to the same Original Publisher
        expect(work.composers.C00000001.publishers[0]).to.include({
          publisherSequence: '01',
          interestedPartyNo: 'P00000002',
        });
        expect(work.composers.C00000002.publishers[0]).to.include({
          publisherSequence: '01',
          interestedPartyNo: 'P00000002',
        });
        done();
      });
    });

    describe('#CUR5', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR5);
        done();
      });
      it('should have five child composers for the original publisher', (done) => {
        expect(work.composers).to.have.keys('C00000001', 'C00000002', 'C00000003', 'C00000004', 'C00000005');
        for (const composer of Object.values(work.composers)) {
          // Each composer has an ownership of 10% — totalling 50% for all
          expect(composer.prOwnershipShare).to.equal(10);
          expect(composer.territories[0].prCollectionShare).to.equal(10);
          expect(composer.publishers[0].interestedPartyNo).to.equal('P00000002');
        }
        done();
      });
    });

    describe('#CUR6', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR6);
        done();
      });
      it('should have one controlled composer and one uncontrolled composer under a single territory', (done) => {
        expect(work.composers).to.have.keys('C00000001', 'C00000002');
        const [composer1, composer2] = Object.values(work.composers);

        // Controlled nested composer should have a publisher
        expect(composer1.publishers.length).to.equal(1);
        expect(composer1.publishers[0].publisherSequence).to.equal('01');
        expect(composer1.lineType).to.equal('SWR');

        // Uncontrolled top-level composer should have no linked publisher
        expect(composer2).to.not.have.keys('publishers');
        expect(composer2.lineType).to.equal('OWR');

        // Ensure ownership values total up to 100% across all chains
        const [publisher] = work.publisherChains['01'];
        expect(publisher.prOwnershipShare).to.equal(50);
        expect(composer1.prOwnershipShare).to.equal(25);
        expect(composer2.prOwnershipShare).to.equal(25);
        done();
      });
    });

    describe('#CUR7', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR7);
        done();
      });
      it('should include the composite works and composite count', (done) => {
        // Composite Type should be Composition of Samples
        expect(work.compositeType).to.equal('COS');
        // Composite count should be the number of samples (2) + original work (1) = 3
        expect(work.compositeComponentCount).to.equal('003');
        // Composite works should be included
        expect(work.compositeWorks).to.eql([
          { title: 'TITLE1', source: 'SOURCE1' },
          { title: 'TITLE2', source: 'SOURCE2' },
        ]);
        done();
      });
    });

    describe('#CUR12', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR12);
        done();
      });
      it('should have two unique original publishers each with a unique controlled composer', (done) => {
        // Two publisher chains
        expect(work.publisherChains).to.have.keys('01', '02');
        // Each publisher chain should be unique
        const [publisher1] = work.publisherChains['01'];
        const [publisher2] = work.publisherChains['02'];
        expect(publisher1).to.include({
          publisherSequence: '01',
          interestedPartyNo: 'P00000002',
          publisherName: 'ORIGINAL PUBLISHER ONE IPI NS',
          publisherType: 'E',
          prOwnershipShare: 25,
          mrOwnershipShare: 50,
        });
        expect(publisher2).to.include({
          publisherSequence: '02',
          interestedPartyNo: 'P00000003',
          publisherName: 'ORIGINAL PUBLISHER TWO IPI NS',
          publisherType: 'E',
          prOwnershipShare: 25,
          mrOwnershipShare: 50,
        });
        // World territory for both publishers with correct share totals
        expect(work.publisherTerritories).to.have.keys('01', '02');
        const [publisher1Territory] = work.publisherTerritories['01'];
        const [publisher2Territory] = work.publisherTerritories['02'];
        const commonFields = {
          prCollectionShare: 25,
          mrCollectionShare: 50,
          includeExclusionIndicator: 'I',
          territories: '2136',
          sequenceNo: '001',
        };
        expect(publisher1Territory).to.include({ interestedPartyNo: 'P00000002', ...commonFields });
        expect(publisher2Territory).to.include({ interestedPartyNo: 'P00000003', ...commonFields });
        done();
      });
    });

    describe('#CUR15', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR15);
        done();
      });
      it('should link two composers each to two unique publishers (PWR lines)', (done) => {
        const publisher1 = { publisherSequence: '01', interestedPartyNo: 'P00000002' };
        const publisher2 = { publisherSequence: '02', interestedPartyNo: 'P00000003' };
        expect(work.composers.C00000001.publishers[0]).to.include(publisher1);
        expect(work.composers.C00000002.publishers[0]).to.include(publisher1);
        expect(work.composers.C00000003.publishers[0]).to.include(publisher2);
        expect(work.composers.C00000004.publishers[0]).to.include(publisher2);
        done();
      });
    });

    describe('#CUR18', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR18);
        done();
      });
      it('should should have two publishers and an uncontrolled composer', (done) => {
        // Two publisher chains
        expect(work.publisherChains).to.have.keys('01', '02');
        // Publishers should be the correct line types (has children vs. no children)
        const [publisher1] = work.publisherChains['01'];
        const [publisher2] = work.publisherChains['02'];
        expect(publisher1).to.include({ lineType: 'SPU' });
        expect(publisher2).to.include({ lineType: 'OPU' });
        // Two unique composers
        expect(work.composers).to.have.keys('C00000001', 'C00000002');
        const [composer1, composer2] = Object.values(work.composers);
        // Composer 1 should be controlled by Publisher 1
        expect(composer1.lineType).to.equal('SWR');
        expect(composer1.publishers.length).to.equal(1);
        expect(composer1.publishers[0]).to.include({ interestedPartyNo: 'P00000002', writerIpNo: 'C00000001', publisherSequence: '01' });
        // Composer 2 should be top-level and uncontrolled
        expect(composer2).to.include({ lineType: 'OWR', interestedPartyNo: 'C00000002' });
        done();
      });
    });

    describe('#CUR24', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR24);
        done();
      });
      it('should have an unknown publisher and composer', (done) => {
        // Unknown publisher
        const [unknownPublisher] = work.publisherChains['02'];
        expect(unknownPublisher).to.include({ publisherName: 'UNKNOWN PUBLISHER', publisherIpiName: '00000000000' });
        // Unknown composer
        expect(work.composers.C00000006).to.include({ writerLastName: 'UNKNOWN COMPOSER', writerIpiNameNo: '00000000000' });
        done();
      });
    });

    describe('#CUR30', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR30);
        done();
      });
      it('should have nested composers with unique contract types (categories) for a single publisher', (done) => {
        // Three unique composers
        expect(work.composers).to.have.keys('C00000001', 'C00000007', 'C00000008');
        const [composer1, composer2, composer3] = Object.values(work.composers);
        // Each controlled composer should have a different contract type (category)
        expect(composer1).to.include({ lineType: 'SWR', prOwnershipShare: 25, writerDesignationCode: Composer.ContractType.LyricsAndMusic });
        expect(composer2).to.include({ lineType: 'SWR', prOwnershipShare: 12.5, writerDesignationCode: Composer.ContractType.Music });
        expect(composer3).to.include({ lineType: 'SWR', prOwnershipShare: 12.5, writerDesignationCode: Composer.ContractType.Lyrics });
        done();
      });
    });

    describe('#CUR38', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR38);
        done();
      });
      it('should have two unique publishers each with a unique composer', (done) => {
        // Two unique publishers
        expect(work.publisherChains).to.have.keys('01', '02');
        const [publisher1] = work.publisherChains['01'];
        const [publisher2] = work.publisherChains['02'];
        expect(publisher1).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002', prOwnershipShare: 25, mrOwnershipShare: 50 });
        expect(publisher2).to.include({ publisherSequence: '02', interestedPartyNo: 'P00000003', prOwnershipShare: 25, mrOwnershipShare: 50 });

        // Both publishers assigned to the World chain
        expect(work.publisherTerritories).to.have.keys('01', '02');
        const [publisher1Territory] = work.publisherTerritories['01'];
        const [publisher2Territory] = work.publisherTerritories['02'];
        expect(publisher1Territory).to.include({ interestedPartyNo: 'P00000002', territories: '2136', sequenceNo: '001' });
        expect(publisher2Territory).to.include({ interestedPartyNo: 'P00000003', territories: '2136', sequenceNo: '001' });

        // Two unique composers
        expect(work.composers).to.have.keys('C00000001', 'C00000002');
        const [composer1, composer2] = Object.values(work.composers);

        // Composer 1 assigned to Publisher 1
        expect(composer1.publishers.length).to.equal(1);
        expect(composer1.publishers[0]).to.include({ interestedPartyNo: 'P00000002', writerIpNo: 'C00000001', publisherSequence: '01' });

        // Composer 2 assigned to Publisher 2
        expect(composer2.publishers.length).to.equal(1);
        expect(composer2.publishers[0]).to.include({ interestedPartyNo: 'P00000003', writerIpNo: 'C00000002', publisherSequence: '02' });
        done();
      });
      it('should truncate the work title when > 60 characters', (done) => {
        const workLines = TestUtils.getWorkLines(lines, TestWorks.CUR38);
        expect(workLines[0]).not.include(TestWorks.CUR38.title.toUpperCase());
        expect(workLines[0]).to.include(cwr.padWithValue(TestWorks.CUR38.title, null, 60, 'end', 'TITLE'));
        done();
      });
    });

    describe('#CUR80', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR80);
        done();
      });
      it('should have the correct publisher sequence no. when the same publisher is controlled & uncontrolled', (done) => {
        // The controlled Composer should be linked to the controlled Original Publisher
        expect(work.composers.C00000001.publishers[0]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002' });
        // An error will be thrown here if we incorrectly link the controlled Composer to the uncontrolled Publisher
        expect(work.composers.C00000001.publishers[0].publisherSequence).to.not.equal('02');
        done();
      });
    });

    describe('#CUR97', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR97);
        done();
      });
      it('should include the correct territories and merge duplicate publishers with overlapping territory chains', (done) => {
        // Should have the correct territories assigned to the publisher
        const europe = work.publisherTerritories['01'].filter((t) => t.includeExclusionIndicator === 'E');
        const restOfWorld = work.publisherTerritories['01'].filter((t) => t.includeExclusionIndicator === 'I');
        const europeCount = Object.keys(CISAC_COUNTRIES_EUROPE).length;
        // Include Europe
        expect(europe.length).to.equal(europeCount);
        // Exclude Europe AND World
        expect(restOfWorld.length).to.equal(europeCount + 1);
        // Only Original Publisher AND Sub Publisher should be included
        // We don't expect the Original Publisher from the second territory chain to be written
        expect(work.publisherChains['01'].length).to.equal(2);
        done();
      });
    });

    describe('#CUR111', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR111);
        done();
      });
      it('should have a different publisher sequence for duplicate publishers as they are in different sub publisher chains', (done) => {
        const { '01': publisherChains1, '02': publisherChains2 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(2);
        // Original Publisher
        expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' });
        // Sub Publisher
        expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' });
        // The second Original Publisher should not be included
        expect(publisherChains2).to.be.undefined;
        // Composers should be linked to the correct Original Publisher
        expect(work.composers.C00000001.publishers[0]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002' });
        expect(work.composers.C00000010.publishers[0]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002' });
        done();
      });
    });

    describe('#CUR125', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR125);
        done();
      });
      it('should not include uncontrolled sub publishers (only uncontrolled original publishers)', (done) => {
        const { '01': publisherChains1, '02': publisherChains2 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(2);
        // Chain 2 should only include the uncontrolled Original Publisher AND exclude the uncontrolled Sub Publisher
        expect(publisherChains2.length).to.equal(1);
        // Original Publisher 1
        expect(publisherChains1[0]).to.include({ lineType: 'SPU', interestedPartyNo: 'P00000002', publisherType: 'E' });
        // Sub Publisher 1
        expect(publisherChains1[1]).to.include({ lineType: 'SPU', interestedPartyNo: 'P00000006', publisherType: 'SE' });
        // Original Publisher 2 - Uncontrolled
        expect(publisherChains2[0]).to.include({ lineType: 'OPU', interestedPartyNo: 'P00000003', publisherType: 'E' });
        done();
      });
    });

    describe('#CUR148', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR148);
        done();
      });
      it('should have a different publisher sequence for duplicate publishers as they are in different sub publisher chains', (done) => {
        const { '01': publisherChains1, '02': publisherChains2 } = work.publisherChains;

        // First chain should have Publisher Sequence No. 1
        expect(publisherChains1[0]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002' });
        expect(publisherChains1[1]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000006' });
        // Second chain should have Publisher Sequence No. 2
        expect(publisherChains2[0]).to.include({ publisherSequence: '02', interestedPartyNo: 'P00000002' });
        expect(publisherChains2[1]).to.include({ publisherSequence: '02', interestedPartyNo: 'P00000007' });

        // Both publisher chains should have the same Original Publisher
        expect(publisherChains1[0].publisherName).to.equal(publisherChains2[0].publisherName);

        // Both publisher chains have the same territory seqence no.
        expect(work.publisherTerritories['01'][0]).to.include({ sequenceNo: '001', interestedPartyNo: 'P00000006' });
        expect(work.publisherTerritories['02'][0]).to.include({ sequenceNo: '001', interestedPartyNo: 'P00000007' });

        // Composers should reference the same Original Publisher but with the different Publisher Sequence No.
        expect(work.composers.C00000001.publishers[0]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002' });
        expect(work.composers.C00000002.publishers[0]).to.include({ publisherSequence: '02', interestedPartyNo: 'P00000002' });

        done();
      });
    });

    describe('#CUR166', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR166);
        done();
      });
      it('should only include the Original Publisher once and have a single publisher chain', (done) => {
        const { '01': publisherChains1 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(3);
        // Original Publisher
        expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' });
        // Sub Publisher 1
        expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' });
        // Sub Publisher 2
        expect(publisherChains1[2]).to.include({ interestedPartyNo: 'P00000007' });
        // Composer should be linked to the correct Original Publisher
        expect(work.composers.C00000001.publishers[0]).to.include({ publisherSequence: '01', interestedPartyNo: 'P00000002' });
        done();
      });
    });
  });
});
