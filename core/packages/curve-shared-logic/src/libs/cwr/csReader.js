const { logger, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');

const CWRObject = require('./cwr');

// only used for mapping society codes so could move logic internal
const cwr = new CWRObject();

const csReaderObject = function (params) {
  const cs = this;
  // Init params
  this.params = params;
  this.works = [];
  this.errors = [];

  this.readFile = function (fileLocation, callback) {
    this.extractDataFromFile(fileLocation, (err, data) => {
      if (err) {
        callback(err);
      } else {
        cs.csToJson(data, (csErr) => {
          callback(csErr, cs.works, cs.errors);
        });
      }
    });
  };

  this.extractDataFromFile = function (fileLocation, callback) {
    if (fs.existsSync(fileLocation)) {
      fileOpener.detectEncoding(fileLocation, (err, encoding) => {
        logger.info(`CS file encoding: ${encoding}`);
        fs.readFile(fileLocation, encoding || 'utf8', callback);
      });
    } else {
      callback(new Error(`No file present at ${fileLocation}`));
    }
  };

  this.csToJson = function (data, callback) {
    if (!data) {
      callback(new Error('No data passed'));
    } else {
      // Remove first and last two lines
      let separator = '\r';
      if (data.indexOf('\r') === -1) {
        separator = '\n';
      }
      const lines = data.split(separator);
      lines.splice(0, 1);
      lines.splice(lines.length - 1, 1);
      // eslint-disable-next-line no-param-reassign
      data = lines.join(separator);

      const works = [];
      let currentWork = '';

      // Split on work demarkation
      for (const line of data.split(separator)) {
        if (line.length > 10 && line.slice(8, 10) === '10') {
          works.push(currentWork);
          currentWork = line;
        } else {
          currentWork += separator + line;
        }
      }

      if (currentWork) {
        works.push(currentWork);
      }
      // Remove blank first element
      works.splice(0, 1);

      async.each(works, (workData, cb) => {
        cs.workDataToJson(workData, cb);
      }, callback);
    }
  };

  this.workDataToJson = function (workData, callback) {
    // Split lines
    let separator = '\r';
    if (workData.indexOf('\r') === -1) {
      separator = '\n';
    }
    const workLines = workData.split(separator);

    const type10Lines = [];
    const type11Lines = [];
    const otherLines = [];

    workLines.forEach((line) => {
      // eslint-disable-next-line no-param-reassign
      line = line.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
      const lineType = line.slice(7, 9);
      if (lineType === '10') {
        type10Lines.push(line);
      } else if (lineType === '11') {
        type11Lines.push(line);
      } else {
        otherLines.push(line);
      }
    });

    type11Lines.sort((a, b) => {
      // Extract the character at position 15 in each line
      const charA = a.charAt(14);
      const charB = b.charAt(14);

      if (charA === 'P' && charB !== 'P') {
        return -1; // 'P' lines come first
      }
      if (charA !== 'P' && charB === 'P') {
        return 1; // 'C' lines come first
      }

      // If both lines are either 'C' or 'P', sort them by publisherTie
      // ensure top of chain processed first
      const publisherTieA = a.substring(36, 45);
      const publisherTieB = b.substring(36, 45);

      if (publisherTieA === '000000000' && publisherTieB !== '000000000') {
        return -1; // '000000000' lines come first
      }
      if (publisherTieA !== '000000000' && publisherTieB === '000000000') {
        return 1; // Non-'000000000' lines come first
      }

      return 0; // No change in order
    });
    // also ensure that a publisher that has another publisher tied to it, is created first
    type11Lines.sort((a, b) => {
      const publisherTieA = a.substring(15, 24);
      const publisherTieB = b.substring(36, 45);
      if (publisherTieA !== publisherTieB) {
        // If substrings are not equal, ignore
        return 0;
      }
      // If substrings match, prioritize the line where publisher interestedpartyno matches publisherTie but comes after
      return -1;
    });
    const sortedLines = type10Lines.concat(type11Lines, otherLines);

    const work = {};
    async.forEachOf(sortedLines, (line, index, cb) => {
      // eslint-disable-next-line no-param-reassign
      line = line.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
      // Read each line of the work. Mark the work as an error if not correct format and try and import what we can
      try {
        cs.readWorkLine(line, index, work, cb);
      } catch (e) {
        cb(e);
      }
    }, (err) => {
      // if the work lines dont fully match as expected, mark single work as errored
      if (err) {
        cs.errors.push(`${err} ${work?.csWorkNo} - ${work?.title}`);
      }
      cs.works.push(work);
      callback();
    });
  };

  this.readWorkLine = function (line, index, work, callback) {
    const lineType = line.slice(7, 9);
    if (lineType === '10') {
      // ('Song Detail Record');
      cs.read10Line(line, work, callback);
    } else if (lineType === '11') {
      // ('Interested Party Linkages');
      cs.read11Line(line, work, callback);
    } else if (lineType === '12') {
      // ('Song Territory');
      cs.read12Line(line, work, callback);
    } else if (lineType === '13') {
      // ('Song Catalog Details');
      cs.read13Line(line, work, callback);
    } else if (lineType === '14') {
      // ('Song Client Linkages');
      cs.read14Line(line, work, callback);
    } else if (lineType === '15') {
      // ('Song Language Details');
      cs.read15Line(line, work, callback);
    } else if (lineType === '16') {
      // ('Song Notes');
      cs.read16Line(line, work, callback);
    } else if (lineType === '17') {
      // ('Song Alternate Titles');
      cs.read17Line(line, work, callback);
    } else if (lineType === '18') {
      // ('Song Composers');
      cs.read18Line(line, work, callback);
    } else if (lineType === '19') {
      // ('Song Publishers');
      cs.read19Line(line, work, callback);
    } else if (lineType === '20') {
      // ('Song Claim Notes');
      cs.read20Line(line, work, callback);
    } else if (lineType === '21') {
      // ('Song Credit Notes');
      cs.read21Line(line, work, callback);
    } else if (lineType === '22') {
      // ('Song Instrumentation');
      cs.read22Line(line, work, callback);
    } else if (lineType === '23') {
      // ('Interested Party Capacities');
      cs.read23Line(line, work, callback);
    } else if (lineType === '24') {
      // ('Societies');
      cs.read24Line(line, work, callback);
    } else if (lineType === '25') {
      // ('Song Departments');
      cs.read25Line(line, work, callback);
    } else if (lineType === '26') {
      // ('Song Recordings');
      cs.read26Line(line, work, callback);
    } else if (lineType === '50') {
      // ('CWR Interested PArty Affiliation');
      cs.read50Line(line, work, callback);
    } else if (lineType === '51') {
      // ('CWR Song Interested Party Linkages');
      cs.read51Line(line, work, callback);
    } else if (lineType === '52') {
      // ('CWR Song Agreement Number Linkages');
      cs.read52Line(line, work, callback);
    } else if (lineType === '53') {
      // ('CWR Agreement Territories');
      cs.read53Line(line, work, callback);
    } else if (lineType === '54') {
      // ('CWR Agreement Details');
      cs.read54Line(line, work, callback);
    } else if (lineType === '55') {
      // ('CWR Agreement Names');
      cs.read55Line(line, work, callback);
    } else {
      callback();
    }
  };

  // Read song detail record - readRevLine ? - Singluar
  this.read10Line = function (line, work, callback) {
    work.csWorkNo = line.substring(0, 7);
    work.submitterWorkNo = line.substring(0, 7);
    work.title = line.substring(12, 62).trim();
    // work.language = line.substring(79, 81).trim();
    work.controlled = this.booleanValue(line.substring(62, 63).trim());
    work.systemTerritoryCode = line.substring(63, 65).trim();
    work.dateOfPublicationOfPrintedEdition = line.substring(65, 73).trim();
    work.creationDate = line.substring(73, 81).trim();
    work.publicDomainDate = line.substring(81, 89).trim();
    work.revisionDate = line.substring(89, 97).trim();
    work.duration = this.twoDecimalPlaceNumber(line.substring(97, 102).trim()); // songTime
    work.traditionPublicDomain = this.booleanValue(line.substring(102, 103).trim());
    work.seriousMusic = this.booleanValue(line.substring(103, 104).trim());
    work.principleArtist = line.substring(104, 139).trim();
    work.albumTitle = line.substring(139, 174).trim();
    work.catalogueNo = line.substring(174, 189).trim();
    work.creditYear = line.substring(189, 193).trim();
    work.territoryCode = line.substring(193, 197).trim();
    callback();
  };

  // Read Song / Interested Party Linkages - readSpuLine? - Multiple
  this.read11Line = function (line, work, callback) {
    const recordType11 = {};
    recordType11.csWorkNo = line.substring(0, 7).trim();
    recordType11.interestedPartySequence = line.substring(9, 12).trim();
    recordType11.systemTerritoryCode = line.substring(12, 14).trim();
    recordType11.composerOrPublisher = line.substring(14, 15).trim();
    recordType11.interestedPartyNo = line.substring(15, 24).trim(); // interestedPartyCode
    recordType11.capacity1 = line.substring(24, 28).trim();
    recordType11.capacity2 = line.substring(28, 32).trim();
    recordType11.capacity3 = line.substring(32, 36).trim();
    recordType11.publisherTie = line.substring(36, 45).trim();
    recordType11.controlled = this.booleanValue(line.substring(45, 46).trim());
    recordType11.societyNumber = line.substring(46, 58).trim();
    recordType11.societyCode = cwr.societyCode(line.substring(58, 62).trim());
    recordType11.territoryCode = line.substring(62, 66).trim();
    recordType11.mrOwnershipShare = this.threeDecimalPlaceNumber(line.substring(66, 73).trim()); // mechanicalOwned
    recordType11.prOwnershipShare = this.threeDecimalPlaceNumber(line.substring(73, 80).trim()); // performanceOwned
    recordType11.fractionOwnedNumerator = line.substring(80, 86).trim();
    recordType11.fractionOwnedDenominator = line.substring(86, 92).trim();
    recordType11.mechanicalCollectible = this.threeDecimalPlaceNumber(line.substring(92, 99).trim());
    recordType11.performanceCollectible = this.threeDecimalPlaceNumber(line.substring(99, 106).trim());
    recordType11.fractionCollectibleNumerator = line.substring(106, 112).trim();
    recordType11.fractionCollectibleDenominator = line.substring(112, 118).trim();
    recordType11.subPublisher = this.booleanValue(line.substring(118, 119).trim());
    if (recordType11.composerOrPublisher === 'P') {
      recordType11.publisherType = line.substring(24, 28).trim();
      work.publishers = work.publishers || {};
      work.publishers[recordType11.interestedPartyNo] = recordType11;
      work.publisherChains = work.publisherChains || {};
      work.publisherChains = this.setupIpChainPublishers(recordType11, work.publisherChains, work.publishers);
      work.publisherTerritories = work.publisherTerritories || {};
      work.publisherTerritories = this.setupPublisherTerritories(recordType11, work.publisherTerritories, work.publishers);
    } else {
      recordType11.writerDesignationCode = line.substring(24, 28).trim();
      work.composers = work.composers || {};
      work.composers = this.setupIpChainComposers(recordType11, work);
    }
    callback();
  };

  // Read Song Territory Details - ? - Singular
  this.read12Line = function (line, work, callback) {
    const territory = {};
    territory.csWorkNo = line.substring(0, 7).trim();
    territory.territorySequence = line.substring(9, 12).trim();
    territory.territoryCode = line.substring(12, 16).trim();
    territory.territoryDescription1 = line.substring(16, 81).trim();
    territory.territoryDescription2 = line.substring(81, 146).trim();
    territory.territoryDescription3 = line.substring(146, 211).trim();
    work.territories = work.territories || [];
    work.territories.push(territory);
    callback();
  };

  // Read Song Catalog Details - ? - Multiple
  this.read13Line = function (line, work, callback) {
    const recordType13 = {};
    recordType13.csWorkNo = line.substring(0, 7).trim();
    recordType13.songCatalogSequence = line.substring(9, 12).trim();
    recordType13.catalogCode = line.substring(12, 16).trim();
    recordType13.catalogDescription = line.substring(16, 81).trim();
    recordType13.percentageShare = this.threeDecimalPlaceNumber(line.substring(81, 88).trim());
    // mapping
    this.songCatalogSequence = recordType13.songCatalogSequence;
    work.catalogDetails = work.catalogDetails || [];
    work.catalogDetails.push(recordType13);
    callback();
  };

  // Read Song Client Linkages - ? - Multiple
  this.read14Line = function (line, work, callback) {
    const recordType14 = {};
    recordType14.csWorkNo = line.substring(0, 7).trim();
    recordType14.songClientSequence = line.substring(9, 12).trim();
    recordType14.clientCode = line.substring(12, 18).trim();
    recordType14.clientName = line.substring(18, 68).trim();
    recordType14.variationNumber = line.substring(68, 70).trim();
    recordType14.performanceShare = this.threeDecimalPlaceNumber(line.substring(70, 77).trim());
    recordType14.otherShare = this.threeDecimalPlaceNumber(line.substring(77, 85).trim());
    // mapping
    this.songClientSequence = recordType14.songClientSequence;
    work.clientLinkages = work.clientLinkages || [];
    work.clientLinkages.push(recordType14);
    callback();
  };

  // Read Song Lanuguage Details - ? - Singular
  this.read15Line = function (line, work, callback) {
    work.csWorkNo = line.substring(0, 7).trim();
    work.lanuguageSequence = line.substring(9, 12).trim();
    work.lanuguageCode = line.substring(12, 16).trim();
    work.lanuguage = line.substring(16, 46).trim();
    callback();
  };

  // Read Song Notes - ? - Multiple
  this.read16Line = function (line, work, callback) {
    const recordType16 = {};
    recordType16.csWorkNo = line.substring(0, 7).trim();
    recordType16.notesSequence = line.substring(9, 12).trim();
    recordType16.note1 = line.substring(12, 92).trim();
    recordType16.note2 = line.substring(92, 172).trim();
    // mapping
    this.notesSequence = recordType16.notesSequence;
    work.notes = work.notes || [];
    work.notes.push(recordType16);
    callback();
  };

  // read Alternative title line - readAltLine - multiple
  this.read17Line = function (line, work, callback) {
    const recordType17 = {};
    recordType17.csWorkNo = line.substring(0, 7).trim();
    recordType17.alternateTitleSequence = line.substring(9, 12).trim();
    recordType17.alternateTitle = line.substring(12, 62).trim();
    recordType17.languageCode = '';
    work.alternateTitles = work.alternateTitles || [];
    work.alternateTitles.push(recordType17);
    callback();
  };

  // read Composer line - readSwrLine? - multiple
  this.read18Line = function (line, work, callback) {
    const recordType18 = {};
    recordType18.csWorkNo = line.substring(0, 7).trim();
    recordType18.composerSequence = line.substring(9, 12).trim();
    recordType18.interestedPartyNo = line.substring(12, 21).trim(); // interestedPartyCode
    recordType18.writerLastName = line.substring(21, 51).trim(); // surname
    recordType18.writerFirstName = `${line.substring(51, 71).trim()} ${line.substring(71, 91).trim()}`; // firstName secondname
    recordType18.title = line.substring(91, 101).trim();
    recordType18.initials = line.substring(101, 105).trim();
    recordType18.societyCode = cwr.societyCode(line.substring(105, 109).trim());
    recordType18.societyAffiliationNumber = line.substring(109, 121).trim();
    recordType18.writerIpiNameNo = line.substring(121, 136).trim(); // CAENumber
    recordType18.nameQualifier = line.substring(136, 151).trim();
    recordType18.professionallyKnownAs = line.substring(151, 191).trim();
    recordType18.dateOfBirth = line.substring(191, 199).trim();
    recordType18.dateOfDeath = line.substring(199, 207).trim();
    const combineComposer = { ...work.composers[recordType18.interestedPartyNo], ...recordType18 };
    work.composers[recordType18.interestedPartyNo] = combineComposer;
    callback();
  };

  // Read song publisher line - readSpuLine? - multiple
  this.read19Line = function (line, work, callback) {
    const recordType19 = {};
    recordType19.lineType = line.substring(7, 9).trim();
    recordType19.csWorkNo = line.substring(0, 7).trim();
    recordType19.publisherSequence = line.substring(12, 21).trim();
    recordType19.interestedPartyNo = line.substring(12, 21).trim(); // interestedPartyCode
    recordType19.publisherName = line.substring(21, 71).trim();
    recordType19.prSociety = cwr.societyCode(line.substring(71, 75).trim());
    recordType19.internationStandardAgreementCode = line.substring(75, 87).trim();
    recordType19.societyAssignedAgreementNo = line.substring(87, 102).trim();
    // eslint-disable-next-line guard-for-in
    for (const chain in work.publisherChains) {
      work.publisherChains[chain] = work.publisherChains[chain].map((publisher) => {
        if (publisher.interestedPartyNo === recordType19.interestedPartyNo) {
          return { ...publisher, ...recordType19 };
        }
        return publisher;
      });
    }
    this.publisherSequence = recordType19.publisherSequence;
    callback();
  };

  // Read song claim notes - ? - multiple - Max 2 - second only if 4 or more notes
  this.read20Line = function (line, work, callback) {
    const recordType20 = {};
    recordType20.lineType = line.substring(7, 9).trim();
    recordType20.csWorkNo = line.substring(0, 7).trim();
    recordType20.claimCode = line.substring(12, 16).trim();
    recordType20.claimNote1 = line.substring(16, 81).trim();
    recordType20.claimNote2 = line.substring(81, 146).trim();
    recordType20.claimNote3 = line.substring(146, 211).trim();
    work.claimNotes = work.claimNotes || [];
    work.claimNotes.push(recordType20);
    callback();
  };

  // Read song credit notes - ? - multiple - Max 2 - second only if 4 or more notes
  this.read21Line = function (line, work, callback) {
    const recordType21 = {};
    recordType21.lineType = line.substring(7, 9).trim();
    recordType21.csWorkNo = line.substring(0, 7).trim();
    recordType21.creditCode = line.substring(12, 16).trim();
    recordType21.creditNote1 = line.substring(16, 81).trim();
    recordType21.creditNote2 = line.substring(81, 146).trim();
    recordType21.creditNote3 = line.substring(146, 211).trim();
    work.creditNotes = work.creditNotes || [];
    work.creditNotes.push(recordType21);
    callback();
  };

  // Read Song Instrumentation - ? - multiple - Max 2
  this.read22Line = function (line, work, callback) {
    const recordType22 = {};
    recordType22.lineType = line.substring(7, 9).trim();
    recordType22.csWorkNo = line.substring(0, 7).trim();
    recordType22.instrumentationCode = line.substring(12, 16).trim();
    recordType22.standardInstrumentation = line.substring(16, 17).trim();
    recordType22.cwrCode = line.substring(17, 20).trim();
    recordType22.description = line.substring(20, 70).trim();
    work.songInstrumentation = work.songInstrumentation || [];
    work.songInstrumentation.push(recordType22);
    callback();
  };

  // Read Interested Party Capacities - ? - multiple
  this.read23Line = function (line, work, callback) {
    const recordType23 = {};
    recordType23.lineType = line.substring(7, 9).trim();
    recordType23.csWorkNo = line.substring(0, 7).trim();
    recordType23.capacityCode = line.substring(12, 16).trim();
    recordType23.capacityDescription = line.substring(16, 46).trim();
    work.interestedPartyCapacities = work.interestedPartyCapacities || [];
    work.interestedPartyCapacities.push(recordType23);
    callback();
  };

  // Read Societies - ? - multiple
  this.read24Line = function (line, work, callback) {
    const recordType24 = {};
    recordType24.lineType = line.substring(7, 9).trim();
    recordType24.csWorkNo = line.substring(0, 7).trim();
    recordType24.societyCode = line.substring(12, 16).trim();
    recordType24.societyName = line.substring(16, 66).trim();
    work.societies = work.societies || [];
    work.societies.push(recordType24);
    callback();
  };

  // Read Departments - ? - multiple
  this.read25Line = function (line, work, callback) {
    const recordType25 = {};
    recordType25.lineType = line.substring(7, 9).trim();
    recordType25.csWorkNo = line.substring(0, 7).trim();
    recordType25.departmentCode = line.substring(12, 16).trim();
    recordType25.departmentName = line.substring(16, 81).trim();
    work.departments = work.departments || [];
    work.departments.push(recordType25);
    callback();
  };

  // Read Song Recordings - ? readRecLine - multiple
  this.read26Line = function (line, work, callback) {
    const recordType26 = {};
    recordType26.lineType = line.substring(7, 9).trim();
    recordType26.csWorkNo = line.substring(0, 7).trim();
    recordType26.recordingSequenceNumber = line.substring(12, 18).trim();
    recordType26.principalRecordingIndicator = line.substring(18, 19).trim();
    recordType26.recordingTitle = line.substring(19, 79).trim();
    recordType26.albumTitle = line.substring(79, 139).trim();
    recordType26.releaseDate = line.substring(139, 147).trim();
    recordType26.albumLabelCode = line.substring(147, 151).trim();
    recordType26.catalogNumber = line.substring(151, 169).trim();
    recordType26.firstCountryCode = line.substring(169, 173).trim();
    recordType26.isrc = line.substring(173, 185).trim();
    recordType26.recordingTime = this.twoDecimalPlaceNumber(line.substring(185, 190).trim());
    recordType26.principleArtist = line.substring(190, 250).trim();
    recordType26.barcode = line.substring(250, 263).trim();
    recordType26.recordingFormat = line.substring(263, 264).trim();
    recordType26.recordingTechnique = line.substring(264, 265).trim();
    recordType26.mediaType = line.substring(265, 268).trim();
    recordType26.versionTitle = line.substring(268, 328).trim();
    recordType26.recordingLabelCode = line.substring(328, 332).trim();
    recordType26.submitterId = line.substring(332, 346).trim();
    work.recordings = work.recordings || [];
    work.recordings.push(recordType26);
    callback();
  };

  // Read CWR Interested Party Affiliation - ? - multiple
  this.read50Line = function (line, work, callback) {
    const recordType50 = {};
    recordType50.lineType = line.substring(7, 9).trim();
    recordType50.csWorkNo = line.substring(0, 7).trim();
    recordType50.affiliationIpCode = line.substring(12, 21).trim();
    recordType50.affiliationIpType = line.substring(21, 22).trim();
    recordType50.affiliationTerritoryCode = line.substring(22, 26).trim();
    recordType50.affiliationMechSociety = line.substring(26, 30).trim();
    recordType50.affiliationMechSocietyNumber = line.substring(30, 45).trim();
    recordType50.affiliationPerfSociety = line.substring(45, 49).trim();
    recordType50.affiliationPerfSocietyNumber = line.substring(49, 64).trim();
    recordType50.affiliationSyncSociety = line.substring(64, 68).trim();
    recordType50.affiliationSyncSocietyNumber = line.substring(68, 83).trim();
    recordType50.affiliationOtherSociety = line.substring(83, 87).trim();
    recordType50.affiliationOtherSocietyNumber = line.substring(87, 102).trim();
    work.CwrInterestedPartyAffiliation = work.CwrInterestedPartyAffiliation || [];
    work.CwrInterestedPartyAffiliation.push(recordType50);
    callback();
  };

  // Read CWR Interested Party Linkages - ? - multiple
  this.read51Line = function (line, work, callback) {
    const recordType51 = {};
    recordType51.lineType = line.substring(7, 9).trim();
    recordType51.csWorkNo = line.substring(0, 7).trim();
    recordType51.ipLinkId = line.substring(12, 15).trim();
    recordType51.ipSequenceNumber = line.substring(15, 18).trim();
    recordType51.ipType = line.substring(18, 19).trim();
    recordType51.ipCode = line.substring(19, 28).trim();
    recordType51.territoryCode = line.substring(28, 32).trim();
    recordType51.originalTerritoryIndicator = line.substring(32, 33).trim();
    recordType51.ChainId = line.substring(33, 36).trim();
    recordType51.parentIpLinkId = line.substring(36, 39).trim();
    recordType51.capacityCode = line.substring(39, 43).trim();
    recordType51.controlled = line.substring(43, 44).trim();
    recordType51.contribution = this.twoDecimalPlaceNumber(line.substring(44, 50).trim());
    recordType51.mechanicalOwned = this.twoDecimalPlaceNumber(line.substring(50, 56).trim());
    recordType51.performanceOwned = this.twoDecimalPlaceNumber(line.substring(56, 62).trim());
    recordType51.synchOwned = this.twoDecimalPlaceNumber(line.substring(62, 68).trim());
    recordType51.otherOwned = this.twoDecimalPlaceNumber(line.substring(68, 74).trim());
    recordType51.mechanicalCollectible = this.twoDecimalPlaceNumber(line.substring(74, 80).trim());
    recordType51.performanceCollectible = this.twoDecimalPlaceNumber(line.substring(80, 86).trim());
    recordType51.synchCollectible = this.twoDecimalPlaceNumber(line.substring(86, 92).trim());
    recordType51.otherCollectible = this.twoDecimalPlaceNumber(line.substring(92, 98).trim());
    recordType51.ipShareCode = line.substring(98, 102).trim();
    recordType51.composerContribution = this.twoDecimalPlaceNumber(line.substring(102, 108).trim());
    recordType51.authorContribution = this.twoDecimalPlaceNumber(line.substring(108, 114).trim());
    recordType51.extendedIpLinkId = line.substring(114, 121).trim();
    recordType51.extendedIpSequenceNumber = line.substring(121, 128).trim();
    recordType51.extendedParentIpLinkId = line.substring(128, 135).trim();
    work.CwrInterestedPartyLinkages = work.CwrInterestedPartyLinkages || [];
    work.CwrInterestedPartyLinkages.push(recordType51);
    callback();
  };

  // Read CWR Song/Agreement number Linkages - ? - multiple
  this.read52Line = function (line, work, callback) {
    const recordType52 = {};
    recordType52.lineType = line.substring(7, 9).trim();
    recordType52.csWorkNo = line.substring(0, 7).trim();
    recordType52.ipLinkId = line.substring(12, 15).trim();
    recordType52.assignorLinkId = line.substring(15, 18).trim();
    recordType52.agreementNumber = line.substring(18, 25).trim();
    recordType52.extendedIpLinkId = line.substring(25, 32).trim();
    recordType52.extendedAssignorLinkId = line.substring(32, 39).trim();
    work.CwrSongLinkages = work.CwrSongLinkages || [];
    work.CwrSongLinkages.push(recordType52);
    callback();
  };

  // Read CWR Agreement Territories - ? - multiple
  this.read53Line = function (line, work, callback) {
    const recordType53 = {};
    recordType53.lineType = line.substring(7, 9).trim();
    recordType53.csWorkNo = line.substring(0, 7).trim();
    recordType53.agreementNumber = line.substring(12, 19).trim();
    recordType53.agreementTerritoryCode = line.substring(19, 23).trim();
    recordType53.agreementMechSociety = line.substring(23, 27).trim();
    recordType53.agreementPerfSociety = line.substring(27, 31).trim();
    recordType53.agreementSyncSociety = line.substring(31, 35).trim();
    recordType53.agreementOtherSociety = line.substring(35, 39).trim();
    recordType53.agreementSocietyNumber = line.substring(39, 53).trim();
    work.CwrAgreementTerritories = work.CwrAgreementTerritories || [];
    work.CwrAgreementTerritories.push(recordType53);
    callback();
  };

  // Read CWR Agreement Details - ? - multiple - Documentation is wrong length values
  this.read54Line = function (line, work, callback) {
    const recordType54 = {};
    recordType54.lineType = line.substring(7, 9).trim();
    recordType54.csWorkNo = line.substring(0, 7).trim();
    recordType54.agreementNumber = line.substring(12, 19).trim();
    recordType54.agreementType = line.substring(19, 21).trim();
    recordType54.assignorIPCode = line.substring(21, 30).trim();
    recordType54.assignorType = line.substring(30, 31).trim();
    recordType54.acquirerIPCode = line.substring(31, 40).trim();
    recordType54.acquirerDefaultCapacity = line.substring(40, 44).trim();
    recordType54.agreementTerritoryCode = line.substring(44, 48).trim();
    recordType54.agreementISAC = line.substring(48, 62).trim();
    recordType54.submitterAgreementNumber = line.substring(62, 76).trim();
    recordType54.startDate = line.substring(76, 84).trim();
    recordType54.endDate = line.substring(84, 92).trim();
    recordType54.sentDate = line.substring(92, 100).trim();
    recordType54.signatureDate = line.substring(100, 108).trim();
    recordType54.returnedDate = line.substring(108, 116).trim();
    recordType54.returnedExpiryDate = line.substring(116, 124).trim();
    recordType54.priorRoyaltyStatus = line.substring(124, 125).trim();
    recordType54.priorRoyaltyDate = line.substring(125, 133).trim();
    recordType54.postCollectionStatus = line.substring(133, 134).trim();
    recordType54.postCollectionDate = line.substring(134, 142).trim();
    recordType54.salesManufacture = line.substring(142, 143).trim();
    recordType54.advancePaid = line.substring(143, 144).trim();
    recordType54.sharesChange = line.substring(144, 145).trim();
    recordType54.assignorMech = this.twoDecimalPlaceNumber(line.substring(145, 152).trim());
    recordType54.assignorPerf = this.twoDecimalPlaceNumber(line.substring(152, 159).trim());
    recordType54.assignorSync = this.twoDecimalPlaceNumber(line.substring(159, 166).trim());
    recordType54.assignorOther = this.twoDecimalPlaceNumber(line.substring(166, 173).trim());
    recordType54.acquirerMech = this.twoDecimalPlaceNumber(line.substring(173, 180).trim());
    recordType54.acquirerPerf = this.twoDecimalPlaceNumber(line.substring(180, 187).trim());
    recordType54.acquirerSync = this.twoDecimalPlaceNumber(line.substring(187, 194).trim());
    recordType54.acquirerOther = this.twoDecimalPlaceNumber(line.substring(194, 201).trim());
    recordType54.agreementStatus = line.substring(201, 202).trim();
    recordType54.agreementCatalogCode = line.substring(202, 206).trim();
    work.CwrAgreementDetails = work.CwrAgreementDetails || [];
    work.CwrAgreementDetails.push(recordType54);
    callback();
  };

  // Read CWR Agreement Names - ? - multiple - Documentation is wrong length values
  this.read55Line = function (line, work, callback) {
    const recordType55 = {};
    recordType55.lineType = line.substring(7, 9).trim();
    recordType55.csWorkNo = line.substring(0, 7).trim();
    recordType55.agreementNumber = line.substring(12, 19).trim();
    recordType55.agreementName = line.substring(19, 69).trim();
    recordType55.foreignAssignorMech = this.twoDecimalPlaceNumber(line.substring(69, 76).trim());
    recordType55.foreignAssignorPerf = this.twoDecimalPlaceNumber(line.substring(76, 83).trim());
    recordType55.foreignAssignorSync = this.twoDecimalPlaceNumber(line.substring(83, 90).trim());
    recordType55.foreignAssignorOther = this.twoDecimalPlaceNumber(line.substring(90, 97).trim());
    recordType55.foreignAcquirerMech = this.twoDecimalPlaceNumber(line.substring(97, 104).trim());
    recordType55.foreignAcquirerPerf = this.twoDecimalPlaceNumber(line.substring(104, 111).trim());
    recordType55.foreignAcquirerSync = this.twoDecimalPlaceNumber(line.substring(111, 119).trim());
    recordType55.foreignAcquirerOther = this.twoDecimalPlaceNumber(line.substring(119, 126).trim());
    work.CwrAgreementNames = work.CwrAgreementNames || [];
    work.CwrAgreementNames.push(recordType55);
    callback();
  };

  // eslint-disable-next-line consistent-return
  this.nextComposerId = function (interestedPartyNo, composers) {
    // Check if composers exist, and if the interstedPartyNo already exists
    if (!composers || (composers && !composers[interestedPartyNo])) {
      // When it doesn't exist, return the unchanged partyNo
      return interestedPartyNo;
    } if (composers[interestedPartyNo]) {
      let output;
      // Loop through and add next number until finding a unique value
      for (let number = 2; number < 10; number += 1) {
        if (!composers[`${interestedPartyNo}_${number}`]) {
          // When found set the output value
          output = `${interestedPartyNo}_${number}`;
          break;
        }
      }
      return output;
    }
  };

  this.lastComposerId = function (interestedPartyNo, composers) {
    // Check if composers exist, and if the interstedPartyNo already exists
    let output;
    // Loop trhough from 10 down and find the highest number
    for (let number = 10; number > 0; number -= 1) {
      if (composers[`${interestedPartyNo}_${number}`]) {
        // When found set the output value
        output = `${interestedPartyNo}_${number}`;
        break;
      }
    }
    // When an output has been found, return that, otherwise return the original partyNo
    if (output) {
      return output;
    }
    return interestedPartyNo;
  };

  this.setupIpChainPublishers = function (recordType11, publisherChains, publishers) {
    if (recordType11.publisherTie === '000000000') {
      publisherChains[recordType11.interestedPartyNo] = [recordType11];
    } else {
      // Attach publisher to the tied publisher, either directly if there is only one publisher above it, or recursivly work up the chain to the top
      const topPublisher = findPublisher(recordType11.publisherTie, publishers);
      publisherChains[topPublisher.interestedPartyNo].push(recordType11);
    }
    return publisherChains;
  };

  this.setupPublisherTerritories = function (recordType11, publisherTerritories, publishers) {
    const publisherTerritory = {};
    publisherTerritory.csWorkNo = recordType11.csWorkNo;
    publisherTerritory.interestedPartyNo = recordType11.interestedPartyNo;
    publisherTerritory.prCollectionShare = recordType11.performanceCollectible;
    publisherTerritory.mrCollectionShare = recordType11.mechanicalCollectible;
    publisherTerritory.territories = recordType11.territoryCode;
    publisherTerritory.sequenceNo = recordType11.interestedPartyNo;
    if (recordType11.publisherTie === '000000000') {
      publisherTerritories[recordType11.interestedPartyNo] = [publisherTerritory];
    } else {
      // Attach publisherTerritories to the tied publisher, either directly if there is only one publisher above it, or recursivly work up the chain to the top
      const topPublisher = findPublisher(recordType11.publisherTie, publishers);
      publisherTerritories[topPublisher.interestedPartyNo].push(publisherTerritory);
    }
    return publisherTerritories;
  };

  // eslint-disable-next-line consistent-return
  this.setupIpChainComposers = function (recordType11, work) {
    const newComposers = work.composers || {};
    if (recordType11.composerOrPublisher === 'C') {
      newComposers[recordType11.interestedPartyNo] = recordType11;
      if (recordType11.publisherTie && recordType11.publisherTie !== '000000000') {
        const tiedPublisher = this.getPublisher(work.publisherChains, recordType11.publisherTie);
        newComposers[recordType11.interestedPartyNo].publishers = newComposers[recordType11.interestedPartyNo].publishers || [];
        newComposers[recordType11.interestedPartyNo].publishers.push(tiedPublisher);
      }
      return newComposers;
    }
  };

  this.durationToSeconds = function (duration) {
    if (duration) {
      const hours = Number(duration.substring(0, 2));
      const minutes = Number(duration.substring(2, 4));
      const seconds = Number(duration.substring(4, 6));
      return seconds + (minutes * 60) + (hours * 60 * 60);
    }
    return null;
  };

  // work up to the publisher at top of the chain. If publisherTie is '000000000', we are at the top
  function findPublisher(publisherTie, publishers) {
    const publisher = publishers[publisherTie];
    if (!publisher) {
      return null; // If publisherTie is not found
    }
    if (publisher.publisherTie === '000000000') {
      return publisher; // Found the publisher at top of chain
    }
    return findPublisher(publisher.publisherTie, publishers); // Recursively search for the next tied publisher
  }

  this.getPublisher = function (publisherChains, interestedPartyNo) {
    // loop through each chain in the publisherChains object
    // eslint-disable-next-line guard-for-in
    for (const chain in publisherChains) {
      // loop through each publisher in the current chain
      for (const publisher of publisherChains[chain]) {
        // check if the interestedPartyNo matches the search value
        if (publisher.interestedPartyNo === interestedPartyNo) {
          // return the matching publisher
          return publisher;
        }
      }
    }
    // if no match was found, return null
    return null;
  };

  this.booleanValue = function (value) {
    if (value === 'Y') {
      return true;
    }
    return false;
  };

  this.twoDecimalPlaceNumber = function (value) {
    if (value) {
      return Number(value) / 100;
    }
    return 0;
  };

  this.threeDecimalPlaceNumber = function (value) {
    if (value) {
      return Number(value) / 1000;
    }
    return 0;
  };

  this.mapTerritories = function (value) {
    return value;
  };
};

module.exports = csReaderObject;
