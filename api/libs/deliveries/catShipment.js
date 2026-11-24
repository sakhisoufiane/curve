const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const moment = require('moment');
const { eachSeries, parallel, waterfall } = require('async');
const { ObjectId } = require('mongodb');
const Contract = require('../../models/contract');
const Track = require('../../models/track');
const Release = require('../../models/release');

class CatShipment {
  constructor() {
    this.outputData = [];
    this.outputHeaders = [
      'Music Maestro Song Code',
      'Song Title',
      'ISWC',
      'Song Notes',
    ];
    this.arraySizeCounters = {
      altTitles: 0,
      chainsArray: [],
      chainIndex: 0,
      clients: 0,
      tracks: 0,
    };
    this.capacityMappings = {
      Admin: 'AM',
      'Sub Publisher': 'SE',
      'Original Publisher': 'OP',
      Aquirer: 'AQ',
      Lyrics: 'A',
      Music: 'C',
      'Lyrics and Music': 'CA',
      Arranger: 'AR',
      'Sub Arranger': 'SR',
      Adapter: 'AD',
      'Sub Author': 'SA',
      Translator: 'TR',
      'Income Participant': 'PA',
    };
  }

  createData({ works }, callback) {
    // logger.debug(works);
    eachSeries(works, (work, cb) => {
      this.initCoreData(work, cb);
    }, (err) => {
      if (err) {
        return callback(err);
      }
      this.buildCSVData(callback);
    });
  }

  initCoreData(work, callback) {
    // logger.debug(`--${work.title}--${work._id}`);
    parallel({
      tracks: (cb) => this.buildTracks(work, cb),
      chains: (cb) => this.buildIPChain(work, cb),
      titles: (cb) => this.buildAltTitles(work, cb),
      clients: (cb) => this.buildClients(work, cb),
    }, (err, data) => {
      const workCoreData = {
        'Music Maestro Song Code': work.identifier || work.partyNo,
        'Song Title': work.title || '',
        ISWC: work.iswc || '',
        'Song Notes': work.notes || '',
        altTitles: data.titles,
        clients: data.clients,
        territory: '',
        tracks: data.tracks,
      };

      if (data.chains && data.chains.length > 0) {
        // Add a new row for each chain
        data.chains.forEach((chain) => {
          // Create a copy of workCoreData for each chain and add IP and territory
          const thisWorkCoreData = _.clone(workCoreData);
          thisWorkCoreData.ipChains = chain.chainsData;
          thisWorkCoreData.territory = chain.territory;
          this.outputData.push(thisWorkCoreData);
        });
      } else {
        workCoreData.ipChains = [];
        this.outputData.push(workCoreData);
      }
      // ...NOTE if we change tack on seperate rows for chains then add chains to workCoreData,
      // ...then revert above to simply: this.outputData.push(workCoreData);
      // ...and deal with chains in applyIPChains - chains index will need adjusted too
      callback(err);
    });
  }

  buildCSVData(callback) {
    // Pushed procesing to async for slight efficiency improvement
    // Order here is important as each processor adds header fields
    // logger.debug(this.arraySizeCounters);
    waterfall([
      (cb) => setImmediate(() => this.applyAltTitles(cb)),
      (cb) => setImmediate(() => this.applyIPChains(cb)),
      (cb) => setImmediate(() => this.applyClients(cb)),
      (cb) => setImmediate(() => this.applyTerritories(cb)),
      (cb) => setImmediate(() => this.applyTracks(cb)),
    ], callback);
  }

