const fs = require('fs');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const DeliveryPartner = require('../../models/deliveryPartner');
const Work = require('../../models/work');

const CwrAcknowledgementIngest = require('./cwrAcknowledgementIngest');

describe('CwrAcknowledgementIngest', () => {
  describe('organiseLines', () => {
    it('should group ACK/REV lines by work identifier', (done) => {
      const ackIngest = new CwrAcknowledgementIngest();
      const lines = [
        'HDRSO000000034THE HARRY FOX AGENCY INC                     01.102024052308000820240523',
        'GRHACK0000102.10',
        'ACK0000000000000000202405220325250000100000000REVBROOKLYN CHOP HOUSE                                         PUB10298                                20240523RA',
        'REV0000000000000000BROOKLYN CHOP HOUSE                                           PUB10298                 00000000            POP000000N      ORI   ORINON                                          N',
        'SPU000000000000000101P00000006THE MOTIVATION MP (ASCAP)                     E 00000000000377221850              010025000100250001002500 N',
        'SPU000000000000000201P00000003ONLY SINGLES PUBLISHING                       AM00000000001055363080              010000000340000001000000 N',
        'SPT0000000000000003P00000003      025000500005000I0840N001',
        'SWR0000000000000004C00000307MARTIN                                       CAMREN                         C          01069494715010025000100250001002500 N',
        'SWT0000000000000005C00000307025000000000000I0840N001',
        'PWR0000000000000006P00000006THE MOTIVATION MP (ASCAP)                                                C0000030701',
        'OWR0000000000000007C00000458PEAKS                                        PHILIP                         C          00000000000   05000   05000   05000 N',
        'PER0000000000000008PEEZY',
        'REC000000000000000900000000                                                            000000                                                                                                                                                            USUYG1476773     BROOKLYN CHOP HOUSE                                                                                                     PEEZY                                                                                                                   Y',
      ];
      ackIngest.organiseLines(lines, (err) => {
        expect(Object.keys(ackIngest.acknowledgementDetailsById)).toContain('PUB10298');
        expect(err).toBeUndefined();
        done();
      });
    });

    it('should error if the lines are not the correct format', (done) => {
      const ackIngest = new CwrAcknowledgementIngest();
      ackIngest.organiseLines(['BADFILETYPE', 'Not a CWR file format'], (err) => {
        expect(err).toBeDefined();
        done();
      });
    });

    it('should skip works that have no corresponding ACK line (problem with society, see CUR-3253)', (done) => {
      const ackIngest = new CwrAcknowledgementIngest();
      const lines = [
        'ACK0000013000000000202405220325250000100000130REVHOES MAD                                                    PUB11001                                20240523RJ',
        'MSG0000013000000000T00000130REVT076ERROR: REJECTED: A COMPOSER OR COMPOSER/AUTHOR MUST BE INCLUDED ON THE WORK.                                                                                 ',
        'REV0000013000000000HOES MAD                                                      PUB11001      T928531955300000000            POP000310N      ORI   ORINON                                          N',
        'SPU000001300000000101P00000047DEXTER GORE PUBLISHING                        E 00000000001232860080              099050000990500009905000 N',
        'SPU000001300000000201P00000002SINGLES PUBLISHING                            AM00000000001022304137              021000000340000002100000 N',
        'SPT0000013000000003P00000002      050001000010000I0840N001',
        'SWR0000013000000004C00000848GORE JR                                      DEXTER TIEWON                  A HING                            AM00000000001022304137              021000000340000002100000 N',
        'SPT0000001600000003P00000002      012500250002500I0840N001',
        'SPU000000160000000402P00000027KYDJANA PUBLISHING                            E 00000000001219707158              021012500210125002101250 N',
        'SPU000000160000000502P00000002SINGLES PUBLISHING                            AM00000000001022304137              021000000340000002100000 N',
        'SPT0000001600000006P00000002      012500250002500I0840N001',
        'SWR0000001600000007C00000565GREY                                         MARK                           C          01033212327021012500210125002101250 N',
        'SWT0000001600000008C00000565012500000000000I0840N001',
        'PWR0000001600000009P00000028MARK GREY PUBLISHING                                                     C0000056501',
        'SWR000. A$AP ROCKY)                               PUB10994                                20240523RA',
        'REV0000013100000000PICK IT UP (FEAT. A$AP ROCKY)                                 PUB10994      T923932409500000000            POP000311N      ORI   ORINON                                          N',
        'SPU000001310000000101P00000047DEXTER GORE PUBLISHING                        E 00000000001232860080              099010000990100009901000 N',
        'SPU000001310000000201P00000002SINGLES PUBLISHING                            AM00000000001022304137              021000000340000002100000 N',
        'SPT0000013100000003P00000002      010000200002000I0840N001',
        'SWR0000013100000004C00000848GORE JR                                      DEXTER TIEWON                  A          00772684501021010000210100002101000 N',
        'SWT0000013100000005C00000848010000000000000I0840N001',
        'PWR0000013100000006P00000047DEXTER GORE PUBLISHING                                                   C0000084801',
        'OWR0000013100000007C00000907HESTER                                       ANTHONY                        C          00014038230010050000100500001005000 N',
        'OWR0000013100000008C00000908MAYERS                                       RAKIM                          A          00679426201021015000210150002101500 N',
        'OWR0000013100000009C00000909PARKER                                       BRANDON LAVONTA                C          00704925152021005000210050002100500 N',
        'OWR0000013100000010C00000910ROBERT JR                                    TROCON MARKOUS                 C          00559803122021010000210100002101000 N',
        'PER0000013100000011FAMOUS DEX A$AP ROCKY',
        'REC000001310000001200000000                                                            000000                                                                                                                                                            QMCE31701365     PICK IT UP (FEAT. A$AP ROCKY)                                                                                           FAMOUS DEX A$AP ROCKY                                                                                                   Y',
        'REC000001310000001300000000                                                            000000                                                                                                                                                            QMCE31701367     PICK IT UP (FEAT. A$AP ROCKY)                                                                                           FAMOUS DEX A$AP ROCKY                                                                                                   Y',
        'REC000001310000001400000000                                                            000000                                                                                                                                                            QMCE31701368     PICK IT UP (FEAT. A$AP ROCKY)                                                                                           FAMOUS DEX A$AP ROCKY                                                                                                   Y',
        'REC000001310000001500000000                                                            000000                                                                                                                                                            QMCE31701366     PICK IT UP (FEAT. A$AP ROCKY)                                                                                           FAMOUS DEX A$AP ROCKY                                                                                                   Y',
      ];
      ackIngest.organiseLines(lines, (err) => {
        // It should skip PUB10994 and not include it in the read acknowledgements
        expect(Object.keys(ackIngest.acknowledgementDetailsById)).toContain('PUB11001');
        expect(Object.keys(ackIngest.acknowledgementDetailsById)).not.toContain('PUB10994');
        // The REV line for the skipped work should not be included in the grouped lines
        const revLines = ackIngest.acknowledgementDetailsById.PUB11001.filter((line) => line.startsWith('REV'));
        expect(revLines.length).toBe(1);
        expect(revLines[0]).toContain('PUB11001');
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  describe('readLineXRF', () => {
    it('should read the society code and identifier from an XRF line', () => {
      // Arrange
      const ackIngest = new CwrAcknowledgementIngest();
      // Act
      const xrf = ackIngest.readLineXRF('XRF0000000100000009052636677BR      WY');
      // Assert
      expect(xrf).toEqual({
        societyCode: '52',
        workIdentifier: '636677BR',
        fullIdentifier: '052636677BR',
        identifierType: 'W',
        validity: 'Y',
      });
    });
  });

  describe('ingestFile - receivingParty fallback', () => {
    let fileManagerStub;
    let deliveryPartnerCountStub;
    let deliveryPartnerFindStub;
    let workFindStub;
    let fsReadFileStub;

    beforeEach(() => {
      fileManagerStub = jest.spyOn(fileManager, 'downloadFromS3');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      fsReadFileStub = jest.spyOn(fs, 'readFile');
      deliveryPartnerCountStub = jest.spyOn(DeliveryPartner, 'countDocuments');
      deliveryPartnerFindStub = jest.spyOn(DeliveryPartner, 'findOne');
      workFindStub = jest.spyOn(Work, 'findOne');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use deliveryPartner.receivingParty as fallback when not found in file', (done) => {
      // Arrange
      const ackIngest = new CwrAcknowledgementIngest();
      const testFilePath = '/tmp/test-ack-file.txt';
      // File content without a valid HDR line (so receivingParty won't be set from file)
      // Just a group header and ACK line - no HDR line means receivingParty won't be extracted
      const fileContent = 'GRHACK0000102.10\nACK0000000000000000202405220325250000100000000REVTEST SONG PUB10298 20240523RA';

      fileManagerStub.mockImplementation((file, bucket, callback) => {
        callback(null, testFilePath);
      });
      fsReadFileStub.mockImplementation((path, encoding, callback) => {
        callback(null, fileContent);
      });

      const mockDeliveryPartner = {
        _id: 'testDeliveryPartnerId',
        receivingParty: 'BMI',
      };

      const cwrAcknowledgement = {
        file: 'test-ack-file.txt',
        clientId: 'testClientId',
        deliveryPartnerId: mockDeliveryPartner,
        workIds: [],
        source: null,
        status: 'Pending',
        ingestionError: null,
        save: jest.fn(),
      };
      // Set up save to return the object after it's created
      cwrAcknowledgement.save.mockResolvedValue(cwrAcknowledgement);

      deliveryPartnerCountStub.mockResolvedValue(1);
      deliveryPartnerFindStub.mockResolvedValue(mockDeliveryPartner);
      workFindStub.mockResolvedValue(null); // No works found, so no processing needed

      // Act
      ackIngest.ingestFile(cwrAcknowledgement, 'test@example.com', (err) => {
        // Assert
        // Verify that receivingParty was set from deliveryPartnerId
        expect(ackIngest.receivingParty).toBe('BMI');
        expect(cwrAcknowledgement.source).toBe('BMI');
        done();
      });
    });

    it('should throw an error if receivingParty is not found in the file or deliveryPartner', (done) => {
      // Arrange
      const ackIngest = new CwrAcknowledgementIngest();
      const testFilePath = '/tmp/test-ack-file.txt';
      // File content without a valid HDR line (so receivingParty won't be set from file)
      // Just a group header and ACK line - no HDR line means receivingParty won't be extracted
      const fileContent = 'GRHACK0000102.10\nACK0000000000000000202405220325250000100000000REVTEST SONG PUB10298 20240523RA';

      fileManagerStub.mockImplementation((file, bucket, callback) => {
        callback(null, testFilePath);
      });
      fsReadFileStub.mockImplementation((path, encoding, callback) => {
        callback(null, fileContent);
      });

      const mockDeliveryPartner = {
        _id: 'testDeliveryPartnerId',
      };

      const cwrAcknowledgement = {
        file: 'test-ack-file.txt',
        clientId: 'testClientId',
        deliveryPartnerId: mockDeliveryPartner,
        workIds: [],
        source: null,
        status: 'Pending',
        ingestionError: null,
        save: jest.fn(),
      };
      // Set up save to return the object after it's created
      cwrAcknowledgement.save.mockResolvedValue(cwrAcknowledgement);

      deliveryPartnerCountStub.mockResolvedValue(1);
      deliveryPartnerFindStub.mockResolvedValue(mockDeliveryPartner);
      workFindStub.mockResolvedValue(null); // No works found, so no processing needed

      // Act
      ackIngest.ingestFile(cwrAcknowledgement, 'test@example.com', (err) => {
        // Assert
        // The callback is called without an error, but ingestionError and status should be set
        expect(err).toBeUndefined();
        expect(cwrAcknowledgement.ingestionError).toBe('Couldn\'t retrieve the PRO from the acknowledgement file.');
        expect(cwrAcknowledgement.status).toBe('Errored');
        expect(cwrAcknowledgement.save).toHaveBeenCalled();
        done();
      });
    });
  });
});
