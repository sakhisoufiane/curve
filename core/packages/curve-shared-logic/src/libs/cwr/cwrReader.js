/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */
const { logger, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');

const cwrObject = function (params) {
  const cwr = this;
  // Init params
  this.params = params;
  this.works = [];
  this.errors = [];

  this.readFile = function (fileLocation, callback) {
    this.extractDataFromFile(fileLocation, (err, data) => {
      if (err) {
        callback(err);
      } else {
        cwr.cwrToJson(data, (err) => {
          callback(err, cwr.works, cwr.errors);
        });
      }
    });
  };

  this.extractDataFromFile = function (fileLocation, callback) {
    if (fs.existsSync(fileLocation)) {
      fileOpener.detectEncoding(fileLocation, (err, encoding) => {
        logger.info(`CWR file encoding: ${encoding}`);
        fs.readFile(fileLocation, encoding || 'utf8', callback);
      });
    } else {
      callback(new Error(`No file present at ${fileLocation}`));
    }
  };

  this.cwrToJson = function (data, callback) {
    if (!data) {
      callback(new Error('No data passed'));
    } else {
      // Remove first and last two lines
      let separator = '\r';
      if (data.indexOf('\r') === -1) {
        separator = '\n';
      }
      const lines = data.split(separator);
      lines.splice(0, 2);
      lines.splice(lines.length - 2, 2);
      data = lines.join(separator);
      // Split on work demarkation
      const splitWorks = data.split('NWR0').join('|||').split(/(?<=^|\n)REV0/).join('|||')
        .split('|||');
      // Remove blank first element
      splitWorks.shift();
      async.each(splitWorks, (workData, cb) => {
        cwr.workDataToJson(workData, cb);
      }, callback);
    }
  };

  this.workDataToJson = function (workData, callback) {
    // Add split characters back
    workData = `REV0${workData}`;
    // Split liens
    let separator = '\r';
    if (workData.indexOf('\r') === -1) {
      separator = '\n';
    }
    const workLines = workData.split(separator);
    const work = {};
    async.forEachOf(workLines, (line, index, cb) => {
      line = line.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
      try {
        cwr.readWorkLine(line, index, work, cb);
      } catch (e) {
        cb(e);
      }
    }, (err) => {
      // if the work lines dont fully match as expected, mark single work as errored
      if (err) {
        cwr.errors.push(`${err}-${work?.cwrWorkNo} - ${work?.title}`);
      }
      cwr.works.push(work);
      callback();
    });
  };

  this.readWorkLine = function (line, index, work, callback) {
    const lineType = line.substring(0, 3);
    if (lineType === 'REV') {
      cwr.readRevLine(line, work, callback);
    } else if (lineType === 'SPU') {
      cwr.readSpuLine(line, work, callback);
    } else if (lineType === 'SPT') {
      cwr.readSptLine(line, work, callback);
    } else if (lineType === 'OPU') {
      cwr.readSpuLine(line, work, callback);
    } else if (lineType === 'SWR') {
      cwr.readSwrLine(line, work, callback);
    } else if (lineType === 'SWT') {
      cwr.readSwtLine(line, work, callback);
    } else if (lineType === 'PWR') {
      cwr.readPwrLine(line, work, callback);
    } else if (lineType === 'OWR') {
      cwr.readSwrLine(line, work, callback);
    } else if (lineType === 'ALT') {
      cwr.readAltLine(line, work, callback);
    } else if (lineType === 'PER') {
      cwr.readPerLine(line, work, callback);
    } else if (lineType === 'REC') {
      cwr.readRecLine(line, work, callback);
    } else if (lineType === 'COM') {
      cwr.readComLine(line, work, callback);
    } else if (lineType === 'ORN') {
      cwr.readOrnLine(line, work, callback);
    } else {
      callback();
    }
  };

  this.readRevLine = function (line, work, callback) {
    work.cwrWorkNo = line.substring(3, 11);
    work.title = line.substring(19, 79).trim();
    work.language = line.substring(79, 81).trim();
    work.submitterWorkNo = line.substring(81, 95).trim();
    work.iswc = line.substring(95, 106).trim();
    work.tunecode = line.substring(114, 126).trim();
    work.musicalWorkDistributionCategory = line.substring(126, 129).trim();
    work.duration = this.durationToSeconds(line.substring(129, 135).trim());
    work.recordedIndicator = this.booleanValue(line.substring(135, 136).trim());
    work.textMusicRelationship = line.substring(136, 139).trim();
    work.compositeType = line.substring(139, 142).trim();
    work.versionType = line.substring(142, 145).trim();
    work.excerptType = line.substring(145, 148).trim();
    work.musicArrangement = line.substring(148, 151).trim();
    work.lyricAdaption = line.substring(151, 154).trim();
    work.contactName = line.substring(154, 184).trim();
    work.contactId = line.substring(184, 194).trim();
    work.cwrWorkType = line.substring(194, 196).trim();
    work.grandRights = this.booleanValue(line.substring(196, 197).trim());
    work.compositeComponentCount = line.substring(197, 200).trim();
    work.dateOfPublicationOfPrintedEdition = line.substring(200, 208).trim();
    work.exceptionalClause = line.substring(208, 209).trim();
    work.opusNo = line.substring(209, 234).trim();
    work.catalogueNo = line.substring(234, 259).trim();
    work.priorityFlag = this.booleanValue(line.substring(259, 260).trim());
    callback();
  };

  this.readSpuLine = function (line, work, callback) {
    const spu = {};
    spu.lineType = line.substring(0, 3).trim();
    spu.cwrWorkNo = line.substring(3, 11).trim();
    spu.cwrLineNo = line.substring(11, 19).trim();
    spu.publisherSequence = line.substring(19, 21).trim();
    spu.interestedPartyNo = line.substring(21, 30).trim();
    spu.publisherName = line.substring(30, 75).trim();
    spu.publisherUnknownIndicator = line.substring(75, 76).trim();
    spu.publisherType = line.substring(76, 78).trim();
    spu.taxId = line.substring(78, 87).trim();
    spu.publisherIpiName = line.substring(87, 98).trim();
    spu.submitterAgreementNo = line.substring(98, 112).trim();
    spu.prSociety = line.substring(112, 115).trim();
    spu.prOwnershipShare = this.twoDecimalPlaceNumber(line.substring(115, 120).trim());
    spu.mrSociety = line.substring(120, 123).trim();
    spu.mrOwnershipShare = this.twoDecimalPlaceNumber(line.substring(123, 128).trim());
    spu.srSociety = line.substring(128, 131).trim();
    spu.srOwnershipShare = this.twoDecimalPlaceNumber(line.substring(131, 136).trim());
    spu.specialAgreementsIndicator = line.substring(136, 137).trim();
    spu.firstRecordingRefusalIndicator = this.booleanValue(line.substring(137, 138).trim());
    spu.publisherIpiBaseNo = line.substring(139, 152).trim();
    spu.internationStandardAgreementCode = line.substring(152, 166).trim();
    spu.societyAssignedAgreementNo = line.substring(166, 180).trim();
    spu.agreementType = line.substring(180, 182).trim();
    spu.usaLicenseIndicator = line.substring(182, 183).trim();
    work.publisherChains = work.publisherChains || {};
    work.publisherChains[spu.publisherSequence] = work.publisherChains[spu.publisherSequence] || [];
    work.publisherChains[spu.publisherSequence].push(spu);
    // Set publisher sequence to use for mapping spt lines
    this.publisherSequence = spu.publisherSequence;
    callback();
  };

  this.readSptLine = function (line, work, callback) {
    const spt = {};
    spt.cwrWorkNo = line.substring(3, 11).trim();
    spt.cwrLineNo = line.substring(11, 19).trim();
    spt.interestedPartyNo = line.substring(19, 28).trim();
    spt.prCollectionShare = this.twoDecimalPlaceNumber(line.substring(34, 39).trim());
    spt.mrCollectionShare = this.twoDecimalPlaceNumber(line.substring(39, 44).trim());
    spt.srCollectionShare = this.twoDecimalPlaceNumber(line.substring(44, 49).trim());
    spt.includeExclusionIndicator = line.substring(49, 50).trim();
    spt.territories = line.substring(50, 54).trim();
    spt.sharesChangeIndicator = line.substring(54, 55).trim();
    spt.sequenceNo = line.substring(55, 58).trim();
    work.publisherTerritories = work.publisherTerritories || {};
    work.publisherTerritories[this.publisherSequence] = work.publisherTerritories[this.publisherSequence] || [];
    work.publisherTerritories[this.publisherSequence].push(spt);
    callback();
  };

  this.readSwrLine = function (line, work, callback) {
    const swr = {};
    swr.lineType = line.substring(0, 3).trim();
    swr.cwrWorkNo = line.substring(3, 11).trim();
    swr.cwrLineNo = line.substring(11, 19).trim();
    swr.interestedPartyNo = line.substring(19, 28).trim();
    swr.writerLastName = line.substring(28, 73).trim();
    swr.writerFirstName = line.substring(73, 103).trim();
    swr.writerUnknownIndicator = line.substring(103, 104).trim();
    swr.writerDesignationCode = line.substring(104, 106).trim();
    swr.taxId = line.substring(106, 115).trim();
    swr.writerIpiNameNo = line.substring(115, 126).trim();
    swr.prSociety = line.substring(126, 129).trim();
    swr.prOwnershipShare = this.twoDecimalPlaceNumber(line.substring(129, 134).trim());
    swr.mrSociety = line.substring(134, 137).trim();
    swr.mrOwnershipShare = this.twoDecimalPlaceNumber(line.substring(137, 142).trim());
    swr.srSociety = line.substring(142, 145).trim();
    swr.srOwnershipShare = this.twoDecimalPlaceNumber(line.substring(145, 150).trim());
    swr.reversionaryIndicator = line.substring(150, 151).trim();
    swr.firstRecordingRefusalIndicator = this.booleanValue(line.substring(151, 152).trim());
    swr.workForHireIndicator = line.substring(152, 153).trim();
    swr.writerIpiBaseNo = line.substring(154, 167).trim();
    swr.personalNo = line.substring(167, 179).trim();
    swr.usaLicenseIndicator = line.substring(179, 180).trim();
    work.composers = work.composers || {};
    // Get next composer in sequence
    const composerId = this.nextComposerId(swr.interestedPartyNo, work.composers);
    work.composers[composerId] = swr;
    callback();
  };

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

  this.readSwtLine = function (line, work, callback) {
    const swt = {};
    swt.cwrWorkNo = line.substring(3, 11).trim();
    swt.cwrLineNo = line.substring(11, 19).trim();
    swt.interestedPartyNo = line.substring(19, 28).trim();
    swt.prCollectionShare = this.twoDecimalPlaceNumber(line.substring(28, 33).trim());
    swt.mrCollectionShare = this.twoDecimalPlaceNumber(line.substring(33, 38).trim());
    swt.srCollectionShare = this.twoDecimalPlaceNumber(line.substring(38, 43).trim());
    swt.includeExclusionIndicator = line.substring(43, 44).trim();
    swt.territories = line.substring(44, 48).trim();
    swt.sharesChangeIndicator = line.substring(48, 49).trim();
    swt.sequenceNo = line.substring(49, 53).trim();
    work.composers = work.composers || {};
    const composerId = this.lastComposerId(swt.interestedPartyNo, work.composers);
    work.composers[composerId] = work.composers[composerId] || {};
    work.composers[composerId].territories = work.composers[composerId].territories || [];
    work.composers[composerId].territories.push(swt);
    callback();
  };

  this.readPwrLine = function (line, work, callback) {
    const pwr = {};
    pwr.cwrWorkNo = line.substring(3, 11).trim();
    pwr.interestedPartyNo = line.substring(19, 28).trim();
    pwr.publisherName = line.substring(28, 73).trim();
    pwr.submitterAgreementNo = line.substring(73, 87).trim();
    pwr.societyAssignedAgreementNo = line.substring(87, 101).trim();
    pwr.writerIpNo = line.substring(101, 110).trim();
    pwr.publisherSequence = line.substring(110, 112).trim();
    work.composers = work.composers || {};
    const composerId = this.lastComposerId(pwr.writerIpNo, work.composers);
    work.composers[composerId] = work.composers[composerId] || {};
    work.composers[composerId].publishers = work.composers[composerId].publishers || [];
    work.composers[composerId].publishers.push(pwr);
    callback();
  };

  this.readAltLine = function (line, work, callback) {
    const alt = {};
    alt.cwrWorkNo = line.substring(3, 11).trim();
    alt.alternateTitle = line.substring(19, 79).trim();
    alt.titleType = line.substring(79, 81).trim();
    alt.languageCode = line.substring(81, 83).trim();
    work.alternateTitles = work.alternateTitles || [];
    work.alternateTitles.push(alt);
    callback();
  };

  this.readPerLine = function (line, work, callback) {
    const per = {};
    per.cwrWorkNo = line.substring(3, 11).trim();
    per.performingArtistLastName = line.substring(19, 64).trim();
    per.performingArtistFirstName = line.substring(64, 94).trim();
    per.performingArtistIpiNameNo = line.substring(94, 105).trim();
    per.performingArtistIpiBaseNo = line.substring(105, 118).trim();
    work.performingArtists = work.performingArtists || [];
    work.performingArtists.push(per);
    callback();
  };

  this.readRecLine = function (line, work, callback) {
    const rec = {};
    rec.cwrWorkNo = line.substring(3, 11).trim();
    rec.releaseDate = line.substring(19, 27).trim();
    rec.releaseDuration = line.substring(87, 93).trim();
    rec.albumTitle = line.substring(98, 158).trim();
    rec.albumLabel = line.substring(158, 218).trim();
    rec.catNo = line.substring(218, 236).trim();
    rec.barcode = line.substring(236, 249).trim();
    rec.isrc = line.substring(249, 261).trim();
    rec.format = line.substring(261, 262).trim();
    rec.recordingTechnique = line.substring(262, 263).trim();
    rec.mediaType = line.substring(263, 266).trim();
    rec.recordingTitle = line.substring(266, 326).trim();
    rec.versionTitle = line.substring(326, 386).trim();
    rec.displayArtist = line.substring(386, 446).trim();
    rec.recordingLabel = line.substring(446, 506).trim();
    rec.isrcValidity = line.substring(506, 526).trim();
    rec.submitterRecordingIdentifier = line.substring(526, 540).trim();
    work.recordings = work.recordings || [];
    work.recordings.push(rec);
    callback();
  };

  this.readComLine = function (line, work, callback) {
    const com = {};
    com.title = line.substring(19, 79).trim();
    com.source = line.substring(110, 155).trim(); // Writer 1 last name in spec
    work.compositeWorks = work.compositeWorks ?? [];
    work.compositeWorks.push(com);
    callback();
  };

  this.readOrnLine = function (line, work, callback) {
    // Type - 3
    // Line count - 8
    // Sub Line Count - 8
    // Intended Purpose - 3 - LIB
    // Production Title - 60 - work.productionTitle
    // CD Identifier - 15 - work.cdIdentifier
    // Cut No - 4
    // Library - 60 - work.libraryTitle
    // BLTVR - 1
    // Filler - 25
    // Production No - 12
    // Episode Title - 60
    // Episode No - 20
    // Year of Production - 4
    // AVI Society Code - 3
    // Audio-Visual No - 15
    // if (cwr.params.version == 2.2) {
    // ISAN - 12
    // Episode - 4
    // Check Digit 1 - 1
    // Version - 8
    // Check Digit 2 - 1
    // EIDR - 21
    // }
    work.productionLibrary = line.substring(19, 22).trim() === 'LIB';
    work.productionTitle = line.substring(22, 82).trim();
    work.cdIdentifier = line.substring(82, 97).trim();
    work.cutNo = Number(line.substring(97, 101).trim());
    work.libraryTitle = line.substring(101, 161).trim();
    callback();
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

  this.mapTerritories = function (value) {
    return value;
  };
};

module.exports = cwrObject;
