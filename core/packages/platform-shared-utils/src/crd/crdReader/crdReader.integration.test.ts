import { readFileSync } from 'node:fs';
import { CrdReader } from './crdReader';
import { randomString } from '../../testUtils';

const appRootDir = process.env.APP_ROOT_DIR;

describe('crdReader', () => {
  it('should load CRD v2 data correctly', async () => {
    // Fixture covers:
    //   SDN section: 3× ESI (Albania/France/Germany), 3× IPI (2 composers + 1 publisher),
    //                3× API (show+episode+title, show+episode+title, title-only),
    //                3× RPI (distinct barcodes + cat nos)
    //   MWN 1 (1 MDS block, Mechanical): WEA→ESI1/API1, WER→ESI2/RPI1, WEP→ESI3
    //   MWN 2 (2 MDS blocks):
    //     MDS-A (Mechanical): WEA→ESI2/API2, WER→ESI3/RPI2, WEP→ESI1
    //     MDS-B (Performance): WEA→ESI3/API3, WER→ESI1/RPI3, WEP→ESI2
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should resolve WEP ESI lookups correctly', async () => {
    // Fixture: 1 ESI (SRC001 → ALBANIA / Source One), 1 MWN, 1 MDS, 3 WEP lines:
    //   WEP 1 — ESI code matches SRC001 → Territory=ALBANIA, Sub Source=Source One
    //   WEP 2 — blank ESI code          → Territory='',      Sub Source=''
    //   WEP 3 — ESI code SRCMISS (no matching ESI line) → Territory='', Sub Source=''
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-wep-esi-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-wep-esi-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should resolve WEA ESI and API lookups correctly', async () => {
    // Fixture: 1 ESI (SRC001 → ALBANIA / Source One), 1 API (SHOW001 → title + episode + episode title),
    //          1 MWN, 1 MDS, 5 WEA lines:
    //   WEA 1 — ESI matches SRC001, API matches SHOW001 → Territory + Description both populated
    //   WEA 2 — blank ESI code                          → Territory='', Sub Source=''
    //   WEA 3 — ESI code SRCMISS (no matching ESI line) → Territory='', Sub Source=''
    //   WEA 4 — blank API code                          → Description='', Song Code=''
    //   WEA 5 — API code SHOWMISS (no matching API line) → Description=''
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-wea-lookups-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-wea-lookups-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should resolve WER ESI and RPI lookups correctly', async () => {
    // Fixture: 1 ESI (SRC001 → ALBANIA / Source One), 1 RPI (RPI001 → barcode + cat no),
    //          1 MWN, 1 MDS, 5 WER lines:
    //   WER 1 — ESI matches SRC001, RPI matches RPI001 → Territory + Barcode + Cat No all populated
    //   WER 2 — blank ESI code                         → Territory='', Sub Source=''
    //   WER 3 — ESI code SRCMISS (no matching ESI line) → Territory='', Sub Source=''
    //   WER 4 — blank RPI code                         → Barcode='', Cat No=''
    //   WER 5 — RPI code RPIMISS (no matching RPI line) → Barcode='', Cat No=''
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-wer-lookups-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-wer-lookups-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should process ADJ lines correctly', async () => {
    // Fixture: 1 MWN, 2 MDS blocks, 5 ADJ lines:
    //   MDS A (has MDT → FRANCE):
    //     ADJ 1 — sign='-'   → territory=FRANCE, Negative, Description='01 INCORRECT AMOUNT'
    //     ADJ 2 — sign='+'   → territory=FRANCE, Positive, Description='02 CORRECTION'
    //   MDS B (no MDT):
    //     ADJ 3 — sign='-'   → territory='',     Negative
    //     ADJ 4 — blank sign → territory='',     Positive (anything not '-')
    //     ADJ 5 — blank commentary → Description='05 ' (code + trailing space)
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-adj-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-adj-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should fall back to SDN channel when no MDR line is present', async () => {
    // Fixture: SDN typeOfRightCategory=PER (Performance), 1 MWN, 2 MDS blocks:
    //   MDS A — has MDR (MEC) → channel overridden to Mechanical
    //   MDS B — no MDR       → channel falls back to SDN → Performance
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-no-mdr-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-no-mdr-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should calculate net amount arithmetically when remittedRoyaltyAmount is blank', async () => {
    // Fixture: 2 WEA lines, both with gross=5.0000, tax=1.0000, commission=0.5000:
    //   WEA 1 — remittedRoyaltyAmount=4.0000 → Net Amount uses remitted value (4.0000)
    //   WEA 2 — remittedRoyaltyAmount=blank  → Net Amount = gross - tax - commission (3.5000)
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-net-amount-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-net-amount-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should load CRD v3 data correctly', async () => {
    // Fixture covers (v3.03 offsets, 18-char monetary fields, 12-char quantity):
    //   SDN section: 3× ESI (Albania/France/Germany), 3× IPI (2 composers + 1 publisher),
    //                3× API (show+episode+title, show+episode+title, title-only),
    //                3× RPI (distinct barcodes + cat nos, first two with soundCarrierArtist)
    //   MWN 1 (1 MDS block, Mechanical): WEA→ESI1/API1/RPI1, WER→ESI2/RPI1 (+societyAvWorkIdentifier, trackArtist), WEP→ESI3
    //   MWN 2 (2 MDS blocks):
    //     MDS-A (Mechanical): WEA→ESI2/API2/RPI2, WER→ESI3/RPI2, WEP→ESI1
    //     MDS-B (Performance): WEA→ESI3/API3/RPI3, WER→ESI1/RPI3, WEP→ESI2
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-sample-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should resolve v3 WEP ESI lookups correctly', async () => {
    // Fixture (v3.03): 1 ESI (SRC001 → ALBANIA / Source One), 1 MWN, 1 MDS, 3 WEP lines:
    //   WEP 1 — ESI code matches SRC001 → Territory=ALBANIA, Sub Source=Source One
    //   WEP 2 — blank ESI code          → Territory='',      Sub Source=''
    //   WEP 3 — ESI code SRCMISS        → Territory='',      Sub Source=''
    //   v3-only fields (commissionRate, MdrSequenceNumber, MdtSequenceNumber) populated on WEP 1
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-wep-esi-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-wep-esi-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should resolve v3 WEA ESI and API lookups correctly', async () => {
    // Fixture (v3.03): 1 ESI (SRC001 → ALBANIA / Source One), 1 API (SHOW001 → title + episode + episode title),
    //          1 MWN, 1 MDS, 5 WEA lines:
    //   WEA 1 — ESI matches SRC001, API matches SHOW001 → Territory + Description both populated
    //           v3-only fields populated: recordedProductNumber=RPI001, commissionRate, MdrSequenceNumber, MdtSequenceNumber
    //   WEA 2 — blank ESI code                          → Territory='', Sub Source=''
    //   WEA 3 — ESI code SRCMISS (no matching ESI line) → Territory='', Sub Source=''
    //   WEA 4 — blank API code                          → Description='', Song Code=''
    //   WEA 5 — API code SHOWMISS (no matching API line) → Description=''
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-wea-lookups-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-wea-lookups-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should resolve v3 WER ESI and RPI lookups correctly', async () => {
    // Fixture (v3.03): 1 ESI (SRC001 → ALBANIA / Source One), 1 RPI (RPI001 → barcode + cat no + soundCarrierArtist),
    //          1 MWN, 1 MDS, 5 WER lines:
    //   WER 1 — ESI matches SRC001, RPI matches RPI001 → Territory + Barcode + Cat No all populated
    //           v3-only fields populated: societyAvWorkIdentifier=SHOW001, trackArtist, MdrSequenceNumber, MdtSequenceNumber
    //   WER 2 — blank ESI code                         → Territory='', Sub Source=''
    //   WER 3 — ESI code SRCMISS (no matching ESI line) → Territory='', Sub Source=''
    //   WER 4 — blank RPI code                         → Barcode='', Cat No=''
    //   WER 5 — RPI code RPIMISS (no matching RPI line) → Barcode='', Cat No=''
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-wer-lookups-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-wer-lookups-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should process v3 ADJ lines correctly', async () => {
    // Fixture (v3.03): 1 MWN, 2 MDS blocks, 5 ADJ lines (adjustmentAmount is 18 chars in v3):
    //   MDS A (has MDT → FRANCE):
    //     ADJ 1 — sign='-'   → territory=FRANCE, Negative, Description='01 INCORRECT AMOUNT'
    //     ADJ 2 — sign='+'   → territory=FRANCE, Positive, Description='02 CORRECTION'
    //   MDS B (no MDT):
    //     ADJ 3 — sign='-'   → territory='',     Negative
    //     ADJ 4 — blank sign → territory='',     Positive (anything not '-')
    //     ADJ 5 — blank commentary → Description='05 ' (code + trailing space)
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-adj-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-adj-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should fall back to SDN channel when no MDR line is present (v3)', async () => {
    // Fixture (v3.03): SDN typeOfRightCategory=PER (Performance), 1 MWN, 2 MDS blocks:
    //   MDS A — has MDR (MEC) → channel overridden to Mechanical
    //   MDS B — no MDR       → channel falls back to SDN → Performance
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-no-mdr-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-no-mdr-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should calculate net amount arithmetically when remittedRoyaltyAmount is blank (v3)', async () => {
    // Fixture (v3.03): 2 WEA lines, both with gross=5.0000, tax=1.0000, commission=0.5000:
    //   WEA 1 — remittedRoyaltyAmount=4.0000 → Net Amount uses remitted value (4.0000)
    //   WEA 2 — remittedRoyaltyAmount=blank  → Net Amount = gross - tax - commission (3.5000)
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v3-net-amount-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v3-net-amount-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should fall back to originalTitleOfTheAVWork when AVI originalTitle is blank', async () => {
    // Fixture: HDR + 2 AVI rows:
    //   AVI 1 — originalTitle populated   → Work Title = originalTitle
    //   AVI 2 — originalTitle blank,
    //            originalTitleOfAVWork populated → Work Title = originalTitleOfAVWork
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v4-avi-title-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-avi-title-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should emit MCH barcode only when EAN/UPC is non-zero', async () => {
    // Fixture: HDR + 2 MCH rows:
    //   MCH 1 — EANUPCBarCode='1234567890123' (non-zero) → Barcode='1234567890123'
    //   MCH 2 — EANUPCBarCode='0000000000000' (zero)     → Barcode=''
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v4-mch-barcode-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-mch-barcode-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should map v4 ADJ adjustmentType to the correct channel', async () => {
    // Fixture: HDR + 3 ADJ rows testing all adjustmentType channel branches:
    //   ADJ 1 — adjustmentType='MCH' → Channel='Mechanical'
    //   ADJ 2 — adjustmentType='PRF' → Channel='Performance'
    //   ADJ 3 — adjustmentType='GEN' (unknown) → Channel=null
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v4-adj-types-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-adj-types-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should load CRD v2 data correctly even if no MWN records exist', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v2-no-mwn.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v2-no-mwn-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should load CRD v3.03 data correctly', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v303-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v303-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });
  
  it('should not accept CRD v3.06 data', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act & Assert
    await expect(reader.readCrdFile(`${appRootDir}/data/crd/v306-sample.dat`, 'utf8')).rejects.toThrow(
      'Unsupported CRD version: 03.06'
    );
  });

  it('should load CRD v4 data correctly', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v4-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should load CRD v4.01 data correctly', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/v4-01-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-01-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should load PRS CRD v4 data correctly', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/prs-v4-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should load PRS CRD v4.01 data correctly', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act
    const results = await reader.readCrdFile(`${appRootDir}/data/crd/prs-v4-01-sample.dat`, 'utf8');
    // Assert
    const expectedResults = JSON.parse(readFileSync(`${appRootDir}/data/crd/v4-01-expected-results.json`, 'utf8'));
    expect(results).toEqual(expectedResults);
  });

  it('should error when an invalid file is given', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act & Assert
    await expect(reader.readCrdFile(`${appRootDir}/data/crd/invalid-sample.txt`, 'utf8')).rejects.toThrow(
      'There was an error reading the CRD file. Data does not look like CRD Data'
    );
  });
  
  it('should error when a file without HDR is given', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act & Assert
    await expect(reader.readCrdFile(`${appRootDir}/data/crd/v3-missing-hdr.crd`, 'utf8')).rejects.toThrow(
      'There was an error reading the CRD file. Data does not look like CRD Data'
    );
  });

  it('should error when file path does not exist', async () => {
    // Arrange
    const reader = new CrdReader();
    // Act & Assert
    await expect(reader.readCrdFile(`${appRootDir}/data/crd/${randomString()}`, 'utf8')).rejects.toThrow(
      'File does not exist'
    );
  });
});
