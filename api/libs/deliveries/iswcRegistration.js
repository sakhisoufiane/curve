/**
 * @module iswcRegistration
 */

const { SocietyCodes, Utils } = require('@curveroyaltysystems/curve-shared-logic');
const moment = require('moment');
const fs = require('fs');
const { eachLimit, waterfall } = require('async');
const appRootDir = require('app-root-dir').get();
const Work = require('../../models/work');

class iswcRegistration {
  constructor() {
    this.outputData = {
      $schema: './iswc_publisher_schema.json',
      fileHeader: {},
    };
  }

  /**
   * Generates file
   *
   * @param {array} client - client to extract data from
   * @param {object} config - configuration for setting up header information
   * @param {function(string, object[])} callback - A callback that handles the response and returns the JSON object
   */
  createFile(client, society, returnCallback) {
    // Setup file name
    const clientSenderId = client.cwrPartyId ? client.cwrPartyId : 'XXX';
    const societyCode = SocietyCodes.mapSocietyToCode(society);
    const fileName = `iswcp_${moment().format('YYYY-MM-DDTHH-mm-SS')}_${societyCode}_${clientSenderId}_315.json`;
    // Setup output location
    const outputLocation = `${appRootDir}/tmp/${fileName}`;
    // Convert data to string
    const json = JSON.stringify(this.outputData, null, 4);
    // Write to file
    fs.writeFileSync(outputLocation, json);
    // Return filename and location
    returnCallback(null, fileName, outputLocation);
  }

  /**
   * Generates object response from workIds and config for converting into JSON
   *
   * @param {array} workIds - input workIds to create JSON from
   * @param {object} config - configuration for setting up header information
   * @param {function(string, object[])} callback - A callback that handles the response and returns the JSON object
   */
  createData(workIds, config, callback) {
    waterfall([
      (cb) => {
        this.createHeader(config, cb);
      },
      (cb) => {
        this.createWorks(workIds, config, cb);
      },
    ], (err) => {
      callback(err, this.outputData);
    });
  }

  /**
   * Generates header on the outputData object from the config
   *
   * @param {object} config - configuration for setting up header information
   * @param {function(string)} callback - A callback that returns error should it exist
   */
  createHeader(config, callback) {
    if (!config) {
      callback(new Error('Configuration required to setup fileHeader'));
    } else {
      const addOrFind = config.submissionType === 'Add' ? 'addSubmissions' : 'findSubmissions';
      let paddedCode;
      if (addOrFind === 'findSubmissions') {
        paddedCode = '312';
      } else {
        let agencyCode = SocietyCodes.mapSocietyToCode(config.receivingParty);
        agencyCode = String(agencyCode) || '';
        paddedCode = Utils.padWithValue(agencyCode, '0', 3, 'start');
      }
      this.outputData.fileHeader = {
        submittingAgency: paddedCode,
        submittingSourcedb: parseInt(paddedCode),
        submittingPublisher: {
          name: config.senderName,
          nameNumber: parseInt(config.ipiNo),
          email: config.email,
          role: config.role,
        },
        fileCreationDateTime: moment().toJSON(),
        receivingAgency: '315',
      };
      callback();
    }
  }

  /**
   * Adds passed workIds for outputData object
   *
   * @param {array} workIds - workIds for adding data to registration object
   * @param {object} config - configuration for setting up file
   * @param {function(string)} callback - A callback that returns error should it exist
  */
  createWorks(workIds, config, callback) {
    // console.log(util.inspect(workIds[0], false, null, true /* enable colors */));
    const addOrFind = config.submissionType === 'Add' ? 'addSubmissions' : 'findSubmissions';
    eachLimit(workIds, 10, async (workId) => {
      const work = await Work.findById(workId);
      // logger.debug(work);
      // Get ISRCs from tracks
      const isrcs = this.getIsrcsFromWork(work);
      // Get interested parties from work
      const { interestedParties, totalComposers } = this.getInterestedPartiesFromWork(work);
      // Select workcode from either partyNo or identifier
      const workcode = work.identifier && work.identifier !== '' ? String(work.identifier) : String(work.partyNo);
      // Create output object
      const outputWork = {
        submissionId: work.partyNo,
        workcode,
        disambiguation: false,
        originalTitle: work.title,
        interestedParties,
      };
      if (isrcs && isrcs.length > 0) {
        outputWork.additionalIdentifiers = {
          isrcs,
        };
      }
      // Only submit the work if it has interested parties or is a findSubmissions
      // if (
      //   (addOrFind === 'addSubmissions' && Array.isArray(interestedParties) && interestedParties.length > 0)
      //   || addOrFind === 'findSubmissions'
      // ) {
      //   // Check array at the field exists, else create a blank array for it
      //   this.outputData[addOrFind] = this.outputData[addOrFind] || [];
      //   // Add work to output data
      //   this.outputData[addOrFind].push(outputWork);
      // }
      if (Array.isArray(interestedParties) && interestedParties.length > 0 && interestedParties.length === totalComposers) {
        // Check array at the field exists, else create a blank array for it
        this.outputData[addOrFind] = this.outputData[addOrFind] || [];
        // Add work to output data
        this.outputData[addOrFind].push(outputWork);
      }
    }, callback);
  }

