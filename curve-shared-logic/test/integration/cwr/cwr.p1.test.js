process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const CWR = require('../../../libs/cwr/cwr');
const TestWorks = require('../../data/works-p1.json');
const TestUtils = require('../../utils');
const CwrReader = require('../../../libs/cwr/cwrReader');

describe('CWR — Export (Test Client - P1 - World, US + NL, BE, DE - 2.1)', () => {
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
      version: '2.1',
      receivingParty: 'Other',
      deliveryPartner: {
        _id: '6687e883823af9e2d8a75851',
        name: "P1 - 'Other' Receiving Party, World collecting territory, no additional settings, V21",
        clientId: '6641e8cd2b6152956cad61c5',
        type: 'Export Only',
        cwrVersion: '2.1',
        outputFormat: 'CWR',
        receivingParty: 'Other',
        territory: 'WW',
        extraPartners: [],
        subPartners: [],
        ipiNo: '0000000P1',
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
        lines = await TestUtils.exportCwr({ cwr, works: Object.values(TestWorks), territory: deliveryTerritory, filename: 'p1.V21' });
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
    describe('#CORE5', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CORE5);
        done();
      });
      it('should only include the Original Publisher once and have a single publisher chain', (done) => {
        const { '01': publisherChains1 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(4);
        // Original Publisher
        expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' });
        // Sub Publisher 1
        expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' });
        // Sub Publisher 2
        expect(publisherChains1[2]).to.include({ interestedPartyNo: 'P00000007' });
        // Sub Publisher 3
        expect(publisherChains1[3]).to.include({ interestedPartyNo: 'P00000020' });
        // Composer should be linked to the correct Original Publisher
        expect(work.composers.C00000001.publishers[0]).to.include({ interestedPartyNo: 'P00000002' });
        done();
      });
      it('should contain four SPT lines for the Original Publisher, one showing to include World where the Publisher has collection rights, '
        + 'four to exclude territories where the publisher is included on the chain, but has no collection shares', (done) => {
        const section = TestUtils.getWorkLines(lines, { identifier: 'CORE5' });
        // Check title
        expect(section[0]).to.include(work.title);
        // Check original publisher
        expect(section[1].substring(0, 3)).to.equal('SPU');
        // Check performance share
        expect(section[1].substring(115, 118)).to.equal('050');
        // Check mechanical share
        expect(section[1].substring(123, 126)).to.equal('100');

        // Validate SPT lines
        // Check SPT line
        expect(section[2].substring(0, 3)).to.equal('SPT');
        // WW Included as has collection rights
        expect(section[2].substring(49, 54)).to.equal('I2136');
        // NL Excluded
        expect(section[3].substring(49, 54)).to.equal('E0840');
        // DE Excluded
        expect(section[4].substring(49, 54)).to.equal('E0528');
        // US Excluded
        expect(section[5].substring(49, 54)).to.equal('E0056');
        // BE Excluded
        expect(section[6].substring(49, 54)).to.equal('E0276');
        done();
      });
      xit('should not include unnecessary Composer SWT lines when the Collects WW with rights for all territories', (done) => {
        const section = TestUtils.getWorkLines(lines, { identifier: 'CORE5' });
        // Check SWR line
        expect(section[14].substring(0, 3)).to.equal('SWR');

        // Composer has shares for WW
        expect(section[15].substring(43, 48)).to.equal('I2136');

        // Check performance share
        expect(section[14].substring(129, 132)).to.equal('050');

        // Check that unnecessary lines for territories already covered by WW are not included
        expect(section[16].substring(43, 48)).to.not.equal('I0840');

        done();
      });
    });
    describe('#CORE7', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CORE7);
        done();
      });
      it('should include the same publisher twice when it is on the same chain, once controlled and once uncontrolled', (done) => {
        const { '01': publisherChains1, '02': publisherChains2 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(1);
        expect(publisherChains2.length).to.equal(1);
        expect(publisherChains1[0].lineType).to.equal('SPU');
        expect(publisherChains2[0].lineType).to.equal('OPU');
        expect(publisherChains1[0].publisherName).to.equal(TestWorks.CORE7.rightsChain[0].children[0].name.toUpperCase());
        expect(publisherChains2[0].publisherName).to.equal(TestWorks.CORE7.rightsChain[0].children[1].name.toUpperCase());
        done();
      });
    });
    describe('#CORE8', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CORE8);
        done();
      });

      it('should include the Sub Publisher twice under each unique Original Publisher', (done) => {
        const { '01': publisherChains1 } = work.publisherChains;
        expect(publisherChains1.length).to.equal(7);
        expect(publisherChains1[0]).to.include({ interestedPartyNo: 'P00000002' }); // Original Publisher 1
        expect(publisherChains1[1]).to.include({ interestedPartyNo: 'P00000006' }); // Sub Publisher 1
        expect(publisherChains1[2]).to.include({ interestedPartyNo: 'P00000006' }); // Sub Publisher 1
        expect(publisherChains1[3]).to.include({ interestedPartyNo: 'P00000007' }); // Sub Publisher 2
        expect(publisherChains1[4]).to.include({ interestedPartyNo: 'P00000007' }); // Sub Publisher 2
        expect(publisherChains1[5]).to.include({ interestedPartyNo: 'P00000020' }); // Sub Publisher 3
        expect(publisherChains1[6]).to.include({ interestedPartyNo: 'P00000020' }); // Sub Publisher 3
        done();
      });

      it('should only include SPT lines for where the Publisher has collection rights, in correlation with the Delivery Partner', (done) => {
        // check SPT lines
        const section = TestUtils.getWorkLines(lines, { identifier: 'CORE8' });
        expect(section[0].substring(81, 86)).to.equal('CORE8');
        expect(section[3].substring(49, 54)).to.equal('I2136');
        expect(section[6].substring(49, 54)).to.equal('I0840');
        expect(section[7].substring(49, 54)).to.equal('I0528');
        expect(section[10].substring(49, 54)).to.equal('I0056');
        expect(section[12].substring(49, 54)).to.equal('I0276');
        done();
      });

      it('should only include SWT lines for where the Composer has collection rights, in correlation with the Delivery Partner', (done) => {
        const section = TestUtils.getWorkLines(lines, { identifier: 'CORE8' });
        expect(section[0].substring(43, 48)).to.not.equal('CORE8');
        // check SWT lines
        expect(section[14].substring(43, 48)).to.equal('I2136');
        done();
      });
    });
    describe('#CORE9', () => {
      beforeAll((done) => {
        work = TestUtils.parseLines(lines, reader, TestWorks.CORE9);
        done();
      });
      xit('should include a single SWT line for Composer One with WW (I2136)', (done) => {
        const section = TestUtils.getWorkLines(lines, { identifier: 'CORE9' });

        // get all composer SWT lines
        const composerLines = section.filter((line) => line.startsWith('SWT') && line.includes('C00000001'));
        // Ensure there's only one SWT line
        expect(composerLines.length).to.equal(1);

        // Ensure the SWT line includes WW (I2136)
        const swtLine = composerLines[0];
        expect(swtLine).to.not.be.undefined;
        expect(swtLine.substring(43, 48)).to.equal('I2136');
        done();
      });
    });
  });
});
