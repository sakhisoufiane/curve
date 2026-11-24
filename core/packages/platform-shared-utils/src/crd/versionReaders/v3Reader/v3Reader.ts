import { open } from 'node:fs/promises';
import logger from '../../../logger';
import { CRD_FILE_HEADER } from '../constants';
import { type CrdData3, type WorkDistRecord3 } from '../types/crdV3Types';
import { type ChannelCode } from '../types/sharedTypes';
import {
  addDecimalPoint,
  formatDate,
  getChannel,
  getMwnEntry,
  getWorkDistItem,
  mapDistributionCategory,
  readField
} from '../utils';

export class V3Reader {
  private crdData: CrdData3;

  private workDistIdx: number;

  public transactionSequence: string;

  public recordSequence: string;

  private amountDecimalPlaces: number;

  private percentageDecimalPlaces?: string;

  private remittanceCurrency?: string;

  constructor() {
    this.crdData = {
      MWN: {},
      SDN: {},
    };
    this.workDistIdx = 0;
    this.transactionSequence = '';
    this.recordSequence = '';
    this.amountDecimalPlaces = 0;
  }

  async readCrdFile(filePath: string, encoding: BufferEncoding): Promise<string[][]> {
    try {
      const file = await open(filePath).catch((err) => {
        if (err.code === 'ENOENT') {
          throw new Error('File does not exist');
        }
        throw err;
      });
      const options = encoding ? { encoding } : {};

      for await (const line of file.readLines(options)) {
        this.transactionSequence = line.slice(3, 3 + 8).trim();
        this.recordSequence = line.slice(11, 11 + 8).trim();
        const lineType = line.slice(0, 3);

        if (lineType === 'HDR') this.readHdrLine(line);
        // ---- SDN START ----
        else if (lineType === 'SDN') this.readSdnLine(line);
        else if (lineType === 'ESI') this.readEsiLine(line);
        else if (lineType === 'IPI') this.readIpiLine(line);
        else if (lineType === 'API') this.readApiLine(line);
        else if (lineType === 'RPI') this.readRpiLine(line);
        // ---- SDN END ----
        // ---- MWN START ----
        else if (lineType === 'MWN') this.readMwnLine(line);
        else if (lineType === 'OIP') this.readOipLine(line);
        else if (lineType === 'MDS') this.readMdsLine(line);
        else if (lineType === 'MDR') this.readMdrLine(line);
        else if (lineType === 'MDT') this.readMdtLine(line);
        else if (lineType === 'MIP') this.readMipLine(line);
        else if (lineType === 'WEP') this.readWepLine(line);
        else if (lineType === 'WEA') this.readWeaLine(line);
        else if (lineType === 'WER') this.readWerLine(line);
        else if (lineType === 'ADJ') this.readAdjLine(line);
        // ---- MWN END ----
      }
      if (!this.crdData.HDR || !this.crdData.SDN) {
        throw new Error('There was an error reading the CRD file. Data does not look like CRD Data');
      }
      const result = this.processCrdData();
      return result;
    } catch (err) {
      logger.error(err);
      if (
        err instanceof Error &&
        ['File does not exist', 'There was an error reading the CRD file. Data does not look like CRD Data'].includes(
          err.message
        )
      ) {
        throw err;
      } else {
        throw new Error('There was an error reading the CRD file. Check file is valid.');
      }
    }
  }