  createFile(appRootDir, clientName, returnCallback) {
    // logger.debug('\n\n\nthis.outputData');
    // logger.debug(this.outputData);
    // logger.debug('end this.outputData\n\n\n');
    const sanitisedClientName = clientName.replace(/\//g, '-');
    const fileName = `Cat Shipment ${sanitisedClientName} ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
    const outputLocation = `${appRootDir}/tmp/${fileName}`;
    const writer = new WriteCsv({ headers: this.outputHeaders, outputLocation });
    const outputData = this.outputData.map((line) => Object.values(line));
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        returnCallback(err, fileName, location);
      });
    });
  }

  buildIPChain(work, callback) {
    let chainIndex = 0;
    let ipIndex = 0;
    let chainsData = [];
    let ipData = [];
    let territory = '';
    const rowData = [];
    const rightsChain = work.rightsChain || [];

    const getRights = (chain, chainId, cb) => {
      if (chain) {
        // logger.debug('\n\n================ chain ================');
        // logger.debug(chain);
        // logger.debug('>> in chainId >', chainId);
        // logger.debug('================ /chain ================');
        if (chain.territory) {
          // Set territory value for adding to chain
          // logger.debug(`chain.territory: ${chain.territory}`);
          territory = chain.territory;
        } else if (chain.type) {
          // build IP data object and push onto chain
          // logger.debug(`chain.type: ${chain.type}`);
          const data = {};
          let item;
          if (chain.type === 'Publisher') {
            item = chain.publisher || {};
            data.type = 'P';
            data.name = item.name;
            data.partyNo = item.partyNo;
            // Main Society and Identifier
            data.mainPro = item.mainPro ? item.mainPro : '';
            data.mainProIdentifier = item.mainProIdentifier ? item.mainProIdentifier : item.cae;
          } else if (chain.type === 'Composer') {
            item = chain.composer || {};
            let name = '';
            if (item.name) {
              name = item.name;
            } else if (item.givenName && item.surname) {
              name = `${item.givenName} ${item.surname}`;
            } else if (item.surname) {
              name = item.surname;
            }
            data.type = 'C';
            data.name = name;
            data.partyNo = item.partyNo;
            // Main Society and Identifier
            data.mainPro = item.mainPro ? item.mainPro : '';
            data.mainProIdentifier = item.mainProIdentifier ? item.mainProIdentifier : item.cae;
          }
          data.moShare = chain.mechanicalOwnership;
          data.poShare = chain.performanceOwnership;
          data.mcShare = chain.mechanicalCollection;
          data.pcShare = chain.performanceCollection;
          data.controlled = (chain.controlled) ? 'Y' : 'N';
          data.cae = item.cae;
          data.capacity = this.capacityMappings[chain.contractType];
          data.affiliation = '';
          if (item.societies && item.societies.length > 0) {
            data.affiliation = item.societies[0].society; //! ?
          }

          // If we are on a new chain, reset ipData
          if (!chainId) {
            ipData = [];
          }
          // console.log('pushing data to ipData')
          ipData.push(data);
          ipIndex = ipData.length; // ipIndex += 1; //
          // console.log({ipIndex});
          // console.log('ipData.length', ipData.length);
        }
        // Loop through children
        if (chain.children && chain.children.length > 0) {
          eachSeries(chain.children, (childChain, ccb) => {
            let chainId;
            if (chain.type) {
              if (chain.type === 'Publisher') {
                chainId = chain.publisherId;
              } else {
                chainId = chain.composerId;
              }
              // console.log('+++++++++ chain.type :', chain.type);
              // console.log('+++++++++ chainId :', chainId, '');
            }
            // console.log('---==calling getRights==-- chainId -', chainId);
            getRights(childChain, chainId, ccb);
          }, () => {
            if (ipData.length > 0) {
              // console.log('----ipData----'); / console.log(ipData); // Add and reset current chain's IP
              // console.log('pushing ipData to chainsData');
              // reverse ipData to display composers first
              chainsData.push(ipData.reverse());
              ipData = [];
              chainIndex = chainsData.length;// chainIndex += 1;//
              // console.log({chainIndex});
              // console.log('chainsData.length', chainsData.length);
              // console.log('ipIndex before reset = ', ipIndex);

              // before reset test main counter and push to this limit
              if (this.arraySizeCounters.chainsArray.length < chainIndex) {
                this.arraySizeCounters.chainsArray.push(ipIndex);
              } else if (ipIndex > this.arraySizeCounters.chainsArray[chainIndex - 1]) {
                this.arraySizeCounters.chainsArray[chainIndex - 1] = ipIndex;
              }
              // console.log(this.arraySizeCounters.chainsArray);
              ipIndex = 0;
            }
            cb();
          });
        } else {
          cb();
        }
      } else {
        cb();
      }
    };

    if (rightsChain && rightsChain.length > 0) {
      // logger.debug('------rightsChain------');
      // logger.debug(rightsChain);
      eachSeries(rightsChain, (chain, ccb) => {
        // For each territory in the rightsChain,
        if (chainsData.length > 0) {
          // logger.debug('----chainsData----');
          // logger.debug(chainsData);
          // Add and reset current chain's IP
          rowData.push({ territory, chainsData });
          // reset chainsData for next loop of territories
          chainsData = [];
          // before resetting, test main counter and push to this limit
          // logger.debug(`chainIndex before reset = ${chainIndex}`);
          if (chainIndex > this.arraySizeCounters.chainIndex) {
            this.arraySizeCounters.chainIndex = chainIndex;
          }
          chainIndex = 0;
        }
        getRights(chain, null, ccb);
      }, (err) => {
        if (chainsData.length > 0) {
          // logger.debug('----chainsData-FINAL---');
          // logger.debug(chainsData);
          // Add chainsData data from last run through before returning
          rowData.push({ territory, chainsData });
          // test main counter and push to this limit
          // logger.debug(`chainIndex before completion = ${chainIndex}`);
          if (chainIndex > this.arraySizeCounters.chainIndex) {
            this.arraySizeCounters.chainIndex = chainIndex;
          }
        }
        // logger.debug('----rowData-FINAL---');
        // logger.debug(JSON.stringify(rowData, null, 2));
        callback(err, rowData);
      });
    } else {
      // logger.debug('no rightsChain ' + work.title);
      callback();
    }
  }

  buildTracks(work, callback) {
    // Gather data for Recording Section
    let index = 0;
    const trackData = [];
    let tracksIds = work.trackIds || [];
    // Remove any non-ObjectId strings
    tracksIds = tracksIds.filter((trackId) => ObjectId.isValid(trackId));

    // Get all tracks associated with this release
    Track.find({ clientId: work.clientId, _id: { $in: tracksIds } })
      .then((tracks) => {
        if (tracks && tracks.length > 0) {
          // Loop through tracks to build base data
          eachSeries(tracks, (track, cb) => {
            if (track) {
              const rowData = {
                artist: track.artist || '',
                isrc: track.isrc || '',
                duration: track.duration || '',
                tTitle: track.title || '',
              };
              // Attemot to get all releaes which relate to the track to complete data
              Release.find({ clientId: work.clientId, trackIds: track._id.toString() })
                .then((releases) => {
                  if (releases && releases.length > 0) {
                    // Loop through releases completing recording data and save section for each
                    releases.forEach((release) => {
                      if (release) {
                        let releaseDate = '';
                        if (release.releaseDate) {
                          releaseDate = moment(release.releaseDate).format('YYYYMMDD');
                        }
                        rowData.rTitle = release.title || '';
                        rowData.releaseDate = releaseDate;
                        rowData.catNo = release.catNo || '';
                        rowData.label = release.label || '';
                        rowData.barcode = release.barcode || '';
                        trackData.push(rowData);
                        index += 1;
                      }
                    });
                  } else {
                    // We have no release - store down the base track data we have
                    trackData.push(rowData);
                    index += 1;
                  }
                  // proceed to next release
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            } else {
              // No useful data returned for the track
              cb();
            }
          }, (err) => {
            // Error building recording data
            if (err) {
              return callback(err);
            }
            // Set the boundary for applying track colums across works
            if (index > this.arraySizeCounters.tracks) {
              this.arraySizeCounters.tracks = index;
            }
            // logger.debug(trackData);
            // Return the track Data to initCoreData
            callback(null, trackData);
          });
        } else {
          // We have no tracks - get out of here
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }

  buildClients(work, callback) {
    let index = 0;
    const clientData = [];
    const clients = work.salesReturnsRights || [];

    eachSeries(clients, (client, cb) => {
      // logger.debug(client);
      if (client) {
        Contract.findById(client.contractId, 'name')
          .then((contract) => {
            if (contract) {
              clientData.push({
                name: contract.name,
                percentage: client.percentage,
              });
            }
            index += 1;
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }
    }, (err) => {
      if (err) {
        return callback(err);
      }
      if (index > this.arraySizeCounters.clients) {
        this.arraySizeCounters.clients = index;
      }
      callback(null, clientData);
    });
  }

  buildAltTitles(work, callback) {
    setImmediate(() => {
      let index = 0;
      const altTitleData = [];
      const altTitles = work.alternateTitles || [];

      altTitles.forEach((alternateTitle) => {
        if (alternateTitle?.title) {
          altTitleData.push(alternateTitle.title); // ++= push object here for other scenarios - reduced to title as nothing else to pass through
          index += 1;
        }
      });

      if (index > this.arraySizeCounters.altTitles) {
        this.arraySizeCounters.altTitles = index;
      }
      callback(null, altTitleData);
    });
  }

  applyHeaders(...fields) {
    this.outputHeaders = this.outputHeaders.concat(fields);
  }

  applyTracks(callback) {
    // logger.debug('applyTracks');
    this.outputData.forEach((work, workIndex) => {
      for (let i = 0; i < this.arraySizeCounters.tracks; i += 1) {
        const p = i + 1;
        // Create column headers
        const recordingCode = `Recording ${p} Music Maestro Code`;
        const recordingRecorded = `Recording ${p} Recorded? (Y/N)`;
        const recordingArtist = `Recording ${p} Display Artist`;
        const recordingISRC = `Recording ${p} ISRC`;
        const recordingAlbumTitle = `Recording ${p} Album Title`;
        const recordingReleaseDate = `Recording ${p} Release Date (Format CCYYMMDD)`;
        const recordingCatNo = `Recording ${p} Catalog Number`;
        const recordingLabel = `Recording ${p} Label Name`;
        const recordingDuration = `Recording ${p} Duration`;
        const recordingOwner = `Recording ${p} Owner Name`;
        const recordingUPC = `Recording ${p} UPC`;
        const recordingExternalID = `Recording ${p} External ID`;
        const recordingMusicianFee = `Recording ${p}  Musician Fee`;
        const recordingRecordingDate = `Recording ${p}  Recording Date`;
        const recordingTitle = `Recording ${p}  Title`;

        // Set default params
        let recorded = '';
        let artist = '';
        let isrc = '';
        let rTitle = '';
        let releaseDate = '';
        let catNo = '';
        let label = '';
        let duration = '';
        let barcode = '';
        let musicianFee = '';
        let tTitle = '';

        // Fill in blanks where we have data
        if (work.tracks && work.tracks[i]) {
          recorded = 'Y';
          artist = work.tracks[i].artist;
          isrc = work.tracks[i].isrc;
          rTitle = work.tracks[i].rTitle;
          releaseDate = work.tracks[i].releaseDate;
          catNo = work.tracks[i].catNo;
          label = work.tracks[i].label;
          duration = work.tracks[i].duration;
          barcode = work.tracks[i].barcode;
          musicianFee = 'N';
          tTitle = work.tracks[i].tTitle;
        }

        // Fill cell whether we have data or default
        work[recordingCode] = '';
        work[recordingRecorded] = recorded;
        work[recordingArtist] = artist;
        work[recordingISRC] = isrc;
        work[recordingAlbumTitle] = rTitle;
        work[recordingReleaseDate] = releaseDate;
        work[recordingCatNo] = catNo;
        work[recordingLabel] = label;
        work[recordingDuration] = duration;
        work[recordingOwner] = '';
        work[recordingUPC] = barcode;
        work[recordingExternalID] = '';
        work[recordingMusicianFee] = musicianFee;
        work[recordingRecordingDate] = '';
        work[recordingTitle] = tTitle;

        // Apply the headers once only
        if (workIndex === 0) {
          this.applyHeaders(recordingCode, recordingRecorded, recordingArtist, recordingISRC, recordingAlbumTitle, recordingReleaseDate, recordingCatNo, recordingLabel, recordingDuration, recordingOwner, recordingUPC, recordingExternalID, recordingMusicianFee, recordingRecordingDate, recordingTitle);
        }
      }
      // Remove temp data param
      delete work.tracks;
    });
    callback();
  }

  applyTerritories(callback) {
    // logger.debug('applyTerritories');
    this.outputData.forEach((work, workIndex) => {
      // Create column headers
      const territoryCode = 'Territory 1 Music Maestro Code';
      const territoryName = 'Territory 1 Name';
      // Apply params
      work[territoryCode] = '';
      work[territoryName] = work.territory;
      // Apply the headers once only
      if (workIndex === 0) {
        this.applyHeaders(territoryCode, territoryName);
      }
      // Remove temp data param
      delete work.territory;
    });
    callback();
  }

  applyClients(callback) {
    // logger.debug('applyClients');
    this.outputData.forEach((work, workIndex) => {
      for (let i = 0; i < this.arraySizeCounters.clients; i += 1) {
        const p = i + 1;
        // Create column headers
        const clientCode = `Client ${p} Music Maestro Code`;
        const clientName = `Client ${p} Name`;
        const clientShare = `Client ${p} Share`;
        // Set default params
        let name = '';
        let share = '';
        // Fill in blanks where we have data
        if (work.clients && work.clients[i]) {
          name = work.clients[i].name;
          share = work.clients[i].percentage;
        }
        work[clientCode] = '';
        work[clientName] = name;
        work[clientShare] = share;
        // Apply the headers once only
        if (workIndex === 0) {
          this.applyHeaders(clientCode, clientName, clientShare);
        }
      }
      // Remove temp data param
      delete work.clients;
    });
    callback();
  }

  applyAltTitles(callback) {
    // logger.debug('applyAltTitles');
    this.outputData.forEach((work, workIndex) => {
      // logger.debug('>>>>>>' + work['Song Title']);
      // logger.debug(work);
      for (let i = 0; i < this.arraySizeCounters.altTitles; i += 1) {
        const p = i + 1;
        // Create column headers
        const akaCode = `AKA ${p} Music Maestro Code`;
        const akaTitle = `AKA ${p} Title`;
        // Set default params
        let title = '';
        // Fill in blanks where we have data
        if (work.altTitles && work.altTitles[i]) {
          title = work.altTitles[i];
        }
        // Fill cell whether we have data or default
        work[akaCode] = '';
        work[akaTitle] = title;
        // Apply the headers once only
        if (workIndex === 0) {
          this.applyHeaders(akaCode, akaTitle);
        }
      }
      // Remove temp data param
      delete work.altTitles; // why is this a problem
    });
    callback();
  }

  applyIPChains(callback) {
    // logger.debug('applyIPChains');
    this.outputData.forEach((work, workIndex) => {
      for (let chainIndex = 0; chainIndex < this.arraySizeCounters.chainIndex; chainIndex += 1) {
        for (let ipIndex = 0; ipIndex < this.arraySizeCounters.chainsArray[chainIndex]; ipIndex += 1) {
          // Set position markers for columns
          const ipNo = ipIndex + 1;
          const chainNo = chainIndex + 1;

          // Assign column headers
          const chainCode = `Chain ${chainNo} IP ${ipNo} Music Maestro Code`;
          const chainType = `Chain ${chainNo} IP ${ipNo} Type`;
          const chainName = `Chain ${chainNo} IP ${ipNo} Name`;
          const chainMO = `Chain ${chainNo} IP ${ipNo} MO Share`;
          const chainPO = `Chain ${chainNo} IP ${ipNo} PO Share`;
          const chainMC = `Chain ${chainNo} IP ${ipNo} MC Share`;
          const chainPC = `Chain ${chainNo} IP ${ipNo} PC Share`;
          const chainControl = `Chain ${chainNo} IP ${ipNo} Controlled`;
          const chainCAE = `Chain ${chainNo} IP ${ipNo} CAE No`;
          const chainCapacity = `Chain ${chainNo} IP ${ipNo} Capacity`;
          const chainAffiliation = `Chain ${chainNo} IP ${ipNo} Affiliation`;
          const chainMainPro = `Chain ${chainNo} IP ${ipNo} Main PRO`;
          const chainMainProIdentifier = `Chain ${chainNo} IP ${ipNo} Main PRO Identifier`;

          // Set default params
          let itemCode = '';
          let type = '';
          let name = '';
          let mo = '';
          let po = '';
          let mc = '';
          let pc = '';
          let control = '';
          let cae = '';
          let capacity = '';
          let affiliation = '';
          let mainPro = '';
          let mainProIdentifier = '';

          // Fill in blanks where we have data
          if (work.ipChains && work.ipChains[chainIndex] && work.ipChains[chainIndex][ipIndex]) {
            itemCode = work.ipChains[chainIndex][ipIndex].partyNo;
            type = work.ipChains[chainIndex][ipIndex].type;
            name = work.ipChains[chainIndex][ipIndex].name;
            mo = work.ipChains[chainIndex][ipIndex].moShare;
            po = work.ipChains[chainIndex][ipIndex].poShare;
            mc = work.ipChains[chainIndex][ipIndex].mcShare;
            pc = work.ipChains[chainIndex][ipIndex].pcShare;
            control = work.ipChains[chainIndex][ipIndex].controlled;
            cae = work.ipChains[chainIndex][ipIndex].cae;
            capacity = work.ipChains[chainIndex][ipIndex].capacity;
            affiliation = work.ipChains[chainIndex][ipIndex].affiliation;
            mainPro = work.ipChains[chainIndex][ipIndex].mainPro;
            mainProIdentifier = work.ipChains[chainIndex][ipIndex].mainProIdentifier;
          }

          // Fill cell whether we have data or default
          work[chainCode] = itemCode;
          work[chainType] = type;
          work[chainName] = name;
          work[chainMO] = mo;
          work[chainPO] = po;
          work[chainMC] = mc;
          work[chainPC] = pc;
          work[chainControl] = control;
          work[chainCAE] = cae;
          work[chainCapacity] = capacity;
          work[chainAffiliation] = affiliation;
          work[chainMainPro] = mainPro;
          work[chainMainProIdentifier] = mainProIdentifier;
          // Apply the headers once only
          if (workIndex === 0) {
            this.applyHeaders(chainCode, chainType, chainName, chainMO, chainPO, chainMC, chainPC, chainControl, chainCAE, chainCapacity, chainAffiliation, chainMainPro, chainMainProIdentifier);
          }
        }
      }
      // Remove temp data param
      delete work.ipChains;
    });
    callback();
  }
}

module.exports = CatShipment;