  /**
   * Takes a work, and returns ISRCs from associated recordings
   * Returns a blank array if no work passed
   *
   * @param {object} work - input work
   * @returns {array} - array of ISRCs
   */
  getIsrcsFromWork(work) {
    const isrcs = [];
    // Checks if work exists first
    if (work?.recordings) {
      // Loops through each recording
      work.recordings.forEach((recording) => {
        // Checks if ISRC exists
        if (recording.isrc && recording.isrc !== '' && !isrcs.includes(recording.isrc)) {
          // Adds to array
          isrcs.push(recording.isrc);
        }
      });
    }
    // Returns array of ISRCs or blank array if no work passed
    return isrcs;
  }

  /**
   * Takes a work, and returns array of interested parties from IP chain
   * Returns a blank array if no work passed
   *
   * @param {object} work - input work
   * @returns {array} - array of interested parties
   */
  getInterestedPartiesFromWork(work) {
    let composers = [];
    // Checks for rightsChain on work, and skips if none exist
    if (work?.rightsChain) {
      // Loops through each chain
      work.rightsChain.forEach((chain) => {
        // Looks for children from the headline level
        if (chain?.children) {
          // Gets composers
          const childrenComposers = this.composersFromChildren(chain);
          // Combines with the rest of the composers
          composers = [].concat(composers, childrenComposers);
        }
      });
    }
    // Converts to interested party format
    // And returns along with total composers on work
    return { interestedParties: this.composersToUniqueOutput(composers), totalComposers: composers.length };
  }

  /**
   * Returns an array of composers from the chain, drilling down through each layer of the chain
   * Returns a blank array if no chain passed
   *
   * @param {object} chain - input chain
   * @returns {array} - array of composers
   */
  composersFromChildren(chain) {
    let composers = [];
    // Checks for children on a chain
    if (Array.isArray(chain?.children)) {
      // Loops through each child
      chain.children.forEach((item) => {
        // Only interested in extracting composers
        if (item?.type === 'Composer') {
          // item.composer.contractType = item.contractType;
          composers.push(item);
        }
        // Run same function when next layers
        if (item?.children) {
          const childrenComposers = this.composersFromChildren(item);
          composers = [].concat(composers, childrenComposers);
        }
      });
    }
    return composers;
  }

  /**
   * Take array of composers and turns into a unique set of interested parties
   * Returns a blank array if no array passed
   *
   * @param {array} composers - input composers for mapping
   * @returns {array} - array of interested parties
   */
  composersToUniqueOutput(composers) {
    const output = [];
    if (Array.isArray(composers)) {
      // Loop through composers and add to output
      const tempComposers = [];
      composers.forEach((item) => {
        if (item?.name && item?.caeNumber && parseInt(item.caeNumber)) {
          const tempName = `${item.name} ${item.caeNumber}`;
          // Check if name has been added before
          if (!tempComposers.includes(tempName)) {
            // Adds composer to output in correct format
            output.push({
              nameNumber: parseInt(item.caeNumber),
              role: this.mapRole(item.contractType),
            });
          }
          // Add temp name to tempComposers for tracking if it's been added before
          tempComposers.push(`${item.name} ${item.caeNumber}`);
        }
      });
    }
    return output;
  }

  /**
   * Maps a role to the correct 2 character value
   * Defaults to Lyrics/Music
   *
   * @param {string} role - input role for mapping
   * @returns {string} - character code for role
   */
  mapRole(role) {
    switch (role) {
      case 'Lyrics':
        return 'A';
      case 'Music':
        return 'C';
      default:
        return 'CA';
    }
  }
}

module.exports = iswcRegistration;
