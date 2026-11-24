const LineByLineReader = require('line-by-line');
const _ = require('lodash');

const logger = require('../logger');
const { addDecimalPoint, formatDate } = require('./utils');

const v2ReaderObject = function () {
  const crd = this;
  crd.crdData = {
    MWN: {},
  };

  this.readCrdFile = function (file, encoding, callback) {
    crd.workDistIdx = 0; // MK check
    try {
      const options = encoding ? { encoding } : {};
      const lineByLineReader = new LineByLineReader(file, options);
      lineByLineReader
        .on('line', (line) => {
          crd.transactionSequence = line.substr(3, 8).trim();
          crd.recordSequence = line.substr(11, 8).trim();
          const lineType = line.substr(0, 3);

          /* if (lineType === 'GRH') {
            console.log("group header:", line.substr(3,3));
          } */

          // ---- SDN START ----
          if (lineType === 'SDN') crd.readSdnLine(line);
          // else if (lineType === 'CCR') SDN / CCR -- unused
          // else if (lineType === 'TDI') SDN / TDI -- unused
          else if (lineType === 'ESI') crd.readEsiLine(line);
          else if (lineType === 'IPI') crd.readIpiLine(line);
          else if (lineType === 'API') crd.readApiLine(line);
          else if (lineType === 'RPI') crd.readRpiLine(line);
          // ---- SDN END ----

          // ---- MWN START ----
          else if (lineType === 'MWN') crd.readMwnLine(line);
          else if (lineType === 'OIP') crd.readOipLine(line);
          else if (lineType === 'MDS') crd.readMdsLine(line);
          else if (lineType === 'MDR') crd.readMdrLine(line);
          else if (lineType === 'MDT') crd.readMdtLine(line);
          else if (lineType === 'MIP') crd.readMipLine(line);
          else if (lineType === 'WEP') crd.readWepLine(line);
          else if (lineType === 'WEA') crd.readWeaLine(line);
          else if (lineType === 'WER') crd.readWerLine(line);
          // else if (lineType === 'WBI') MWN / WBI -- unused
          // else if (lineType === 'WUI') MWN / WUI -- unused
          // else if (lineType === 'ICC') MWN / ICC -- unused
          else if (lineType === 'ADJ') crd.readAdjLine(line);
          // ---- MWN END ----

          // else if (lineType === 'SIN') SIN -- unused
          // else if (lineType === 'AHP') AHP -- unused
          // else if (lineType === 'RGT') RGT -- unused
          // else if (lineType === 'ACK') ACK -- unused
        })
        .on('end', () => {
          if (!_.isEmpty(crd?.crdData)) {
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
  this.readSdnLine = function (line) {
    // SDN
    crd.amountDecimalPlaces = line.substr(112, 1).trim();
    crd.percentageDecimalPlaces = line.substr(113, 1).trim();
    crd.remittanceCurrency = line.substr(119, 3).trim();
    crd.crdData.SDN = {
      sequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      remittingSocietyDistributionIdentifier: line.substr(19, 10).trim(),
      typeOfRightCategory: line.substr(29, 3).trim(),
      accountingPeriodStart: line.substr(32, 8).trim(),
      accountingPeriodEnd: line.substr(40, 8).trim(),
      recipientSocietyPublisherCode: line.substr(48, 11).trim(),
      nameOfRecipient: line.substr(59, 45).trim(),
      bankPaymentDate: line.substr(104, 8).trim(),
      amountDecimalPlaces: crd.amountDecimalPlaces,
      percentageDecimalPlaces: crd.percentageDecimalPlaces,
      versionNumber: line.substr(114, 5).trim(),
      remittanceCurrency: crd.remittanceCurrency,
    };
  };
  this.readEsiLine = function (line) {
    // SDN / ESI
    if (!crd.crdData.SDN.ESI) crd.crdData.SDN.ESI = {};
    const exploitationSourceIdentifier = line.substr(19, 20).trim();
    crd.crdData.SDN.ESI[exploitationSourceIdentifier] = {
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      exploitationSourceIdentifier,
      exploitationSourceName: line.substr(39, 30).trim(),
      exploitationSourceType: line.substr(69, 2).trim(),
      exploitationTerritoryCode: line.substr(71, 14).trim(),
      exploitationTerritoryCodeValidFromDate: line.substr(175, 8).trim(),
      exploitationTerritoryAbbreviatedName: line.substr(83, 20).trim(),
      exploitationTerritoryAbbreviatedNameValidFromDate: line.substr(103, 8).trim(),
    };
  };
  this.readIpiLine = function (line) {
    // SDN / IPI
    if (!crd.crdData.SDN.IPI) crd.crdData.SDN.IPI = {};
    const interestedPartyNumber = line.substr(19, 11).trim();
    crd.crdData.SDN.IPI[interestedPartyNumber] = {
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      interestedPartyNumber,
      genericTypeOfIp: line.substr(30, 1).trim(),
      ipNameNumber: line.substr(31, 11).trim(),
      ipName: line.substr(42, 90).trim(),
      ipFirstName: line.substr(132, 45).trim(),
    };
  };
  this.readApiLine = function (line) {
    // SDN / API
    if (!crd.crdData.SDN.API) crd.crdData.SDN.API = {};
    const societyAvWorkIdentifier = line.substr(19, 15).trim();
    crd.crdData.SDN.API[societyAvWorkIdentifier] = {
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      societyAvWorkIdentifier,
      avIndexNumber: line.substr(50, 15).trim(),
      type: line.substr(65, 3).trim(),
      avWorkCategory: line.substr(68, 1).trim(),
      avWorkTitle: line.substr(69, 60).trim(),
      localAvWorkTitle: line.substr(129, 60).trim(),
      originalEpisodeTitle: line.substr(189, 60).trim(),
      localEpisodeTitle: line.substr(249, 60).trim(),
      originalEpisodeNumber: line.substr(309, 20).trim(),
      localEpisodeNumber: line.substr(329, 15).trim(),
      producerName: line.substr(344, 45).trim(),
      directorName: line.substr(389, 45).trim(),
      actorName: line.substr(434, 45).trim(),
      totalDuration: line.substr(479, 6).trim(),
      musicDuration: line.substr(485, 6).trim(),
      protectedMusicDuration: line.substr(491, 6).trim(),
      countryOfOriginTerritoryCode: line.substr(497, 4).trim(),
      countryOfOriginTerritoryCodeValidFromDate: line.substr(501, 8).trim(),
      countryOfOriginTerritoryAbbreviatedName: line.substr(509, 20).trim(),
      countryOfOriginTerritoryAbbreviatedNameValidFromDate: line.substr(529, 8).trim(),
      yearOfProduction: line.substr(537, 4).trim(),
      isanIdentifier: line.substr(541, 26).trim(),
    };
  };
  this.readRpiLine = function (line) {
    // SDN / RPI
    if (!crd.crdData.SDN.RPI) crd.crdData.SDN.RPI = {};
    const recordedProductIdentifier = line.substr(19, 20).trim();
    crd.crdData.SDN.RPI[recordedProductIdentifier] = {
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      recordedProductIdentifier,
      eanUpcCode: line.substr(39, 13).trim(),
      productCatalogueNumber: line.substr(52, 18).trim(),
      soundCarrierType: line.substr(70, 3).trim(),
      soundCarrierTitle: line.substr(73, 60).trim(),
      soundCarrierCountryOfOriginTerritoryCode: line.substr(133, 4).trim(),
      soundCarrierCountryOfOriginTerritoryCodeValidFromDate: line.substr(137, 8).trim(),
      soundCarrierCountryOfOriginTerritoryAbbreviatedName: line.substr(145, 20).trim(),
      soundCarrierCountryOfOriginTerritoryAbbreviatedNameValidFromDate: line.substr(165, 8).trim(),
      productTracks: line.substr(213, 6).trim(),
      packQuantity: line.substr(219, 6).trim(),
      itemTracks: line.substr(225, 6).trim(),
      trackProrateBasis: line.substr(231, 1).trim(),
      productTotalDuration: line.substr(232, 6).trim(),
      productMusicDuration: line.substr(238, 6).trim(),
      releaseDate: line.substr(244, 8).trim(),
    };
  };
  this.readMwnLine = function (line) {
    // MWN
    crd.crdData.MWN[crd.transactionSequence] = {
      sequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      societyWorkIdentifier: line.substr(19, 14).trim(),
      originalWorkTitle: line.substr(33, 60).trim(),
      localWorkTitle: line.substr(93, 60).trim(),
      iswc: line.substr(153, 11).trim(),
      compositeWorkIndicator: line.substr(164, 1).trim(),
      compositeWorkIdentifier: line.substr(165, 14).trim(),
      compositeWorkTitle: line.substr(179, 60).trim(),
      workPercentageOfComposite: line.substr(239, 8).trim(),
      instrumentalOrVocalUse: line.substr(247, 1).trim(),
      musicalWorkDistributionCategoryGenre: line.substr(248, 3).trim(),
      opusNumber: line.substr(251, 25).trim(),
      songCodeOfPublisher: line.substr(276, 14).trim(),
      workDist: [],
    };
    crd.workDistIdx = 0;
  };
  this.readOipLine = function (line) {
    // MWN / OIP
    if (!crd.crdData.MWN[crd.transactionSequence].OIP) crd.crdData.MWN[crd.transactionSequence].OIP = [];
    crd.crdData.MWN[crd.transactionSequence].OIP.push({
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      otherIpName: line.substr(19, 90).trim(),
      otherIpFirstName: line.substr(109, 45).trim(),
      otherIpDescription: line.substr(154, 45).trim(),
    });
  };
  this.readMdsLine = function (line) {
    // MWN / MDS
    crd.workDistIdx = crd.crdData.MWN[crd.transactionSequence].workDist.push({}) - 1; // start next distribution
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDS = {
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      mdsIdentifier: line.substr(19, 3).trim(),
      typeOfShareStructure: line.substr(22, 1).trim(),
      paymentRuleIndicator: line.substr(23, 1).trim(),
      workStatusStartDate: line.substr(24, 8).trim(),
      workStatusEndDate: line.substr(32, 8).trim(),
    };
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].royalties = {};
  };
  this.readMdrLine = function (line) {
    // MWN / MDR
    if (!crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDR) crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDR = [];
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDR.push({
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      rightCode: line.substr(19, 2).trim(),
      typeOfRightCategory: line.substr(21, 3).trim(),
    });
  };
  this.readMdtLine = function (line) {
    // MWN / MDT
    if (!crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDT) crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDT = [];
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MDT.push({
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      interestTerritoryTisn: line.substr(19, 4).trim(),
      interestTerritoryTisnValidFromDate: line.substr(23, 8).trim(),
      interestTerritoryTisan: line.substr(31, 20).trim(),
      interestTerritoryTisanValidFromDate: line.substr(51, 8).trim(),
      includeExclude: line.substr(59, 1).trim(),
    });
  };
  this.readMipLine = function (line) {
    // MWN / MIP
    if (!crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MIP) crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MIP = [];
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].MIP.push({
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      interestedPartyNumber: line.substr(19, 11).trim(),
      ipSociety: line.substr(30, 3).trim(),
      ipRole: line.substr(33, 2).trim(),
      shareNumerator: line.substr(35, 5).trim(),
      shareDenominator: line.substr(40, 5).trim(),
      sharePercentage: line.substr(45, 8).trim(),
      nationalAgreementNumber: line.substr(53, 14).trim(),
      nationalAdministratorNumber: line.substr(67, 11).trim(),
      contractIndicator: line.substr(78, 1).trim(),
    });
  };
  this.readWepLine = function (line) {
    // MWN / WEP
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].royalties[crd.recordSequence] = {
      type: 'WEP',
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      referenceIdentifier: line.substr(19, 15).trim(),
      distributionCategoryType: line.substr(34, 2).trim(),
      exploitationSourceIdentifier: line.substr(36, 20).trim(),
      quantity: line.substr(56, 8).trim(),
      aggregationPeriodType: line.substr(64, 1).trim(),
      exploitationDate: line.substr(65, 8).trim(),
      exploitationTime: line.substr(73, 4).trim(),
      isrc: line.substr(77, 12).trim(),
      performingArtistLastName: line.substr(89, 45).trim(),
      performingArtistFirstName: line.substr(134, 30).trim(),
      surveyType: line.substr(164, 1).trim(),
      dayOfWeekCode: line.substr(165, 1).trim(),
      basisOfRateCalculation: line.substr(166, 1).trim(),
      minuteSecondPointValue: line.substr(167, 10).trim(),
      bonusLevelPerformanceIndicator: line.substr(177, 2).trim(),
      nationalGroupingIdentifier: line.substr(179, 11).trim(),
      currency: line.substr(190, 3).trim(),
      grossRoyaltyAmount: line.substr(193, 12).trim(),
      taxRate: line.substr(205, 8).trim(),
      taxAmount: line.substr(213, 12).trim(),
      commissionAmount: line.substr(225, 12).trim(),
      sourceSociety: line.substr(237, 3).trim(),
      sourceSocietyTaxAmount: line.substr(240, 12).trim(),
      sourceSocietyCommissionAmount: line.substr(252, 12).trim(),
      remittedRoyaltyAmount: line.substr(264, 12).trim(),
    };
  };
  this.readWeaLine = function (line) {
    // MWN / WEA
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].royalties[crd.recordSequence] = {
      type: 'WEA',
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      referenceIdentifier: line.substr(19, 15).trim(),
      distributionCategoryType: line.substr(34, 2).trim(),
      exploitationSourceIdentifier: line.substr(36, 20).trim(),
      quantity: line.substr(56, 8).trim(),
      aggregationPeriodType: line.substr(64, 1).trim(),
      exploitationDate: line.substr(65, 8).trim(),
      exploitationTime: line.substr(73, 4).trim(),
      societyAvWorkIdentifier: line.substr(77, 15).trim(),
      dayOfWeekCode: line.substr(92, 1).trim(),
      origin: line.substr(93, 1).trim(),
      cueSequence: line.substr(94, 3).trim(),
      duration: line.substr(97, 6).trim(),
      productCatalogueNumber: line.substr(103, 18).trim(),
      surveyType: line.substr(121, 1).trim(),
      basisOfRateCalculation: line.substr(122, 1).trim(),
      nationalGroupingIdentifier: line.substr(123, 11).trim(),
      currency: line.substr(134, 3).trim(),
      grossRoyaltyAmount: line.substr(137, 12).trim(),
      taxRate: line.substr(149, 8).trim(),
      taxAmount: line.substr(157, 12).trim(),
      commissionAmount: line.substr(169, 12).trim(),
      sourceSociety: line.substr(181, 3).trim(),
      sourceSocietyTaxAmount: line.substr(184, 12).trim(),
      sourceSocietyCommissionAmount: line.substr(196, 12).trim(),
      remittedRoyaltyAmount: line.substr(208, 12).trim(),
    };
  };
  this.readWerLine = function (line) {
    // MWN / WER
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].royalties[crd.recordSequence] = {
      type: 'WER',
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      referenceIdentifier: line.substr(19, 15).trim(),
      distributionCategoryType: line.substr(34, 2).trim(),
      exploitationSourceIdentifier: line.substr(36, 20).trim(),
      quantity: line.substr(56, 8).trim(),
      recordedProductNumber: line.substr(64, 20).trim(),
      isrc: line.substr(84, 12).trim(),
      countryOfLicensingTerritoryCode: line.substr(96, 4).trim(),
      countryOfLicensingTerritoryCodeValidFromDate: line.substr(100, 8).trim(),
      countryOfLicensingTerritoryAbbreviatedName: line.substr(108, 20).trim(),
      countryOfLicensingTerritoryAbbreviatedNameValidFromDate: line.substr(128, 8).trim(),
      basePriceType: line.substr(136, 1).trim(),
      saleType: line.substr(137, 3).trim(),
      salesPeriodStart: line.substr(140, 8).trim(),
      salesPeriodEnd: line.substr(148, 8).trim(),
      royaltyBasisPrice: line.substr(156, 12).trim(),
      trackCountryOfOriginTerritoryCode: line.substr(168, 4).trim(),
      trackCountryOfOriginTerritoryCodeValidFromDate: line.substr(172, 8).trim(),
      trackCountryOfOriginTerritoryAbbreviatedName: line.substr(180, 20).trim(),
      trackCountryOfOriginTerritoryAbbreviated: line.substr(200, 8).trim(),
      duration: line.substr(208, 6).trim(),
      trackSharePercentage: line.substr(214, 8).trim(),
      commissionRate: line.substr(222, 8).trim(),
      nationalGroupingIdentifier: line.substr(230, 11).trim(),
      currency: line.substr(241, 3).trim(),
      grossRoyaltyAmount: line.substr(244, 12).trim(),
      taxRate: line.substr(256, 8).trim(),
      taxAmount: line.substr(264, 12).trim(),
      commissionAmount: line.substr(276, 12).trim(),
      sourceSociety: line.substr(288, 3).trim(),
      sourceSocietyTaxAmount: line.substr(291, 12).trim(),
      sourceSocietyCommissionAmount: line.substr(303, 12).trim(),
      remittedRoyaltyAmount: line.substr(315, 12).trim(),
      aggregationPeriodType: line.substr(327, 1).trim(),
    };
  };
  this.readAdjLine = function (line) {
    // MWN / ADJ
    if (!crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].ADJ) crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].ADJ = [];
    crd.crdData.MWN[crd.transactionSequence].workDist[crd.workDistIdx].ADJ.push({
      transactionSequence: crd.transactionSequence,
      recordSequence: crd.recordSequence,
      referenceIdentifier: line.substr(19, 15).trim(),
      originalReferenceIdentifier: line.substr(34, 15).trim(),
      originalDistributionIdentifier: line.substr(49, 10).trim(),
      originalInterestedPartyNumber: line.substr(59, 11).trim(),
      originalIpName: line.substr(70, 90).trim(),
      originalIpFirstName: line.substr(160, 45).trim(),
      incorrectShareNumerator: line.substr(205, 5).trim(),
      incorrectShareDenominator: line.substr(210, 5).trim(),
      incorrectSharePercentage: line.substr(215, 8).trim(),
      correctShareNumerator: line.substr(223, 5).trim(),
      correctShareDenominator: line.substr(228, 5).trim(),
      correctSharePercentage: line.substr(233, 8).trim(),
      adjustmentReasonCode: line.substr(241, 2).trim(),
      adjustmentReasonCommentary: line.substr(243, 80).trim(),
      adjustmentReferenceNumber: line.substr(323, 30).trim(),
      adjustmentAmount: line.substr(353, 12).trim(),
      adjustmentAmountSign: line.substr(365, 1).trim(),
      originalDistributionCategoryType: line.substr(366, 2).trim(),
      originalContainerIdentifier: line.substr(368, 20).trim(),
      adjustmentCurrency: line.substr(388, 3).trim(),
    });
  };
  this.processCrdData = function (callback) {
    const result = [];
    result.push(['Channel', 'Source', 'Transaction Date', 'Sale Date', 'Date From', 'Date To', 'Territory', 'Sub Source', 'Work Title', 'Release Title', 'Release Artist',
      'Party 1', 'Party 2', 'Party 3', 'Party 4', 'Description', 'Configuration', 'Identifier', 'ISAN', 'AV Work Type', 'Episode', 'ISWC', 'ISRC', 'Barcode', 'Cat No',
      'Song Code', 'Duration', 'Units', 'Share Percentage', 'Gross Amount', 'Net Amount', 'Original Currency', 'Positive/Negative', 'Sales Type', 'Territory Name',
      'Source Collecting Society', 'Source Type', 'Source Description', 'Production / Catalogue Number', 'Adjustment Reason', 'Composers', 'Party 5', 'Withholding At Source']);
    Object.values(crd.crdData.MWN).forEach((MWN) => {
      MWN.workDist.forEach((workDist) => {
        const accountingPeriodEnd = formatDate(crd.crdData.SDN.accountingPeriodEnd, 'YYYYMMDD');
        const bankPaymentDate = formatDate(crd.crdData.SDN.bankPaymentDate, 'YYYYMMDD');
        const transactionDate = bankPaymentDate || accountingPeriodEnd || '';
        // build string containing all composers as well as separate IP names array
        let composerString = '';
        const channel = getChannel(workDist.MDR, crd.crdData?.SDN?.typeOfRightCategory);
        const ipArray = [];
        Object.values(workDist.MIP).forEach((MIP) => {
          const { ipName } = crd.crdData.SDN.IPI[MIP.interestedPartyNumber];
          const ipType = crd.crdData.SDN.IPI[MIP.interestedPartyNumber].genericTypeOfIp;
          ipArray.push(ipName);
          if (ipType === 'C') {
            composerString += (composerString === '') ? ipName : `,${ipName}`;
          }
        });

        Object.values(workDist.royalties).forEach((royalty) => {
          const ESI = crd.crdData.SDN.ESI[royalty.exploitationSourceIdentifier];
          const grossAmount = addDecimalPoint(royalty.grossRoyaltyAmount, crd.amountDecimalPlaces);
          const withholdingAtSource = addDecimalPoint(royalty.taxAmount, crd.amountDecimalPlaces);
          const commission = addDecimalPoint(royalty.commissionAmount, crd.amountDecimalPlaces);

          // default netAmount to remittedRoyaltyAmount
          const netAmount = royalty.remittedRoyaltyAmount
            ? addDecimalPoint(royalty.remittedRoyaltyAmount, crd.amountDecimalPlaces)
            : (grossAmount - withholdingAtSource - commission).toFixed(crd.amountDecimalPlaces);

          let description = '';
          let barcode = '';
          let catNo = '';
          // build description string for AV royalty
          if (royalty.type === 'WEA') {
            const API = crd.crdData.SDN.API[royalty.societyAvWorkIdentifier];
            description += API.avWorkTitle ? API.avWorkTitle : '';
            if (API.originalEpisodeNumber) {
              description += (description !== '') ? ' - ' : '';
              description += `Episode ${API.originalEpisodeNumber}`;
            }
            if (API.originalEpisodeTitle) {
              description += (description !== '') ? ' - ' : '';
              description += API.originalEpisodeTitle;
            }
          }
          // extract barcode and catalogue number for recording royalty
          if (royalty.type === 'WER') {
            // Important to note that recordedProductNumber may not always be present on the file
            const RPI = crd.crdData.SDN.RPI?.[royalty.recordedProductNumber];
            barcode = RPI?.eanUpcCode;
            catNo = RPI?.productCatalogueNumber;
          }

          const data = [
            channel, // Channel
            '', // Source
            transactionDate, // Transaction Date
            formatDate(royalty.exploitationDate || royalty.salesPeriodStart, 'YYYYMMDD') || '', // Sale Date
            formatDate(workDist.MDS.workStatusStartDate, 'YYYYMMDD') || '', // Date From
            formatDate(workDist.MDS.workStatusEndDate, 'YYYYMMDD') || '', // Date To
            ESI.exploitationTerritoryAbbreviatedName || '', // Territory
            ESI.exploitationSourceName || '', // Sub Source
            MWN.originalWorkTitle || '', // Work Title
            '', // Release Title
            '', // Release Artist
            ipArray[0] ? ipArray[0] : '', // Party 1
            ipArray[1] ? ipArray[1] : '', // Party 2
            ipArray[2] ? ipArray[2] : '', // Party 3
            ipArray[3] ? ipArray[3] : '', // Party 4
            description, // Description
            mapDistributionCategory(royalty.distributionCategoryType), // Configuration
            MWN.societyWorkIdentifier || '', // Identifier
            '', // ISAN
            '', // AV Work Type
            '', // Episode
            MWN.iswc || '', // ISWC
            royalty.isrc || '', // ISRC
            barcode, // Barcode
            catNo, // Cat No
            royalty.societyAvWorkIdentifier || royalty.recordedProductNumber || '', // Song Code
            '', // Duration
            Number(royalty.quantity), // Units
            '', // Share Percentage
            grossAmount, // Gross Amount
            netAmount, // Net Amount
            crd.remittanceCurrency, // Original Currency
            '', // Positive/Negative
            '', // Sales Type
            '', // Territory Name
            '', // Source Collecting Society
            '', // Source Type
            '', // Source Description
            '', // Production / Catalogue Number
            '', // Adjustment Reason
            composerString, // Composers
            ipArray[4] ? ipArray[4] : '', // Party 5
            withholdingAtSource, // Withholding At Source
          ];
          result.push(data);
        });

        // add Adjustments if any present for work
        if (workDist.ADJ) {
          const territory = (workDist.MDT && workDist.MDT[0] && workDist.MDT[0].interestTerritoryTisan) ? workDist.MDT[0].interestTerritoryTisan : '';
          workDist.ADJ.forEach((ADJ) => {
            const netAmount = addDecimalPoint(ADJ.adjustmentAmount, crd.amountDecimalPlaces);
            const positiveNegative = (ADJ.adjustmentAmountSign === '-') ? 'Negative' : 'Positive';
            const adjustmentReason = `${ADJ.adjustmentReasonCode} ${ADJ.adjustmentReasonCommentary}`;
            const configuration = mapDistributionCategory(ADJ.originalDistributionCategoryType);
            const data = [
              channel, // Channel
              '', // Source
              transactionDate, // Transaction Date
              '', // Sale Date
              formatDate(workDist.MDS.workStatusStartDate, 'YYYYMMDD') || '', // Date From
              formatDate(workDist.MDS.workStatusEndDate, 'YYYYMMDD') || '', // Date To
              territory, // Territory
              '', // Sub Source
              MWN.originalWorkTitle || '', // Work Title
              '', // Release Title
              '', // Release Artist
              ipArray[0] ? ipArray[0] : '', // Party 1
              ipArray[1] ? ipArray[1] : '', // Party 2
              ipArray[2] ? ipArray[2] : '', // Party 3
              ipArray[3] ? ipArray[3] : '', // Party 4
              adjustmentReason, // Description
              configuration || '', // Configuration
              MWN.societyWorkIdentifier || '', // Identifier
              '', // ISAN
              '', // AV Work Type
              '', // Episode
              MWN.iswc || '', // ISWC
              '', // ISRC
              '', // Barcode
              '', // Cat No
              '', // Song Code
              '', // Duration
              '', // Units
              '', // Share Percentage
              '', // Gross Amount
              netAmount, // Net Amount
              crd.remittanceCurrency, // Original Currency
              positiveNegative, // Positive/Negative
              '', // Sales Type
              '', // Territory Name
              '', // Source Collecting Society
              '', // Source Type
              '', // Source Description
              '', // Production / Catalogue Number
              '', // Adjustment Reason
              composerString, // Composers
              ipArray[4] ? ipArray[4] : '', // Party 5
              '', // Withholding At Source
            ];
            result.push(data);
          });
        }
      });
    });
    callback(null, result);
  };
};

