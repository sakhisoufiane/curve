const LineByLineReader = require('line-by-line');

const logger = require('../logger');
const { addDecimalPoint, formatDate } = require('./utils');

const v4ReaderObject = function (version, prs) {
  const crd = this;
  crd.data = {
    rows: [],
  };

  this.readCrdFile = function (file, encoding, callback) {
    try {
      const options = encoding ? { encoding } : {};
      const lineByLineReader = new LineByLineReader(file, options);
      lineByLineReader
        .on('line', (line) => {
          const lineType = line.substr(10, 3);
          if (lineType === 'HDR') crd.readHdrLine(line);
          else if (lineType === 'MCH') crd.readMchLine(line);
          else if (lineType === 'PRF') crd.readPrfLine(line);
          else if (lineType === 'AVI') crd.readAviLine(line);
          else if (lineType === 'ADJ') crd.readAdjLine(line);

          // currently unused as is just a summary of included records and total amounts
          // else if (lineType === 'TRL') crd.readTrlLine(line);
        })
        .on('end', () => {
          if (crd?.data?.rows?.length > 0) {
            crd.processCrdData(callback);
          } else {
            callback(new Error('There was an error reading the CRD file. Data does not look like CRD Data'));
          }
        });
    } catch (err) {
      if (err.message === 'path must be a string or Buffer') {
        callback(new Error('File does not exist'));
      } else {
        logger.error(err);
        callback(new Error('There was an error reading the CRD file. Check file is valid.'));
      }
    }
  };
  // Version 4 - V4 - extract line data
  this.readHdrLine = function (line) {
    const extractor = new FieldExtractor(line);
    crd.data.hdr = {
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3),
      codeOfRemittingSociety: extractor.extractString(9),
      nameOfRemittingSociety: extractor.extractString(45),
      codeOfReceivingCompany: extractor.extractString(9),
      nameOfReceivingCompany: extractor.extractString(45),
      creationDate: extractor.extractString(10),
      creationTime: extractor.extractString(8),
      transmissionDate: extractor.extractString(10),
      decimalPlacesAmountField: extractor.extractString(1),
      decimalPlacesRoyaltyFeeField: extractor.extractString(1),
      currency: extractor.extractString(3),
      versionNumber: extractor.extractString(5),
    };
  };
  this.readMchLine = function (line) {
    const extractor = new FieldExtractor(line);
    crd.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3),
      distributionIdentificationCode: extractor.extractString(7),
      distributionCategory: extractor.extractString(2),
      codeNameLicensee: extractor.extractString(6),
      EANUPCBarCode: extractor.extractString(13),
      catalogueNumber: extractor.extractString(18),
      labelBroadcastChannel: (version === '4.01') ? extractor.extractString(50) : extractor.extractString(15),
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
      durationOfWork: extractor.extractString(prs ? 16 : 8),
      durationOfProductMusicalworksOnly: extractor.extractString(8),
      durationOfProductInclNonMusicalWorks: extractor.extractString(8),
      shareTrackInPercent: extractor.extractString(6),
      periodOfAccount: extractor.extractString(12),
      quantity: extractor.extractString(prs ? 10 : 8),
      codeOfTerritory: extractor.extractString(6),
      territoryName: extractor.extractString(20),
      basisPriceForLicensing: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
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
      shareAmountGross: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      sourceCollectingSocietyForeignIncome: extractor.extractString(3),
      commissionSourceCollectionSociety: extractor.extractString(10),
      commissionRemittingSociety: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      tax: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      shareAmountNet: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      royaltyFee: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(6),
      totalGrossAmountPerSale: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      percentageReceivedByTheRemittingSocietyForFeesPaidInError: extractor.extractString(5),
      referenceNumberDistributionRecord: extractor.extractString(7),
      signIndicator: extractor.extractString(1),
      sourceType: extractor.extractString(3),
      sourceDescription: extractor.extractString(30),
      // v4.01 only below
      invoiceNumber: (version === '4.01') ? extractor.extractString(12) : null,
      originalInvoiceNumber: (version === '4.01') ? extractor.extractString(12) : null,
      serviceType: (version === '4.01') ? extractor.extractString(3) : null,
      licenseeNumber: (version === '4.01') ? extractor.extractString(9) : null,
      usageCategory: (version === '4.01') ? extractor.extractString(7) : null,
      uniqueSupplierID: (version === '4.01') ? extractor.extractString(22) : null,
      productType: (version === '4.01') ? extractor.extractString(5) : null,
      usageGroupCode: (version === '4.01') ? extractor.extractString(5) : null,
    });
  };
  this.readPrfLine = function (line) {
    const extractor = new FieldExtractor(line);
    crd.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3),
      distributionIdentificationCode: extractor.extractString(7),
      distributionCategory: extractor.extractString(2),
      labelBroadcastChannel: (version === '4.01') ? extractor.extractString(50) : extractor.extractString(15),
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
      numberOfPerformancesBroadcasts: extractor.extractString(prs ? 10 : 8),
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
      shareAmountGross: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      sourceCollectingSocietyForeignIncome: extractor.extractString(3),
      commissionSourceCollectionSociety: extractor.extractString(10),
      commissionRemittingSociety: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      tax: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      shareAmountNet: (version === '4.01') ? extractor.extractString(18) : extractor.extractString(10),
      percentageReceivedByTheRemittingSocietyForFeesPaidInError: extractor.extractString(5),
      referenceNumber: extractor.extractString(7),
      signIndicator: extractor.extractString(1),
      invoiceNumber: (version === '4.01') ? extractor.extractString(12) : null,
      originalInvoiceNumber: (version === '4.01') ? extractor.extractString(12) : null,
      titleOfProductProduction: (version === '4.01') ? extractor.extractString(60) : null,
      serviceType: (version === '4.01') ? extractor.extractString(3) : null,
      licenseeNumber: (version === '4.01') ? extractor.extractString(9) : null,
      catalogueNumber: (version === '4.01') ? extractor.extractString(18) : null,
      artist: (version === '4.01') ? extractor.extractString(30) : null,
      venue: (version === '4.01') ? extractor.extractString(50) : null,
      performanceDate: (version === '4.01') ? extractor.extractString(10) : null,
      usageCategory: (version === '4.01') ? extractor.extractString(7) : null,
      uniqueSupplierID: (version === '4.01') ? extractor.extractString(22) : null,
      productType: (version === '4.01') ? extractor.extractString(5) : null,
      usageGroupCode: (version === '4.01') ? extractor.extractString(5) : null,
    });
  };
  this.readAviLine = function (line) {
    const extractor = new FieldExtractor(line);
    crd.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3),
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
      totalDurationOfTheProtectedMusic: extractor.extractString(prs ? 16 : 8),
      totalMusicDuration: extractor.extractString(10),
      originOfWorkOrCue: extractor.extractString(1),
      sequenceNumberOfWorkOrCue: extractor.extractString(3),
      durationOfWorkOrCue: extractor.extractString(prs ? 16 : 8),
      periodOfAccount: extractor.extractString(12),
      numberOfPerformancesBroadcasts: extractor.extractString(prs ? 10 : 8),
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
  };
  this.readAdjLine = function (line) {
    const extractor = new FieldExtractor(line);
    crd.data.rows.push({
      transactionSequenceNumber: extractor.extractString(10),
      recordType: extractor.extractString(3),
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
      noOfPerformances: extractor.extractString(prs ? 10 : 8),
      totalDuration: extractor.extractString(prs ? 16 : 8),
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
  };
  // currently unused as is just a summary of included records and total amounts
  /*
  this.readTrlLine = function(line) {
    crd.data.rows.push(
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

  this.processCrdData = function (callback) {
    const result = [];
    result.push(['Channel', 'Source', 'Transaction Date', 'Sale Date', 'Date From', 'Date To', 'Territory', 'Sub Source', 'Work Title', 'Release Title', 'Release Artist',
      'Party 1', 'Party 2', 'Party 3', 'Party 4', 'Description', 'Configuration', 'Identifier', 'ISAN', 'AV Work Type', 'Episode', 'ISWC', 'ISRC', 'Barcode', 'Cat No',
      'Song Code', 'Duration', 'Units', 'Share Percentage', 'Gross Amount', 'Net Amount', 'Original Currency', 'Positive/Negative', 'Sales Type', 'Territory Name',
      'Source Collecting Society', 'Source Type', 'Source Description', 'Production / Catalogue Number', 'Adjustment Reason', 'Composers', 'Party 5', 'Withholding At Source']);

    crd.data.rows.forEach((row) => {
      let distributionChannel; let dateFrom; let dateTo; let description; let units; let grossAmount; let
        netAmount;

      if (row.recordType === 'MCH' || row.recordType === 'PRF' || row.recordType === 'AVI') {
        dateFrom = extractDateFromCombined(row.periodOfAccount, 0); // first part of YYYYMMYYYYMM
        dateTo = extractDateFromCombined(row.periodOfAccount, 1); // second part of YYYYMMYYYYMM
        grossAmount = addDecimalPoint(row.shareAmountGross, crd.data.hdr.decimalPlacesAmountField);
        netAmount = addDecimalPoint(row.shareAmountNet, crd.data.hdr.decimalPlacesAmountField);
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
        grossAmount = addDecimalPoint(row.netAdjustmentValue, crd.data.hdr.decimalPlacesAmountField);
        netAmount = grossAmount;
      }

      const data = [
        distributionChannel, // Channel
        crd.data.hdr.nameOfRemittingSociety || '', // Source
        formatDate(crd.data.hdr.transmissionDate, 'YYYY-MM-DD') || '', // Transaction Date
        dateTo || '', // Sale Date
        dateFrom || '', // Date From
        dateTo || '', // Date To
        row.codeOfTerritory || '', // Territory
        row.labelBroadcastChannel || row.usageDescription || '', // Sub Source
        row.originalTitle || row.originalTitleOfTheAVWork || row.workTitle || '', // Work Title
        row.titleOfSoundCarrier || '', // Release Title
        row.artistName || '', // Release Artist
        row.IP1 || '', // Party 1
        row.IP2 || '', // Party 2
        row.IP3 || '', // Party 3
        row.IP4 || '', // Party 4
        description || '', // Description
        row.configuration || '', // Configuration
        row.workCode || row.workNo || '', // Identifier
        row.isan || '', // ISAN
        row.audioVisualWorkType || '', // AV Work Type
        row.originalTitleOfTheEpisode || '', // Episode
        row.iswc || '', // ISWC
        row.isrc || '', // ISRC
        (Number(row.EANUPCBarCode) !== 0) ? row.EANUPCBarCode || '' : '', // Barcode
        row.catalogueNumber || '', // Cat No
        row.songCodeOfPublisher || '', // Song Code
        Number(row.durationOfWorkOrCue) || Number(row.durationOfWork) || null, // Duration
        units || null, // Units
        Number(row.sharePercentage || row.newSharePercentage) / 100000 || null, // Share Percentage
        grossAmount || null, // Gross Amount
        netAmount || null, // Net Amount
        crd.data.hdr.currency || '', // Original Currency
        row.signIndicator || '', // Positive/Negative
        row.salesType || '', // Sales Type
        row.territoryName || '', // Territory Name
        row.sourceCollectingSocietyForeignIncome || '', // Source Collecting Society
        row.sourceType || '', // Source Type
        row.sourceDescription || '', // Source Description
        row.productionCatalogueNo || '', // Production
        row.adjustmentReason || '', // Adjustment Reason
        '', // Composers
        '', // Party 5
        '', // Withholding At Source
      ];
      result.push(data);
    });
    callback(null, result);
  };
};

const extractDateFromCombined = (combinedDate, position) => {
  if (combinedDate && typeof combinedDate === 'string') {
    const startPos = 6 * position;
    const year = combinedDate.substr(startPos, 4);
    const month = combinedDate.substr(startPos + 4, 2);
    const date = `01/${month}/${year}`;
    return (date.length === 10) ? date : '';
  }
  return '';
};

const FieldExtractor = function (string) {
  const extractor = this;
  this.substrStart = 0;
  this.extractString = function (chars) {
    const extracted = string.substr(extractor.substrStart, chars);
    extractor.substrStart += chars;
    return extracted.trim();
  };
};

module.exports = v4ReaderObject;