  readHdrLine(line: string) {
    this.crdData.HDR = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      senderType: readField({ line, start: 3, length: 2 }),
      senderId: readField({ line, start: 5, length: 9 }),
      senderName: readField({ line, start: 14, length: 45 }),
      standardVersionNumber: readField({ line, start: 59, length: 5 }),
      creationDate: readField({ line, start: 64, length: 8 }),
      creationTime: readField({ line, start: 72, length: 6 }),
      transmissionDate: readField({ line, start: 78, length: 8 }),
      characterSet: readField({ line, start: 86, length: 15 }),
      originalFile: readField({ line, start: 101, length: 27 }),
      senderIpNameNumber: readField({ line, start: 128, length: 11 }),
    };
  }

  readSdnLine(line: string) {
    // SDN
    this.amountDecimalPlaces = Number(readField({ line, start: 112, length: 1 }));
    this.percentageDecimalPlaces = readField({ line, start: 113, length: 1 });
    this.remittanceCurrency = readField({ line, start: 119, length: 3 });
    this.crdData.SDN = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      remittingSocietyDistributionIdentifier: readField({ line, start: 19, length: 10 }),
      typeOfRightCategory: readField({ line, start: 29, length: 3 }),
      accountingPeriodStart: readField({ line, start: 32, length: 8 }),
      accountingPeriodEnd: readField({ line, start: 40, length: 8 }),
      recipientSocietyPublisherCode: readField({ line, start: 48, length: 11 }),
      nameOfRecipient: readField({ line, start: 59, length: 45 }),
      bankPaymentDate: readField({ line, start: 104, length: 8 }),
      amountDecimalPlaces: this.amountDecimalPlaces,
      percentageDecimalPlaces: this.percentageDecimalPlaces,
      versionNumber: readField({ line, start: 114, length: 5 }),
      remittanceCurrency: this.remittanceCurrency,
    };
  }

  readEsiLine(line: string) {
    // SDN / ESI
    if (!this.crdData.SDN.ESI) this.crdData.SDN.ESI = {};
    const exploitationSourceIdentifier = readField({ line, start: 19, length: 20 });
    this.crdData.SDN.ESI[exploitationSourceIdentifier] = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      exploitationSourceIdentifier,
      exploitationSourceName: readField({ line, start: 39, length: 30 }),
      exploitationSourceType: readField({ line, start: 69, length: 2 }),
      exploitationTerritoryCode: readField({ line, start: 71, length: 4 }),
      exploitationTerritoryCodeValidFromDate: readField({ line, start: 75, length: 8 }),
      exploitationTerritoryAbbreviatedName: readField({ line, start: 83, length: 20 }),
      exploitationTerritoryAbbreviatedNameValidFromDate: readField({ line, start: 103, length: 8 }),
    };
  }

  readIpiLine(line: string) {
    // SDN / IPI
    if (!this.crdData.SDN.IPI) this.crdData.SDN.IPI = {};
    const interestedPartyNumber = readField({ line, start: 19, length: 11 });
    this.crdData.SDN.IPI[interestedPartyNumber] = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      interestedPartyNumber,
      genericTypeOfIp: readField({ line, start: 30, length: 1 }),
      ipNameNumber: readField({ line, start: 31, length: 11 }),
      ipName: readField({ line, start: 42, length: 90 }),
      ipFirstName: readField({ line, start: 132, length: 45 }),
    };
  }

  readApiLine(line: string) {
    // SDN / API
    if (!this.crdData.SDN.API) this.crdData.SDN.API = {};
    const societyAvWorkIdentifier = readField({ line, start: 19, length: 15 });
    this.crdData.SDN.API[societyAvWorkIdentifier] = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      societyAvWorkIdentifier,
      avIndexNumber: readField({ line, start: 50, length: 15 }),
      type: readField({ line, start: 65, length: 3 }),
      avWorkCategory: readField({ line, start: 68, length: 1 }),
      avWorkTitle: readField({ line, start: 69, length: 60 }),
      localAvWorkTitle: readField({ line, start: 129, length: 60 }),
      originalEpisodeTitle: readField({ line, start: 189, length: 60 }),
      localEpisodeTitle: readField({ line, start: 249, length: 60 }),
      originalEpisodeNumber: readField({ line, start: 309, length: 20 }),
      localEpisodeNumber: readField({ line, start: 329, length: 15 }),
      producerName: readField({ line, start: 344, length: 45 }),
      directorName: readField({ line, start: 389, length: 45 }),
      actorName: readField({ line, start: 434, length: 45 }),
      totalDuration: readField({ line, start: 479, length: 6 }),
      musicDuration: readField({ line, start: 485, length: 6 }),
      protectedMusicDuration: readField({ line, start: 491, length: 6 }),
      countryOfOriginTerritoryCode: readField({ line, start: 497, length: 4 }),
      countryOfOriginTerritoryCodeValidFromDate: readField({ line, start: 501, length: 8 }),
      countryOfOriginTerritoryAbbreviatedName: readField({ line, start: 509, length: 20 }),
      countryOfOriginTerritoryAbbreviatedNameValidFromDate: readField({ line, start: 529, length: 8 }),
      yearOfProduction: readField({ line, start: 537, length: 4 }),
      isanIdentifier: readField({ line, start: 541, length: 26 }),
    };
  }

  readRpiLine(line: string) {
    // SDN / RPI
    if (!this.crdData.SDN.RPI) this.crdData.SDN.RPI = {};
    const recordedProductIdentifier = readField({ line, start: 19, length: 20 });
    this.crdData.SDN.RPI[recordedProductIdentifier] = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      recordedProductIdentifier,
      eanUpcCode: readField({ line, start: 39, length: 13 }),
      productCatalogueNumber: readField({ line, start: 52, length: 18 }),
      soundCarrierType: readField({ line, start: 70, length: 3 }),
      soundCarrierTitle: readField({ line, start: 73, length: 60 }),
      soundCarrierCountryOfOriginTerritoryCode: readField({ line, start: 133, length: 4 }),
      soundCarrierCountryOfOriginTerritoryCodeValidFromDate: readField({ line, start: 137, length: 8 }),
      soundCarrierCountryOfOriginTerritoryAbbreviatedName: readField({ line, start: 145, length: 20 }),
      soundCarrierCountryOfOriginTerritoryAbbreviatedNameValidFromDate: readField({ line, start: 165, length: 8 }),
      productTracks: readField({ line, start: 213, length: 6 }),
      packQuantity: readField({ line, start: 219, length: 6 }),
      itemTracks: readField({ line, start: 225, length: 6 }),
      trackProrateBasis: readField({ line, start: 231, length: 1 }),
      productTotalDuration: readField({ line, start: 232, length: 6 }),
      productMusicDuration: readField({ line, start: 238, length: 6 }),
      releaseDate: readField({ line, start: 244, length: 8 }),
      soundCarrierArtist: readField({ line, start: 252, length: 80 }),
    };
  }

  readMwnLine(line: string) {
    // MWN
    this.crdData.MWN[this.transactionSequence] = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      societyWorkIdentifier: readField({ line, start: 19, length: 14 }),
      originalWorkTitle: readField({ line, start: 33, length: 60 }),
      localWorkTitle: readField({ line, start: 93, length: 60 }),
      iswc: readField({ line, start: 153, length: 11 }),
      compositeWorkIndicator: readField({ line, start: 164, length: 1 }),
      compositeWorkIdentifier: readField({ line, start: 165, length: 14 }),
      compositeWorkTitle: readField({ line, start: 179, length: 60 }),
      workPercentageOfComposite: readField({ line, start: 239, length: 8 }),
      instrumentalOrVocalUse: readField({ line, start: 247, length: 1 }),
      musicalWorkDistributionCategoryGenre: readField({ line, start: 248, length: 3 }),
      opusNumber: readField({ line, start: 251, length: 25 }),
      songCodeOfPublisher: readField({ line, start: 276, length: 14 }),
      workDist: [],
    };
    this.workDistIdx = 0;
  }

  readOipLine(line: string) {
    // MWN / OIP
    const mwnEntry = getMwnEntry(this.crdData, this.transactionSequence);
    if (!mwnEntry.OIP) {
      mwnEntry.OIP = [];
    }
    mwnEntry.OIP.push({
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      otherIpName: readField({ line, start: 19, length: 90 }),
      otherIpFirstName: readField({ line, start: 109, length: 45 }),
      otherIpDescription: readField({ line, start: 154, length: 45 }),
    });
  }

  readMdsLine(line: string) {
    // MWN / MDS
    const mwnEntry = getMwnEntry(this.crdData, this.transactionSequence);
    if (!mwnEntry.workDist) {
      mwnEntry.workDist = [];
    }
    this.workDistIdx = mwnEntry.workDist.push({}) - 1; // start next distribution
    let workDistItem = mwnEntry.workDist[this.workDistIdx];
    if (!workDistItem) {
      workDistItem = {};
    }
    workDistItem.MDS = {
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      mdsIdentifier: readField({ line, start: 19, length: 3 }),
      typeOfShareStructure: readField({ line, start: 22, length: 1 }),
      paymentRuleIndicator: readField({ line, start: 23, length: 1 }),
      workStatusStartDate: readField({ line, start: 24, length: 8 }),
      workStatusEndDate: readField({ line, start: 32, length: 8 }),
    };
  }

  readMdrLine(line: string) {
    // MWN / MDR
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx);
    if (!workDistItem.MDR) {
      workDistItem.MDR = [];
    }
    workDistItem.MDR.push({
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      rightCode: readField({ line, start: 19, length: 2 }),
      typeOfRightCategory: readField({ line, start: 21, length: 3 }),
    });
  }

  readMdtLine(line: string) {
    // MWN / MDT
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx);
    if (!workDistItem.MDT) {
      workDistItem.MDT = [];
    }
    workDistItem.MDT.push({
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      interestTerritoryTisn: readField({ line, start: 19, length: 4 }),
      interestTerritoryTisnValidFromDate: readField({ line, start: 23, length: 8 }),
      interestTerritoryTisan: readField({ line, start: 31, length: 20 }),
      interestTerritoryTisanValidFromDate: readField({ line, start: 51, length: 8 }),
      includeExclude: readField({ line, start: 59, length: 1 }),
    });
  }

  readMipLine(line: string) {
    // MWN / MIP
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx);
    if (!workDistItem.MIP) {
      workDistItem.MIP = [];
    }
    workDistItem.MIP.push({
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      interestedPartyNumber: readField({ line, start: 19, length: 11 }),
      ipSociety: readField({ line, start: 30, length: 3 }),
      ipRole: readField({ line, start: 33, length: 2 }),
      shareNumerator: readField({ line, start: 35, length: 5 }),
      shareDenominator: readField({ line, start: 40, length: 5 }),
      sharePercentage: readField({ line, start: 45, length: 8 }),
      nationalAgreementNumber: readField({ line, start: 53, length: 14 }),
      nationalAdministratorNumber: readField({ line, start: 67, length: 11 }),
      contractIndicator: readField({ line, start: 78, length: 1 }),
    });
  }

  readWepLine = (line: string) => {
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx);
    if (!workDistItem.royalties) {
      workDistItem.royalties = {};
    }
    workDistItem.royalties[this.recordSequence] = {
      type: 'WEP',
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      referenceIdentifier: readField({ line, start: 19, length: 15 }),
      distributionCategoryType: readField({ line, start: 34, length: 2 }),
      exploitationSourceIdentifier: readField({ line, start: 36, length: 20 }),
      quantity: readField({ line, start: 56, length: 12 }),
      aggregationPeriodType: readField({ line, start: 68, length: 1 }),
      exploitationDate: readField({ line, start: 69, length: 8 }),
      exploitationTime: readField({ line, start: 77, length: 4 }),
      isrc: readField({ line, start: 81, length: 12 }),
      performingArtistLastName: readField({ line, start: 93, length: 45 }),
      performingArtistFirstName: readField({ line, start: 138, length: 30 }),
      surveyType: readField({ line, start: 168, length: 1 }),
      dayOfWeekCode: readField({ line, start: 169, length: 1 }),
      basisOfRateCalculation: readField({ line, start: 170, length: 1 }),
      minuteSecondPointValue: readField({ line, start: 171, length: 10 }),
      bonusLevelPerformanceIndicator: readField({ line, start: 181, length: 2 }),
      nationalGroupingIdentifier: readField({ line, start: 183, length: 11 }),
      currency: readField({ line, start: 194, length: 3 }),
      grossRoyaltyAmount: readField({ line, start: 197, length: 18 }),
      taxRate: readField({ line, start: 215, length: 8 }),
      taxAmount: readField({ line, start: 223, length: 18 }),
      commissionAmount: readField({ line, start: 241, length: 18 }),
      sourceSociety: readField({ line, start: 259, length: 3 }),
      sourceSocietyTaxAmount: readField({ line, start: 262, length: 18 }),
      sourceSocietyCommissionAmount: readField({ line, start: 280, length: 18 }),
      remittedRoyaltyAmount: readField({ line, start: 298, length: 18 }),
      commissionRate: readField({ line, start: 316, length: 8 }),
      MdrSequenceNumber: readField({ line, start: 324, length: 8 }),
      MdtSequenceNumber: readField({ line, start: 332, length: 8 }),
    };
  };

  readWeaLine(line: string) {
    // MWN / WEA
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx);
    if (!workDistItem.royalties) {
      workDistItem.royalties = {};
    }
    workDistItem.royalties[this.recordSequence] = {
      type: 'WEA',
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      referenceIdentifier: readField({ line, start: 19, length: 15 }),
      distributionCategoryType: readField({ line, start: 34, length: 2 }),
      exploitationSourceIdentifier: readField({ line, start: 36, length: 20 }),
      quantity: readField({ line, start: 56, length: 12 }),
      aggregationPeriodType: readField({ line, start: 68, length: 1 }),
      exploitationDate: readField({ line, start: 69, length: 8 }),
      exploitationTime: readField({ line, start: 77, length: 4 }),
      societyAvWorkIdentifier: readField({ line, start: 81, length: 15 }),
      dayOfWeekCode: readField({ line, start: 96, length: 1 }),
      origin: readField({ line, start: 97, length: 1 }),
      cueSequence: readField({ line, start: 98, length: 3 }),
      duration: readField({ line, start: 101, length: 6 }),
      productCatalogueNumber: readField({ line, start: 107, length: 18 }),
      surveyType: readField({ line, start: 125, length: 1 }),
      basisOfRateCalculation: readField({ line, start: 126, length: 1 }),
      nationalGroupingIdentifier: readField({ line, start: 127, length: 11 }),
      currency: readField({ line, start: 138, length: 3 }),
      grossRoyaltyAmount: readField({ line, start: 141, length: 18 }),
      taxRate: readField({ line, start: 159, length: 8 }),
      taxAmount: readField({ line, start: 167, length: 18 }),
      commissionAmount: readField({ line, start: 185, length: 18 }),
      sourceSociety: readField({ line, start: 203, length: 3 }),
      sourceSocietyTaxAmount: readField({ line, start: 206, length: 18 }),
      sourceSocietyCommissionAmount: readField({ line, start: 224, length: 18 }),
      remittedRoyaltyAmount: readField({ line, start: 242, length: 18 }),
      recordedProductNumber: readField({ line, start: 260, length: 20 }),
      commissionRate: readField({ line, start: 280, length: 8 }),
      MdrSequenceNumber: readField({ line, start: 288, length: 8 }),
      MdtSequenceNumber: readField({ line, start: 296, length: 8 }),
    };
  }

  readWerLine(line: string) {
    // MWN / WER
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx);
    if (!workDistItem.royalties) {
      workDistItem.royalties = {};
    }
    workDistItem.royalties[this.recordSequence] = {
      type: 'WER',
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      referenceIdentifier: readField({ line, start: 19, length: 15 }),
      distributionCategoryType: readField({ line, start: 34, length: 2 }),
      exploitationSourceIdentifier: readField({ line, start: 36, length: 20 }),
      quantity: readField({ line, start: 56, length: 12 }),
      recordedProductNumber: readField({ line, start: 68, length: 20 }),
      isrc: readField({ line, start: 88, length: 12 }),
      countryOfLicensingTerritoryCode: readField({ line, start: 100, length: 4 }),
      countryOfLicensingTerritoryCodeValidFromDate: readField({ line, start: 104, length: 8 }),
      countryOfLicensingTerritoryAbbreviatedName: readField({ line, start: 112, length: 20 }),
      countryOfLicensingTerritoryAbbreviatedNameValidFromDate: readField({ line, start: 132, length: 8 }),
      basePriceType: readField({ line, start: 140, length: 1 }),
      saleType: readField({ line, start: 141, length: 3 }),
      salesPeriodStart: readField({ line, start: 144, length: 8 }),
      salesPeriodEnd: readField({ line, start: 152, length: 8 }),
      royaltyBasisPrice: readField({ line, start: 160, length: 12 }),
      trackCountryOfOriginTerritoryCode: readField({ line, start: 172, length: 4 }),
      trackCountryOfOriginTerritoryCodeValidFromDate: readField({ line, start: 176, length: 8 }),
      trackCountryOfOriginTerritoryAbbreviatedName: readField({ line, start: 184, length: 20 }),
      trackCountryOfOriginTerritoryAbbreviated: readField({ line, start: 204, length: 8 }),
      duration: readField({ line, start: 212, length: 6 }),
      trackSharePercentage: readField({ line, start: 218, length: 8 }),
      commissionRate: readField({ line, start: 226, length: 8 }),
      nationalGroupingIdentifier: readField({ line, start: 234, length: 11 }),
      currency: readField({ line, start: 245, length: 3 }),
      grossRoyaltyAmount: readField({ line, start: 248, length: 18 }),
      taxRate: readField({ line, start: 266, length: 8 }),
      taxAmount: readField({ line, start: 274, length: 18 }),
      commissionAmount: readField({ line, start: 292, length: 18 }),
      sourceSociety: readField({ line, start: 310, length: 3 }),
      sourceSocietyTaxAmount: readField({ line, start: 313, length: 18 }),
      sourceSocietyCommissionAmount: readField({ line, start: 331, length: 18 }),
      remittedRoyaltyAmount: readField({ line, start: 349, length: 18 }),
      aggregationPeriodType: readField({ line, start: 367, length: 1 }),
      societyAvWorkIdentifier: readField({ line, start: 368, length: 15 }),
      MdrSequenceNumber: readField({ line, start: 383, length: 8 }),
      MdtSequenceNumber: readField({ line, start: 391, length: 8 }),
      trackArtist: readField({ line, start: 399, length: 80 }),
    };
  }

  readAdjLine(line: string) {
    // MWN / ADJ
    const workDistItem = getWorkDistItem(this.crdData, this.transactionSequence, this.workDistIdx) as WorkDistRecord3;
    if (!workDistItem.ADJ) {
      workDistItem.ADJ = [];
    }
    workDistItem.ADJ.push({
      transactionSequence: this.transactionSequence,
      recordSequence: this.recordSequence,
      referenceIdentifier: readField({ line, start: 19, length: 15 }),
      originalReferenceIdentifier: readField({ line, start: 34, length: 15 }),
      originalDistributionIdentifier: readField({ line, start: 49, length: 10 }),
      originalInterestedPartyNumber: readField({ line, start: 59, length: 11 }),
      originalIpName: readField({ line, start: 70, length: 90 }),
      originalIpFirstName: readField({ line, start: 160, length: 45 }),
      incorrectShareNumerator: readField({ line, start: 205, length: 5 }),
      incorrectShareDenominator: readField({ line, start: 210, length: 5 }),
      incorrectSharePercentage: readField({ line, start: 215, length: 8 }),
      correctShareNumerator: readField({ line, start: 223, length: 5 }),
      correctShareDenominator: readField({ line, start: 228, length: 5 }),
      correctSharePercentage: readField({ line, start: 233, length: 8 }),
      adjustmentReasonCode: readField({ line, start: 241, length: 2 }),
      adjustmentReasonCommentary: readField({ line, start: 243, length: 80 }),
      adjustmentReferenceNumber: readField({ line, start: 323, length: 30 }),
      adjustmentAmount: readField({ line, start: 353, length: 18 }),
      adjustmentAmountSign: readField({ line, start: 371, length: 1 }),
      originalDistributionCategoryType: readField({ line, start: 372, length: 2 }),
      originalContainerIdentifier: readField({ line, start: 374, length: 20 }),
      adjustmentCurrency: readField({ line, start: 394, length: 3 }),
      originalExploitationSourceIdentifier: readField({ line, start: 397, length: 20 }),
    });
  }

  processCrdData() {
    const result = [];
    result.push(CRD_FILE_HEADER);
    Object.values(this.crdData.MWN).forEach((MWN) => {
      MWN.workDist?.forEach((workDistItem) => {
        const accountingPeriodEnd = formatDate(this.crdData.SDN.accountingPeriodEnd, 'YYYYMMDD');
        const bankPaymentDate = formatDate(this.crdData.SDN.bankPaymentDate, 'YYYYMMDD');
        const transactionDate = bankPaymentDate || accountingPeriodEnd || '';
        // build string containing all composers as well as separate IP names array
        let composerString = '';
        const channel = getChannel(workDistItem.MDR, this.crdData?.SDN?.typeOfRightCategory as ChannelCode);
        const ipArray: Array<string | undefined> = [];
        Object.values(workDistItem.MIP || {}).forEach((MIP) => {
          const ipName = this.crdData.SDN.IPI?.[MIP.interestedPartyNumber]?.ipName;
          const ipType = this.crdData.SDN.IPI?.[MIP.interestedPartyNumber]?.genericTypeOfIp;
          ipArray.push(ipName);
          if (ipType === 'C') {
            composerString += composerString === '' ? ipName : `,${ipName}`;
          }
        });

        Object.values(workDistItem.royalties || {}).forEach((royalty) => {
          const ESI = this.crdData.SDN.ESI?.[royalty.exploitationSourceIdentifier];
          const grossAmount = addDecimalPoint(royalty.grossRoyaltyAmount, this.amountDecimalPlaces);
          const withholdingAtSource = addDecimalPoint(royalty.taxAmount, this.amountDecimalPlaces);
          const commission = addDecimalPoint(royalty.commissionAmount, this.amountDecimalPlaces);

          // default netAmount to remittedRoyaltyAmount
          const netAmount = royalty.remittedRoyaltyAmount
            ? addDecimalPoint(royalty.remittedRoyaltyAmount, this.amountDecimalPlaces)
            : (Number(grossAmount) - Number(withholdingAtSource) - Number(commission)).toFixed(
                this.amountDecimalPlaces
              );

          let description = '';
          let barcode = '';
          let catNo = '';
          // build description string for AV royalty
          if (royalty.type === 'WEA') {
            const API = this.crdData.SDN.API?.[royalty.societyAvWorkIdentifier];
            description += API?.avWorkTitle ? API.avWorkTitle : '';
            if (API?.originalEpisodeNumber) {
              description += description !== '' ? ' - ' : '';
              description += `Episode ${API.originalEpisodeNumber}`;
            }
            if (API?.originalEpisodeTitle) {
              description += description !== '' ? ' - ' : '';
              description += API.originalEpisodeTitle;
            }
          }
          // extract barcode and catalogue number for recording royalty
          if (royalty.type === 'WER') {
            // Important to note that recordedProductNumber may not always be present on the file
            const RPI = this.crdData.SDN.RPI?.[royalty.recordedProductNumber];
            barcode = RPI?.eanUpcCode || '';
            catNo = RPI?.productCatalogueNumber || '';
          }

          // Handle WEP / WEA / WER specific fields
          let saleDate = '';
          if (royalty.type === 'WER') {
            saleDate = royalty.salesPeriodEnd;
          } else {
            saleDate = royalty.exploitationDate;
          }
          const isrc = royalty.type === 'WER' || royalty.type === 'WEP' ? royalty.isrc : '';
          let songCode = '';
          if (royalty.type === 'WEA') {
            songCode = royalty.societyAvWorkIdentifier;
          } else if (royalty.type === 'WER') {
            songCode = royalty.recordedProductNumber;
          }

          const data = [
            channel, // Channel
            this.crdData.HDR?.senderName || '', // Source
            transactionDate, // Transaction Date
            formatDate(saleDate, 'YYYYMMDD') || '', // Sale Date
            formatDate(workDistItem.MDS?.workStatusStartDate, 'YYYYMMDD') || '', // Date From
            formatDate(workDistItem.MDS?.workStatusEndDate, 'YYYYMMDD') || '', // Date To
            ESI?.exploitationTerritoryAbbreviatedName || '', // Territory
            ESI?.exploitationSourceName || '', // Sub Source
            MWN.originalWorkTitle || '', // Work Title
            '', // Release Title
            '', // Release Artist
            ipArray[0] ? ipArray[0] : '', // Party 1
            ipArray[1] ? ipArray[1] : '', // Party 2
            ipArray[2] ? ipArray[2] : '', // Party 3
            ipArray[3] ? ipArray[3] : '', // Party 4
            description, // Description
            mapDistributionCategory(royalty.distributionCategoryType) || '', // Configuration
            MWN.societyWorkIdentifier || '', // Identifier
            '', // ISAN
            '', // AV Work Type
            '', // Episode
            MWN.iswc || '', // ISWC
            isrc, // ISRC
            barcode, // Barcode
            catNo, // Cat No
            songCode, // Song Code
            '', // Duration
            Number(royalty.quantity), // Units
            '', // Share Percentage
            grossAmount, // Gross Amount
            netAmount, // Net Amount
            this.remittanceCurrency, // Original Currency
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
        if (workDistItem.ADJ) {
          const territory =
            workDistItem.MDT && workDistItem.MDT[0] && workDistItem.MDT[0].interestTerritoryTisan
              ? workDistItem.MDT[0].interestTerritoryTisan
              : '';
          workDistItem.ADJ.forEach((ADJ) => {
            const netAmount = addDecimalPoint(ADJ.adjustmentAmount, this.amountDecimalPlaces);
            const positiveNegative = ADJ.adjustmentAmountSign === '-' ? 'Negative' : 'Positive';
            const adjustmentReason = `${ADJ.adjustmentReasonCode} ${ADJ.adjustmentReasonCommentary}`;
            const configuration = mapDistributionCategory(ADJ.originalDistributionCategoryType);
            const data = [
              channel, // Channel
              this.crdData.HDR?.senderName || '', // Source
              transactionDate, // Transaction Date
              '', // Sale Date
              formatDate(workDistItem.MDS?.workStatusStartDate, 'YYYYMMDD') || '', // Date From
              formatDate(workDistItem.MDS?.workStatusEndDate, 'YYYYMMDD') || '', // Date To
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
              this.remittanceCurrency, // Original Currency
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
    return result;
  }
}
