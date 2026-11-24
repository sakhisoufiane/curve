process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const CWR = require('../../../libs/cwr/cwr');
const TestWorks = require('../../data/works-p4.json');
const TestUtils = require('../../utils');
const CwrReader = require('../../../libs/cwr/cwrReader');
const Composer = require('../../../libs/cwr/composer');

describe('CWR — Export (Test Client - P4 - US + NL - 2.2)', () => {
  let cwr;
  let reader;
  let work = {};
  // Lines of the generated CWR file split by new line character
  let lines;
  // Territory of Delivery Partner
  const deliveryTerritory = ['US', 'NL'];
  // Territory codes
  const T_US = '0840';
  const T_NL = '0528';

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
        _id: '66a145062434dc9531327d60',
        name: "P4 - 'Other' Receiving Party, US + NL collecting territory, no additional settings, V22",
        clientId: '6641e8cd2b6152956cad61c5',
        type: 'Export Only',
        cwrVersion: '2.2',
        outputFormat: 'CWR',
        receivingParty: 'Other',
        territory: '6687f161df900bd66f8f93b0',
        ipiNo: '0000000P4',
        extraPartners: [],
        subPartners: [],
      },
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
        lines = await TestUtils.exportCwr({ cwr, works: Object.values(TestWorks), territory: deliveryTerritory, filename: 'p4.V22' });
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
      it('should only include the delivery territories and be assigned to the publisher', (done) => {
        // Publisher territories defined
        expect(work).to.include.key('publisherTerritories');
        expect(work.publisherTerritories).to.have.keys('01');
        // Only the World territory should exist
        const [territory1, territory2] = work.publisherTerritories['01'];
        const commonFields = {
          includeExclusionIndicator: 'I',
          prCollectionShare: 50,
          mrCollectionShare: 100,
          srCollectionShare: 100,
          interestedPartyNo: 'P00000002',
        };
        expect(territory1).to.include({ territories: T_US, ...commonFields });
        expect(territory2).to.include({ territories: T_NL, ...commonFields });
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
        expect(composer.territories.length).to.equal(2); // Includes both delivery territories (US + NL)
        const commonFields = {
          interestedPartyNo: 'C00000001',
          prCollectionShare: 50,
          includeExclusionIndicator: 'I',
        };
        expect(composer.territories[0]).to.include({ territories: T_US, sequenceNo: '001', ...commonFields });
        expect(composer.territories[1]).to.include({ territories: T_NL, sequenceNo: '002', ...commonFields });
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

    describe('#CUR166', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR166);
        done();
      });
      it('should only include the Original Publisher once', (done) => {
        // There should only be a single Original Publisher chain written to the output
        expect(Object.keys(work.publisherChains).length).to.equal(1);
        const { '01': publisherChains1 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(3);
        // Original Publisher 1 should only be included once
        expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' }); // Original Publisher 1
        expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' }); // Sub Publisher 1
        expect(publisherChains1[2]).to.include({ interestedPartyNo: 'P00000007' }); // Sub Publisher 2
        done();
      });
    });

    describe('#CUR170', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CUR170);
        done();
      });
      it('should include the Sub Publisher twice under each unique Original Publisher', (done) => {
        const { '01': publisherChains1, '02': publisherChains2, '03': publisherChains3 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(2);
        expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' }); // Original Publisher 1
        expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' }); // Sub Publisher 1
        expect(publisherChains2.length).to.equal(2);
        expect(publisherChains2[0]).to.include({ interestedPartyNo: 'P00000003' }); // Original Publisher 2
        expect(publisherChains2[1]).to.include({ interestedPartyNo: 'P00000006' }); // Sub Publisher 1
        expect(publisherChains3.length).to.equal(1);
        expect(publisherChains3[0]).to.include({ interestedPartyNo: 'P00000004' }); // Original Publisher 3
        done();
      });
    });
    describe('#CORE7', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CORE7);
        done();
      });
      it('should include the same publisher twice when it is on the same chain, once controlled and once uncontrolled'
        + 'and it should not repeat the SPT territory lines under the original publisher line', (done) => {
        const { '01': publisherChains1, '02': publisherChains2 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(1);
        expect(publisherChains2.length).to.equal(1);
        expect(publisherChains1[0].lineType).to.equal('SPU');
        expect(publisherChains2[0].lineType).to.equal('OPU');
        expect(publisherChains1[0].publisherName).to.equal(TestWorks.CORE7.rightsChain[0].children[0].name.toUpperCase());
        expect(publisherChains2[0].publisherName).to.equal(TestWorks.CORE7.rightsChain[0].children[1].name.toUpperCase());
        expect(lines[2153].includes('CORE7')).to.equal(true);
        expect(lines[2155].substring(0, 3)).to.equal('SPT');
        expect(lines[2156].substring(0, 3)).to.equal('SPT');
        expect(lines[2155].substring(49, 54)).to.equal('I0840');
        expect(lines[2156].substring(49, 54)).to.equal('I0528');
        expect(lines[2157].substring(0, 3)).to.not.equal('SPT');
        done();
      });
    });
  });
  describe('#CORE8', () => {
    beforeAll((done) => {
      work = TestUtils.parseLines(lines, reader, TestWorks.CORE8);
      done();
    });
    it('should include each Sub Publisher under each unique Original Publisher', (done) => {
      const { '01': publisherChains1 } = work.publisherChains;
      expect(publisherChains1.length).to.equal(3);
      expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' }); // Original Publisher 1
      expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' }); // Sub Publisher 1
      expect(publisherChains1[2]).to.include({ interestedPartyNo: 'P00000007' }); // Sub Publisher 2
      done();
    });
    it('should only include SPT lines for where the Publisher has collection rights, in correlation with the Delivery Partner', (done) => {
      // check SPT lines
      expect(lines[2163].substring(81, 86)).to.equal('CORE8');
      expect(lines[2166].substring(43, 48)).to.not.equal('I2136');
      expect(lines[2167].substring(49, 54)).to.equal('I0840');
      expect(lines[2168].substring(49, 54)).to.equal('I0528');
      done();
    });

    it('should only include SWT lines for where the Composer has collection rights, in correlation with the Delivery Partner', (done) => {
      expect(lines[2163].substring(81, 86)).to.equal('CORE8');
      // check SWT lines
      expect(lines[2169].substring(43, 48)).to.not.equal('I2136');
      expect(lines[2170].substring(43, 48)).to.equal('I0840');
      expect(lines[2171].substring(43, 48)).to.equal('I0528');
      done();
    });
  });
});
