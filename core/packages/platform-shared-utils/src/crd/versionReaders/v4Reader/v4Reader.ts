import { open } from 'node:fs/promises';

import logger from '../../../logger';
import { CRD_FILE_HEADER } from '../constants';
import { CrdData4 } from '../types/crdV4Types';
import { addDecimalPoint, extractDateFromCombined, FieldExtractor, formatDate, readField } from '../utils';

export class V4Reader {
  private data: CrdData4;

  private version: string;

  private prs: boolean;

  constructor(version: string, prs: boolean) {
    this.version = version;
    this.prs = prs;
    this.data = {
      rows: [],
    };
  }

  async readCrdFile(filePath: string, encoding: BufferEncoding): Promise<string[][]> {
    try {
      const file = await open(filePath);
      const options = encoding ? { encoding } : {};

      for await (const line of file.readLines(options)) {
        const lineType = readField({ line, start: 10, length: 3 });
        if (lineType === 'HDR') this.readHdrLine(line);
        else if (lineType === 'MCH') this.readMchLine(line);
        else if (lineType === 'PRF') this.readPrfLine(line);
        else if (lineType === 'AVI') this.readAviLine(line);
        else if (lineType === 'ADJ') this.readAdjLine(line);
      }
      if (!this.data?.rows?.length) {
        throw new Error('There was an error reading the CRD file. Data does not look like CRD Data');
      }
      const result = this.processCrdData();
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err?.message === 'path must be a string or Buffer') {
        throw new Error('File does not exist');
      } else {
        logger.error(err);
        throw new Error('There was an error reading the CRD file. Check file is valid.');
      }
    }
  }

  readHdrLine(line: string) {
    const extractor = new FieldExtractor(line);
    this.data.hdr = {
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3) as 'HDR',
      codeOfRemittingSociety: extractor.extractString(9),
      nameOfRemittingSociety: extractor.extractString(45),
      codeOfReceivingCompany: extractor.extractString(9),
      nameOfReceivingCompany: extractor.extractString(45),
      creationDate: extractor.extractString(10),
      creationTime: extractor.extractString(8),
      transmissionDate: extractor.extractString(10),
      decimalPlacesAmountField: Number(extractor.extractString(1)),
      decimalPlacesRoyaltyFeeField: Number(extractor.extractString(1)),
      currency: extractor.extractString(3),
      versionNumber: extractor.extractString(5),
    };
  }

  readMchLine(line: string) {
    const extractor = new FieldExtractor(line);
    this.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3) as 'MCH',
      distributionIdentificationCode: extractor.extractString(7),
      distributionCategory: extractor.extractString(2),
      codeNameLicensee: extractor.extractString(6),
      EANUPCBarCode: extractor.extractString(13),
      catalogueNumber: extractor.extractString(18),
      labelBroadcastChannel: this.version === '4.01' ? extractor.extractString(50) : extractor.extractString(15),
      configuration: extractor.extractString(6),
      titleOfSoundCarrier: extractor.extractString(60),
      artistName: extractor.extractString(75),
      releaseDate: extractor.extractString(10),
      originalTitle: extractor.extractString(60),
      subTitle: extractor.extractString(60),
      compositeWorkIndicator: extractor.extractString(1),
      indicatorForInstrumentalVocalUse: extractor.extractString(1),
      IP1: extractor.extractString(30),
      IP2: extractor.extractString(30),
      IP3: extractor.extractString(30),
      IP4: extractor.extractString(30),
      isrc: extractor.extractString(12),
      iswc: extractor.extractString(11),
      workCode: extractor.extractString(12),
      numberOfTracks: extractor.extractString(6),
      numberOfSides: extractor.extractString(6),
      numberOfTracksPerSide: extractor.extractString(6),
      trackCalculationType: extractor.extractString(1),
      durationOfWork: extractor.extractString(this.prs ? 16 : 8),
      durationOfProductMusicalworksOnly: extractor.extractString(8),
      durationOfProductInclNonMusicalWorks: extractor.extractString(8),
      shareTrackInPercent: extractor.extractString(6),
      periodOfAccount: extractor.extractString(12),
      quantity: extractor.extractString(this.prs ? 10 : 8),
      codeOfTerritory: extractor.extractString(6),
      territoryName: extractor.extractString(20),
      basisPriceForLicensing: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      salesType: extractor.extractString(3),
      licensingRatePercent: extractor.extractString(5),
      royaltiesAvailableForDistribution: extractor.extractString(10),
      nameOfRightOwner: extractor.extractString(75),
      nationalNumberOfRightOwner: extractor.extractString(10),
      IPINumber: extractor.extractString(11),
      societyCodeOfRightOwner: extractor.extractString(3),
      categoryOfRightOwner: extractor.extractString(2),
      codeOfTypeOfShareStructure: extractor.extractString(1),
      romeRuleIndicator: extractor.extractString(1),
      shareNumerator: extractor.extractString(5),
      shareDenominator: extractor.extractString(5),
      sharePercentage: extractor.extractString(8),
      songCodeOfPublisher: extractor.extractString(14),
      shareAmountGross: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      sourceCollectingSocietyForeignIncome: extractor.extractString(3),
      commissionSourceCollectionSociety: extractor.extractString(10),
      commissionRemittingSociety: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      tax: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      shareAmountNet: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      royaltyFee: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(6),
      totalGrossAmountPerSale: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      percentageReceivedByTheRemittingSocietyForFeesPaidInError: extractor.extractString(5),
      referenceNumberDistributionRecord: extractor.extractString(7),
      signIndicator: extractor.extractString(1),
      sourceType: extractor.extractString(3),
      sourceDescription: extractor.extractString(30),
      // v4.01 only below
      invoiceNumber: this.version === '4.01' ? extractor.extractString(12) : null,
      originalInvoiceNumber: this.version === '4.01' ? extractor.extractString(12) : null,
      serviceType: this.version === '4.01' ? extractor.extractString(3) : null,
      licenseeNumber: this.version === '4.01' ? extractor.extractString(9) : null,
      usageCategory: this.version === '4.01' ? extractor.extractString(7) : null,
      uniqueSupplierID: this.version === '4.01' ? extractor.extractString(22) : null,
      productType: this.version === '4.01' ? extractor.extractString(5) : null,
      usageGroupCode: this.version === '4.01' ? extractor.extractString(5) : null,
    });
  }

  readPrfLine(line: string) {
    const extractor = new FieldExtractor(line);
    this.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3) as 'PRF',
      distributionIdentificationCode: extractor.extractString(7),
      distributionCategory: extractor.extractString(2),
      labelBroadcastChannel: this.version === '4.01' ? extractor.extractString(50) : extractor.extractString(15),
      originalTitle: extractor.extractString(60),
      subTitle: extractor.extractString(60),
      compositeWorkIndicator: extractor.extractString(1),
      indicatorForInstrumentalVocalUse: extractor.extractString(1),
      IP1: extractor.extractString(30),
      IP2: extractor.extractString(30),
      IP3: extractor.extractString(30),
      IP4: extractor.extractString(30),
      isrc: extractor.extractString(12),
      iswc: extractor.extractString(11),
      workCode: extractor.extractString(12),
      periodOfAccount: extractor.extractString(12),
      numberOfPerformancesBroadcasts: extractor.extractString(this.prs ? 10 : 8),
      broadcastStationCount: extractor.extractString(7),
      surveyType: extractor.extractString(1),
      timeOfDay: extractor.extractString(1),
      dayOfWeek: extractor.extractString(1),
      usageIndicator: extractor.extractString(2),
      codeOfTerritory: extractor.extractString(6),
      territoryName: extractor.extractString(20),
      bonusLevelPerformanceIndicator: extractor.extractString(1),
      royaltiesAvailableForDistributionForTheWork: extractor.extractString(10),
      basisOfRateOfCalculation: extractor.extractString(1),
      ratePerBroadcast: extractor.extractString(10),
      nameOfRightOwner: extractor.extractString(75),
      nationalNumberOfRightOwner: extractor.extractString(10),
      IPINumber: extractor.extractString(11),
      societyCodeOfRightOwner: extractor.extractString(3),
      categoryOfRightOwner: extractor.extractString(2),
      codeOfTypeOfShareStructure: extractor.extractString(1),
      warsawRuleIndicator: extractor.extractString(1),
      shareNumerator: extractor.extractString(5),
      shareDenominator: extractor.extractString(5),
      sharePercentage: extractor.extractString(8),
      songCodeOfPublisher: extractor.extractString(14),
      shareAmountGross: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      sourceCollectingSocietyForeignIncome: extractor.extractString(3),
      commissionSourceCollectionSociety: extractor.extractString(10),
      commissionRemittingSociety: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      tax: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      shareAmountNet: this.version === '4.01' ? extractor.extractString(18) : extractor.extractString(10),
      percentageReceivedByTheRemittingSocietyForFeesPaidInError: extractor.extractString(5),
      referenceNumber: extractor.extractString(7),
      signIndicator: extractor.extractString(1),
      // v4.01 only below
      invoiceNumber: this.version === '4.01' ? extractor.extractString(12) : null,
      originalInvoiceNumber: this.version === '4.01' ? extractor.extractString(12) : null,
      titleOfProductProduction: this.version === '4.01' ? extractor.extractString(60) : null,
      serviceType: this.version === '4.01' ? extractor.extractString(3) : null,
      licenseeNumber: this.version === '4.01' ? extractor.extractString(9) : null,
      catalogueNumber: this.version === '4.01' ? extractor.extractString(18) : null,
      artist: this.version === '4.01' ? extractor.extractString(30) : null,
      venue: this.version === '4.01' ? extractor.extractString(50) : null,
      performanceDate: this.version === '4.01' ? extractor.extractString(10) : null,
      usageCategory: this.version === '4.01' ? extractor.extractString(7) : null,
      uniqueSupplierID: this.version === '4.01' ? extractor.extractString(22) : null,
      productType: this.version === '4.01' ? extractor.extractString(5) : null,
      usageGroupCode: this.version === '4.01' ? extractor.extractString(5) : null,
    });
  }

  readAviLine(line: string) {
    const extractor = new FieldExtractor(line);
    this.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3) as 'AVI',
      distributionIdentificationCode: extractor.extractString(7),
      distributionCategory: extractor.extractString(2),
      labelBroadcastChannel: extractor.extractString(15),
      originalTitle: extractor.extractString(60),
      subTitle: extractor.extractString(60),
      compositeWorkIndicator: extractor.extractString(1),
      indicatorForInstrumentalVocalUse: extractor.extractString(1),
      IP1: extractor.extractString(30),
      IP2: extractor.extractString(30),
      IP3: extractor.extractString(30),
      IP4: extractor.extractString(30),
      iswc: extractor.extractString(11),
      workCode: extractor.extractString(12),
      airDate: extractor.extractString(10),
      audioVisualWorkCode: extractor.extractString(16),
      isan: extractor.extractString(16),
      audioVisualWorkType: extractor.extractString(3),
      audioVisualWorkCategory: extractor.extractString(1),
      nameOfProducer: extractor.extractString(75),
      yearOfProductionOrRelease: extractor.extractString(4),
      nameOfDirector: extractor.extractString(75),
      leadingActor: extractor.extractString(75),
      countryOfOriginOfTheAVWork: extractor.extractString(3),
      originalTitleOfTheAVWork: extractor.extractString(60),
      localTitleOfTheAVWork: extractor.extractString(60),
      originalTitleOfTheEpisode: extractor.extractString(60),
      localTitleOfTheEpisode: extractor.extractString(60),
      producerEpisodeNumber: extractor.extractString(15),
      societyEpisodeNumber: extractor.extractString(15),
      totalDurationOfTheAVWork: extractor.extractString(8),
      totalDurationOfTheMusic: extractor.extractString(8),
      totalDurationOfTheProtectedMusic: extractor.extractString(this.prs ? 16 : 8),
      totalMusicDuration: extractor.extractString(10),
      originOfWorkOrCue: extractor.extractString(1),
      sequenceNumberOfWorkOrCue: extractor.extractString(3),
      durationOfWorkOrCue: extractor.extractString(this.prs ? 16 : 8),
      periodOfAccount: extractor.extractString(12),
      numberOfPerformancesBroadcasts: extractor.extractString(this.prs ? 10 : 8),
      broadcastStationCount: extractor.extractString(7),
      surveyType: extractor.extractString(1),
      timeOfDayAired: extractor.extractString(1),
      dayOfWeekFactor: extractor.extractString(1),
      usageIndicator: extractor.extractString(2),
      codeOfTerritory: extractor.extractString(6),
      territoryName: extractor.extractString(20),
      bonusLevelPerformanceIndicator: extractor.extractString(1),
      royaltiesAvailableForDistributionForTheWork: extractor.extractString(10),
      basisOfRateOfCalculation: extractor.extractString(1),
      ratePerBroadcast: extractor.extractString(10),
      nameOfRightOwner: extractor.extractString(75),
      nationalNumberOfRightOwner: extractor.extractString(10),
      IPINumber: extractor.extractString(11),
      societyCodeOfRightOwner: extractor.extractString(3),
      categoryOfRightOwner: extractor.extractString(2),
      codeOfTypeOfShareStructure: extractor.extractString(1),
      warsawRuleIndicator: extractor.extractString(1),
      shareNumerator: extractor.extractString(5),
      shareDenominator: extractor.extractString(5),
      sharePercentage: extractor.extractString(8),
      songCodeOfPublisher: extractor.extractString(14),
      shareAmountGross: extractor.extractString(10),
      sourceCollectingSocietyForeignIncome: extractor.extractString(3),
      commissionSourceCollectionSociety: extractor.extractString(10),
      commissionRemittingSociety: extractor.extractString(10),
      tax: extractor.extractString(10),
      shareAmountNet: extractor.extractString(10),
      totalGrossAmountPerBroadcast: extractor.extractString(10),
      percentageReceivedByTheRemittingSocietyForFeesPaidInError: extractor.extractString(5),
      referenceNumber: extractor.extractString(7),
      signIndicator: extractor.extractString(1),
    });
  }

  readAdjLine(line: string) {
    const extractor = new FieldExtractor(line);
    this.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3) as 'ADJ',
      distributionIdentificationCode: extractor.extractString(7),
      distributionCategory: extractor.extractString(2),
      adjustmentType: extractor.extractString(3),
      IPINumber: extractor.extractString(11),
      originalReferenceNumber: extractor.extractString(7),
      workTitle: extractor.extractString(60),
      workNo: extractor.extractString(12),
      usageCode: extractor.extractString(6),
      usageDescription: extractor.extractString(20),
      IP1: extractor.extractString(30),
      IP2: extractor.extractString(30),
      IP3: extractor.extractString(30),
      IP4: extractor.extractString(30),
      productionCatalogueNo: extractor.extractString(80),
      periodStartDate: extractor.extractString(10),
      periodEndDate: extractor.extractString(10),
      noOfPerformances: extractor.extractString(this.prs ? 10 : 8),
      totalDuration: extractor.extractString(this.prs ? 16 : 8),
      oldShareNumerator: extractor.extractString(5),
      oldShareDenominator: extractor.extractString(5),
      oldSharePercentage: extractor.extractString(8),
      newShareNumerator: extractor.extractString(5),
      newShareDenominator: extractor.extractString(5),
      newSharePercentage: extractor.extractString(8),
      netAdjustmentValue: extractor.extractString(10),
      adjustmentReason: extractor.extractString(80),
      invoiceRefNo: extractor.extractString(20),
      adjustmentRefNo: extractor.extractString(30),
      signIndicator: extractor.extractString(1),
    });
  }
  // currently unused as is just a summary of included records and total amounts
  /*
  this.readTrlLine = function(line) {
    this.data.rows.push(
      Transaction sequence number
      Record type
      Transaction count
      Control total - Total Gross Amount
      Sign indicator - Total Gross Amount
      Control total - Total Commission
      Sign Indicator - Total Commission
      Control total - Total tax
      Sign Indicator - Total Tax
      Control total - Total amount net
      Sign Indicator - Total amount net
      Control total - Adjustment amount
      Sign Indicator - Adjustment amount
      Hash total
      Sign Indicator - Hash total
      Number of mechanical records
      Number of performance records
      Number of audio-visual records
      Number of adjustment records
    );
  };
  */

  processCrdData() {
    const result = [];
    result.push(CRD_FILE_HEADER);

    this.data.rows.forEach((row) => {
      let distributionChannel;
      let dateFrom;
      let dateTo;
      let description;
      let units;
      let grossAmount;
      let netAmount;

      if (row.recordType === 'MCH' || row.recordType === 'PRF' || row.recordType === 'AVI') {
        dateFrom = extractDateFromCombined(row.periodOfAccount, 0); // first part of YYYYMMYYYYMM
        dateTo = extractDateFromCombined(row.periodOfAccount, 1); // second part of YYYYMMYYYYMM
        grossAmount = addDecimalPoint(row.shareAmountGross, this.data.hdr?.decimalPlacesAmountField);
        netAmount = addDecimalPoint(row.shareAmountNet, this.data.hdr?.decimalPlacesAmountField);
      }
      if (row.recordType === 'MCH') {
        distributionChannel = 'Mechanical';
        units = Number(row.quantity);
      }
      if (row.recordType === 'PRF') {
        distributionChannel = 'Performance';
        units = Number(row.numberOfPerformancesBroadcasts);
      }
      if (row.recordType === 'AVI') {
        distributionChannel = 'Audio Visual';
        units = Number(row.numberOfPerformancesBroadcasts);
      }
      if (row.recordType === 'ADJ') {
        const adjType = row.adjustmentType;
        if (adjType === 'MCH') {
          distributionChannel = 'Mechanical';
        } else if (adjType === 'PRF') {
          distributionChannel = 'Performance';
        } else if (adjType === 'AVI') {
          distributionChannel = 'Audio Visual';
        } else {
          distributionChannel = null;
        }
        dateFrom = formatDate(row.periodStartDate, 'YYYY-MM-DD');
        dateTo = formatDate(row.periodEndDate, 'YYYY-MM-DD');
        grossAmount = addDecimalPoint(row.netAdjustmentValue, this.data.hdr?.decimalPlacesAmountField);
        netAmount = grossAmount;
      }

      const data = [
        distributionChannel, // Channel
        this.data.hdr?.nameOfRemittingSociety || '', // Source
        formatDate(this.data.hdr?.transmissionDate, 'YYYY-MM-DD') || '', // Transaction Date
        dateTo || '', // Sale Date
        dateFrom || '', // Date From
        dateTo || '', // Date To
        (row.recordType !== 'ADJ' && row.codeOfTerritory) || '', // Territory
        (row.recordType !== 'ADJ' ? row.labelBroadcastChannel : row.usageDescription) || '', // Sub Source
        (row.recordType !== 'ADJ' && row.originalTitle) ||
          (row.recordType === 'AVI' && row.originalTitleOfTheAVWork) ||
          (row.recordType === 'ADJ' && row.workTitle) ||
          '', // Work Title
        (row.recordType === 'MCH' && row.titleOfSoundCarrier) || '', // Release Title
        (row.recordType === 'MCH' && row.artistName) || '', // Release Artist
        row.IP1 || '', // Party 1
        row.IP2 || '', // Party 2
        row.IP3 || '', // Party 3
        row.IP4 || '', // Party 4
        description || '', // Description
        (row.recordType === 'MCH' && row.configuration) || '', // Configuration
        (row.recordType !== 'ADJ' ? row.workCode : row.workNo) || '', // Identifier
        (row.recordType === 'AVI' && row.isan) || '', // ISAN
        (row.recordType === 'AVI' && row.audioVisualWorkType) || '', // AV Work Type
        (row.recordType === 'AVI' && row.originalTitleOfTheEpisode) || '', // Episode
        (row.recordType !== 'ADJ' && row.iswc) || '', // ISWC
        ((row.recordType === 'MCH' || row.recordType === 'PRF') && row.isrc) || '', // ISRC
        row.recordType === 'MCH' && Number(row.EANUPCBarCode) !== 0 ? row.EANUPCBarCode || '' : '', // Barcode
        ((row.recordType === 'MCH' || row.recordType === 'PRF') && row.catalogueNumber) || '', // Cat No
        (row.recordType !== 'ADJ' && row.songCodeOfPublisher) || '', // Song Code
        (row.recordType === 'AVI' && Number(row.durationOfWorkOrCue)) ||
          (row.recordType === 'MCH' && Number(row.durationOfWork)) ||
          null, // Duration
        units || null, // Units
        Number(row.recordType !== 'ADJ' ? row.sharePercentage : row.newSharePercentage) / 100000 || null, // Share Percentage
        grossAmount || null, // Gross Amount
        netAmount || null, // Net Amount
        this.data.hdr?.currency || '', // Original Currency
        row.signIndicator || '', // Positive/Negative
        (row.recordType === 'MCH' && row.salesType) || '', // Sales Type
        (row.recordType !== 'ADJ' && row.territoryName) || '', // Territory Name
        (row.recordType !== 'ADJ' && row.sourceCollectingSocietyForeignIncome) || '', // Source Collecting Society
        (row.recordType === 'MCH' && row.sourceType) || '', // Source Type
        (row.recordType === 'MCH' && row.sourceDescription) || '', // Source Description
        (row.recordType === 'ADJ' && row.productionCatalogueNo) || '', // Production
        (row.recordType === 'ADJ' && row.adjustmentReason) || '', // Adjustment Reason
        '', // Composers
        '', // Party 5
        '', // Withholding At Source
      ];
      result.push(data);
    });
    return result;
  }
}