const mapDistributionCategory = (code) => {
  const distributionCategory = {
    10: 'Audio carriers',
    11: 'Audio-visual carriers',
    12: 'Synchronization rights',
    13: 'Audio carriers , work-by-work',
    14: 'Audio-visual carriers, work-by-work',
    20: 'Radio',
    21: 'Television',
    22: 'Satellite radio',
    30: 'Private copying',
    31: 'Rental and lending',
    40: 'Download – musical works',
    41: 'Download – audiovisual works',
    42: 'Download – ringtones',
    43: 'Download – other',
    44: 'Internet radio',
    45: 'Streaming – not on-demand',
    46: 'Streaming – on-demand',
    47: 'Internet television',
    50: 'Live performances',
    60: 'Discotheques',
    70: 'Music by electronic or mechanical means',
    71: 'Karaoke',
    80: 'Cinema',
    90: 'Other royalties',
  };
  return distributionCategory[Number(code)];
};
const getChannel = (MDRLines, SDNChannel) => {
  const sdnChannelCode = SDNChannel || '';
  if (MDRLines?.[0]?.typeOfRightCategory) {
    const mdrChannelCode = MDRLines[0].typeOfRightCategory;
    const mdrChannel = getChannelFromChannelCode(mdrChannelCode);
    if (mdrChannel) {
      return mdrChannel;
    }
  }
  return getChannelFromChannelCode(sdnChannelCode);
};
const getChannelFromChannelCode = (channelCode) => {
  if (channelCode === 'PER') {
    return 'Performance';
  } if (channelCode === 'MEC') {
    return 'Mechanical';
  } if (channelCode === 'SYN') {
    return 'Sync';
  }
  return channelCode;
};

module.exports = v2ReaderObject;
