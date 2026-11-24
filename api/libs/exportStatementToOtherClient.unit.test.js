const { testUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const config = require('../config.json');
const ImportXlsx = require('./importXlsx');
const Client = require('../models/client');
const Track = require('../models/track');
const Release = require('../models/release');
const Work = require('../models/work');
const Publisher = require('../models/publisher');
const Composer = require('../models/composer');
const Notification = require('../models/notification');
const SalesFile = require('../models/salesFile');
const Cost = require('../models/cost');

const exportStatementToOtherClient = require('./exportStatementToOtherClient');

// sinon `.yields(...)` equivalent: invoke the last (callback) arg.
const yields = (...yieldArgs) => (...args) => {
  const cb = args[args.length - 1];
  return cb(...yieldArgs);
};

// Build a { [id]: plainObject } dictionary from a list of model documents.
const createCatalogueDictionary = (catalogue) => {
  const dictionary = {};
  catalogue.forEach((cat) => {
    const catObj = cat.toObject();
    catObj._id = catObj._id.toString();
    dictionary[catObj._id] = catObj;
  });
  return dictionary;
};

// Assign a fresh _idNew to every entry in a catalogue dictionary.
const addNewIdToCatalogue = (catalogue) => {
  const catalogueWithNewId = catalogue;
  const catalogueIds = Object.values(catalogue).map((cat) => cat._id);
  catalogueIds.forEach((id) => {
    catalogueWithNewId[id]._idNew = testUtils.randomId();
  });
  return catalogueWithNewId;
};

describe('exportStatementToOtherClient Unit Tests', () => {
  let client;
  let statement;
  let targetClient;
  let curveUser;

  beforeEach((done) => {
    async.series([
      (cb) => {
        client = new Client({ name: testUtils.randomString(), _id: testUtils.randomId() });

        cb();
      },
      (cb) => {
        statement = {
          _id: testUtils.randomId(),
          clientId: testUtils.randomId(),
          contractId: testUtils.randomId(),
          name: testUtils.randomString(),
          costsCsv: testUtils.randomString(),
          salesCsv: testUtils.randomString(),
        };

        cb();
      },
      (cb) => {
        targetClient = {
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        };

        cb();
      },
      (cb) => {
        curveUser = {
          id: testUtils.randomId(),
          clientId: testUtils.randomId(),
        };

        cb();
      },
    ], done);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('exportStatementToOtherClient.exportStatement', () => {
    beforeEach((done) => {
      jest.spyOn(exportStatementToOtherClient, 'getCatalogue').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'createTracks').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'createWorksFromTracks').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'createReleases').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'getUsedComposersAndPublishers').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'getPublishers').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'getComposers').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'createPublishers').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'createComposers').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'createWorks').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'copySalesFile').mockImplementation(yields(null));
      jest.spyOn(exportStatementToOtherClient, 'copyCosts').mockImplementation(yields(null));
      jest.spyOn(Client, 'findById').mockResolvedValue();
      jest.spyOn(Notification, 'generate').mockImplementation(() => {});
      done();
    });

    it('exportStatementToOtherClient.catalogue should be defined as an object', (done) => {
      // Arrange
      const catalogue = {
        tracks: {},
        releases: {},
        works: {},
        composers: {},
        publishers: {},
      };
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.catalogue).toEqual(catalogue);
        done();
      });
    });

    it('exportStatementToOtherClient.catalogue.tracks should be defined as an object', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.catalogue.tracks).toEqual({});
        done();
      });
    });

    it('exportStatementToOtherClient.catalogue.releases should be defined as an object', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.catalogue.releases).toEqual({});
        done();
      });
    });

    it('exportStatementToOtherClient.catalogue.works should be defined as an object', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.catalogue.works).toEqual({});
        done();
      });
    });

    it('exportStatementToOtherClient.catalogue.composers should be defined as an object', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.catalogue.composers).toEqual({});
        done();
      });
    });

    it('exportStatementToOtherClient.catalogue.publishers should be defined as an object', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.catalogue.publishers).toEqual({});
        done();
      });
    });

    it('exportStatementToOtherClient.usedComposerIds should be defined as an empty array', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.usedComposerIds).toEqual([]);
        done();
      });
    });

    it('exportStatementToOtherClient.usedPublisherIds should be defined as an empty array', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.usedPublisherIds).toEqual([]);
        done();
      });
    });

    it('should call exportStatementToOtherClient.getCatalogue with the correct arguments', (done) => {
      // Arrange
      const { clientId } = statement;
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.getCatalogue).toHaveBeenCalledWith(statement, clientId, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.createTracks with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.createTracks).toHaveBeenCalledWith(targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    describe('when clientType is Publisher AND Statement Type is Mechanical', () => {
      it('should call exportStatementToOtherClient.createWorksFromTracks with the correct arguments', (done) => {
        // Arrange
        targetClient.clientType = 'Publisher';
        statement.periodType = 'Mechanical';
        // Act
        exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
          // Assert
          expect(exportStatementToOtherClient.createWorksFromTracks).toHaveBeenCalledWith(targetClient._id, curveUser.id, expect.any(Function));
          done();
        });
      });
    });

    describe('when clientType is Publisher AND Statement Type is NOT Mechanical', () => {
      it('should NOT call exportStatementToOtherClient.createWorksFromTracks with the correct arguments', (done) => {
        // Act
        exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
          // Assert
          expect(exportStatementToOtherClient.createWorksFromTracks).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('should call exportStatementToOtherClient.createReleases with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.createReleases).toHaveBeenCalledWith(targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.getUsedComposersAndPublishers with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.getUsedComposersAndPublishers).toHaveBeenCalledWith(expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.getPublishers with the correct arguments', (done) => {
      // Arrange
      const { clientId } = statement;
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.getPublishers).toHaveBeenCalledWith(clientId, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.getComposers with the correct arguments', (done) => {
      // Arrange
      const { clientId } = statement;
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.getComposers).toHaveBeenCalledWith(clientId, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.createPublishers with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.createPublishers).toHaveBeenCalledWith(targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.createComposers with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.createComposers).toHaveBeenCalledWith(targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.createWorks with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.createWorks).toHaveBeenCalledWith(targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.copySalesFile with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.copySalesFile).toHaveBeenCalledWith(statement, targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    it('should call exportStatementToOtherClient.copyCosts with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(exportStatementToOtherClient.copyCosts).toHaveBeenCalledWith(statement, targetClient._id, curveUser.id, expect.any(Function));
        done();
      });
    });

    it('should call Client.findById with the correct arguments', (done) => {
      // Act
      exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
        // Assert
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
        done();
      });
    });

    describe('when waterfall returns an error', () => {
      const callbackError = testUtils.randomString();
      beforeEach((done) => {
        exportStatementToOtherClient.copyCosts.mockImplementation(yields(callbackError));
        Client.findById.mockResolvedValue(client);
        done();
      });

      it('should call Notification.generate to send an Error notification to the user', (done) => {
        // Arrange
        const generateOptions = {
          identifier: 'genericError',
          curveUser,
          client,
          subject: 'Your Statement Export Has Errored',
          mainText: `Statement ${statement.name} export into client ${targetClient.name} has errored`,
          error: '',
          closingText: '',
        };
        // Act
        exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
          // Assert
          expect(Notification.generate).toHaveBeenCalledWith(generateOptions.subject, generateOptions.mainText, null, curveUser, generateOptions);
          done();
        });
      });
    });

    describe('when waterfall DOES NOT return an error', () => {
      beforeEach((done) => {
        Client.findById.mockResolvedValue(client);
        done();
      });

      it('should call Notification.generate to send a Completion notification to the user', (done) => {
        // Arrange
        const generateOptions = {
          identifier: 'genericComplete',
          curveUser,
          client,
          subject: 'Your Statement Export Has Completed',
          mainText: `Statement ${statement.name} has been exported into client ${targetClient.name}`,
        };
        // Act
        exportStatementToOtherClient.exportStatement(statement, targetClient, curveUser, true, () => {
          // Assert
          expect(Notification.generate).toHaveBeenCalledWith(generateOptions.subject, generateOptions.mainText, null, curveUser, generateOptions);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.getCatalogue', () => {
    const statement = {
      _id: testUtils.randomId(),
      clientId: testUtils.randomId(),
      contractId: testUtils.randomId(),
    };

    let track1;
    let track2;
    let release1;
    let release2;
    let work1;
    let work2;

    beforeEach((done) => {
      jest.spyOn(Track, 'find');
      jest.spyOn(Release, 'find');
      jest.spyOn(Work, 'find');

      track1 = new Track();
      track2 = new Track();
      const tracks = [track1, track2];

      release1 = new Release();
      release2 = new Release();
      const releases = [release1, release2];

      work1 = new Work();
      work2 = new Work();
      const works = [work1, work2];

      Track.find.mockResolvedValue(tracks);

      Release.find.mockResolvedValue(releases);

      Work.find.mockResolvedValue(works);

      exportStatementToOtherClient.catalogue = {
        tracks: {},
        releases: {},
        works: {},
        composers: {},
        publishers: {},
      };

      done();
    });

    it('should call Track.find with the correct arguments', (done) => {
      // Arrange
      const query = {
        clientId: statement.clientId,
        $or: [
          { 'salesReturnsRights.contractId': statement.contractId },
          { 'costsRights.contractId': statement.contractId },
          { mechanicalContractIds: statement.contractId },
        ],
      };
      // Act
      exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
        // Assert
        expect(Track.find).toHaveBeenCalledWith(query, expect.anything());
        done();
      });
    });

    describe('when Track.find returns an error', () => {
      const statement = {
        _id: testUtils.randomId(),
        clientId: testUtils.randomId(),
        contractId: testUtils.randomId(),
      };

      const callbackError = testUtils.randomString();
      beforeEach((done) => {
        Track.find.mockRejectedValue(callbackError);
        done();
      });

      it('should return the error to the callback', (done) => {
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, (err) => {
          // Assert
          expect(err.toString()).toBe(callbackError.toString());
          done();
        });
      });
    });

    describe('when no tracks are found for the clientId', () => {
      beforeEach((done) => {
        Track.find.mockResolvedValue([]);
        done();
      });

      it('exportStatementToOtherClient.catalogue.tracks should be an empty object', (done) => {
        // Arrange
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.tracks).toEqual({});
          done();
        });
      });
    });

    describe('when 1 track is found for the clientId', () => {
      beforeEach((done) => {
        Track.find.mockResolvedValue([track1]);
        done();
      });

      it('should convert the track to an object and add it to exportStatementToOtherClient.catalogue.tracks using the track id as the key', (done) => {
        // Arrange
        const formattedTrack = createCatalogueDictionary([track1]);
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.tracks).toEqual(formattedTrack);
          done();
        });
      });
    });

    describe('when 2 tracks are found for the clientId', () => {
      beforeEach((done) => {
        Track.find.mockResolvedValue([track1, track2]);
        done();
      });

      it('should convert the found tracks to an object and add them to exportStatementToOtherClient.catalogue.tracks using the track id as the key', (done) => {
        // Arrange
        const formattedTracks = createCatalogueDictionary([track1, track2]);
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.tracks).toEqual(formattedTracks);
          done();
        });
      });
    });

    it('should call Release.find with the correct arguments', (done) => {
      // Arrange
      const query = {
        clientId: statement.clientId,
        $or: [
          { 'salesReturnsRights.contractId': statement.contractId },
          { 'costsRights.contractId': statement.contractId },
          { mechanicalContractIds: statement.contractId },
        ],
      };
      // Act
      exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
        // Assert
        expect(Release.find).toHaveBeenCalledWith(query, expect.anything());
        done();
      });
    });

    describe('when Release.find returns an error', () => {
      const callbackError = testUtils.randomString();
      beforeEach((done) => {
        Release.find.mockRejectedValue(callbackError);
        done();
      });

      it('should return the error to the callback', (done) => {
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, (err) => {
          // Assert
          expect(err.toString()).toBe(callbackError.toString());
          done();
        });
      });
    });

    describe('when no releases are found for the clientId', () => {
      beforeEach((done) => {
        Release.find.mockResolvedValue([]);
        done();
      });

      it('exportStatementToOtherClient.catalogue.releases should be an empty object', (done) => {
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.releases).toEqual({});
          done();
        });
      });
    });

    describe('when 1 release is found for the clientId', () => {
      beforeEach((done) => {
        Release.find.mockResolvedValue([release1]);
        done();
      });

      it('should convert the release to an object and add it to exportStatementToOtherClient.catalogue.releases using the release id as the key', (done) => {
        // Arrange
        const formattedRelease = createCatalogueDictionary([release1]);
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.releases).toEqual(formattedRelease);
          done();
        });
      });
    });

    describe('when 2 releases are found for the clientId', () => {
      beforeEach((done) => {
        Release.find.mockResolvedValue([release1, release2]);
        done();
      });

      it('should convert the found releases to an object and add them to exportStatementToOtherClient.catalogue.releases using the release id as the key', (done) => {
        // Arrange
        const formattedRelease = createCatalogueDictionary([release1, release2]);
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.releases).toEqual(formattedRelease);
          done();
        });
      });
    });

    it('should call Work.find with the correct arguments', (done) => {
      // Arrange
      const query = {
        clientId: statement.clientId,
        $or: [
          { 'salesReturnsRights.contractId': statement.contractId },
          { 'costsRights.contractId': statement.contractId },
        ],
      };
      // Act
      exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
        // Assert
        expect(Work.find).toHaveBeenCalledWith(query, expect.anything());
        done();
      });
    });

    describe('when Work.find returns an error', () => {
      const callbackError = testUtils.randomString();
      beforeEach((done) => {
        Work.find.mockRejectedValue(callbackError);
        done();
      });

      it('should return the error to the callback', (done) => {
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clienId, (err) => {
          // Assert
          expect(err.toString()).toBe(callbackError.toString());
          done();
        });
      });
    });

    describe('when no works are found for the clientId', () => {
      beforeEach((done) => {
        Work.find.mockResolvedValue([]);
        done();
      });

      it('exportStatementToOtherClient.catalogue.works should be an empty object', (done) => {
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.works).toEqual({});
          done();
        });
      });
    });

    describe('when 1 work is found for the clientId', () => {
      beforeEach((done) => {
        Work.find.mockResolvedValue([work1]);
        done();
      });

      it('should convert the work to an object and add it to exportStatementToOtherClient.catalogue.works using the work id as the key', (done) => {
        // Arrange
        const formattedWork = createCatalogueDictionary([work1]);
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.works).toEqual(formattedWork);
          done();
        });
      });
    });

    describe('when 2 works are found for the clientId', () => {
      beforeEach((done) => {
        Work.find.mockResolvedValue([work1, work2]);
        done();
      });

      it('should convert the found works to an object and add them to exportStatementToOtherClient.catalogue.works using the work id as the key', (done) => {
        // Arrange
        const formattedWork = createCatalogueDictionary([work1, work2]);
        // Act
        exportStatementToOtherClient.getCatalogue(statement, statement.clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.works).toEqual(formattedWork);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.createTracks', () => {
    let newTrack;
    beforeEach((done) => {
      // Set up Track constructor
      jest.spyOn(Track, 'findById').mockResolvedValue();
      jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
        newTrack = this;
        return Promise.resolve(this);
      });
      done();
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 1 track that does NOT already exist on the client', () => {
      it('should create a new Track document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        const track1 = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(this);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1.toObject()],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newTrack._id).not.toBe(track1._id);
          expect(newTrack.clientId.toString()).toBe(targetClient._id);
          expect(newTrack.createdBy.toString()).toBe(curveUser.id);
          expect(newTrack.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newTrack.save to save the newly created Track', (done) => {
        // Arrange
        const track1 = new Track();
        const track2Id = testUtils.randomId();
        const track2 = new Track({ _id: track2Id });
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(track2);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          expect(Track.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should add the new track id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.tracks', (done) => {
        // Arrange
        const track1Id = testUtils.randomId();
        const trackName = testUtils.randomString();
        const tracks = {};
        const track1 = new Track({ _id: track1Id, name: trackName });
        tracks[track1._id.toString()] = track1.toObject();

        const createdTrack = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(createdTrack);
        });
        jest.spyOn(Track, 'findOne').mockResolvedValue();

        exportStatementToOtherClient.catalogue = {
          tracks,
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.tracks[track1Id]._idNew).toBe(createdTrack._id.toString());
          done();
        });
      });

      describe('when newTrack.save returns an error AND the error message DOES NOT include \'ISRC is required to be unique\'', () => {
        it('should NOT add the new track id as _idNew to the relevant exportStatementToOtherClient.catalogue.tracks', (done) => {
          // Arrange
          const trackDictionary = {};
          const track1Id = testUtils.randomId();
          const track1 = new Track({ _id: track1Id });
          const tracks = [track1];
          tracks.forEach((track) => {
            const trackObj = track.toObject();
            trackObj._id = trackObj._id.toString();
            trackDictionary[trackObj._id] = trackObj;
          });
          const errorMessage = new Error('Error');
          jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
            newTrack = this;
            return Promise.reject(errorMessage);
          });
          exportStatementToOtherClient.catalogue = {
            tracks: trackDictionary,
            releases: {},
            works: {},
            composers: {},
            publishers: {},
          };
          // Act
          exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
            // Assert
            expect(newTrack._id.toString()).not.toBe(exportStatementToOtherClient.catalogue.tracks[track1Id]._idNew);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 2 tracks that do NOT already exist on the client', () => {
      it('should call newTrack.save TWICE to save the newly created Tracks', (done) => {
        // Arrange
        const track1 = new Track();
        const track2 = new Track();
        const createdTrack = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(createdTrack);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1.toObject(), track2.toObject()],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Track.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 1 track that DOES already exist on the client', () => {
      let newTrack;
      const newISRC = testUtils.randomString();
      beforeEach((done) => {
        // Set up Track constructor
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          newTrack.isrc = newISRC;
          return Promise.resolve(this);
        });
        done();
      });

      it('should create a new Track document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        const track1 = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(newTrack);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1.toObject()],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newTrack._id).not.toBe(track1._id);
          expect(newTrack.clientId.toString()).toBe(targetClient._id);
          expect(newTrack.createdBy.toString()).toBe(curveUser.id);
          expect(newTrack.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newTrack.save to save the newly created Track', (done) => {
        // Arrange
        const track1 = new Track({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
          isrc: testUtils.randomString(),
        });
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(newTrack);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          expect(Track.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should call Track.findOne with the correct arguments to see if the track exists in DB and obtain the existing document', (done) => {
        // Arrange
        const callbackError = new Error('matches the ISRC on track');
        const track1 = new Track({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
          isrc: testUtils.randomString(),
        });

        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.reject(callbackError);
        });
        jest.spyOn(Track, 'findOne').mockResolvedValue();

        const tracks = {};
        tracks[track1._id.toString()] = track1.toObject();
        exportStatementToOtherClient.catalogue = {
          tracks,
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        const query = { clientId: targetClient._id, isrc: track1.isrc };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(Track.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the found track id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.tracks', (done) => {
        // Arrange
        const trackDictionary = {};
        const track1Id = testUtils.randomId();
        const track1 = new Track({ _id: [track1Id] });
        const tracks = [track1];
        tracks.forEach((track) => {
          const trackObj = track.toObject();
          trackObj._id = trackObj._id.toString();
          trackDictionary[trackObj._id] = trackObj;
        });
        const foundTrack = new Track();
        const errorMessage = new Error('matches the ISRC on track');
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Track, 'findOne').mockResolvedValue(foundTrack);
        exportStatementToOtherClient.catalogue = {
          tracks: trackDictionary,
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(foundTrack._id.toString()).toBe(exportStatementToOtherClient.catalogue.tracks[track1Id]._idNew);
          done();
        });
      });

      describe('when Track.findOne returns an error OR no track document is returned', () => {
        it('should NOT add the new track id as _idNew to the relevant exportStatementToOtherClient.catalogue.tracks', (done) => {
          // Arrange
          const trackDictionary = {};
          const track1Id = testUtils.randomId();
          const track1 = new Track({ _id: [track1Id] });
          const tracks = [track1];
          tracks.forEach((track) => {
            const trackObj = track.toObject();
            trackObj._id = trackObj._id.toString();
            trackDictionary[trackObj._id] = trackObj;
          });
          const foundTrack = new Track();
          const errorMessage = new Error('ISRC is required to be unique');
          jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
            newTrack = this;
            return Promise.reject(errorMessage);
          });
          jest.spyOn(Track, 'findOne').mockRejectedValue(new Error('Error'));
          exportStatementToOtherClient.catalogue = {
            tracks: trackDictionary,
            releases: {},
            works: {},
            composers: {},
            publishers: {},
          };
          // Act
          exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
            // Assert
            expect(foundTrack._id.toString()).not.toBe(exportStatementToOtherClient.catalogue.tracks[track1Id]._idNew);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 1 track that DOES already exist on the client AND 1 track that does NOT exist on the client', () => {
      it('should create two new Track documents with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        const track1 = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(newTrack);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1.toObject()],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newTrack._id).not.toBe(track1._id);
          expect(newTrack.clientId.toString()).toBe(targetClient._id);
          expect(newTrack.createdBy.toString()).toBe(curveUser.id);
          expect(newTrack.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newTrack.save TWICE to save the newly created Tracks', (done) => {
        // Arrange
        const track1 = new Track();
        const track2 = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(new Track());
        });
        exportStatementToOtherClient.catalogue = {
          tracks: [track1, track2],
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          expect(Track.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });

      it('should call Track.findOne with the correct arguments ONCE to see if the one track exists in DB and obtain the existing document', (done) => {
        // Arrange
        const track1 = new Track({ isrc: testUtils.randomString() });
        const track2 = new Track({ isrc: testUtils.randomString() });
        const saveError = new Error('matches the ISRC on track');
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.reject(saveError);
        });
        jest.spyOn(Track, 'findOne').mockResolvedValue(track1);
        exportStatementToOtherClient.catalogue = {
          tracks: createCatalogueDictionary([track1, track2]),
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        const query = { clientId: targetClient._id, isrc: track1.isrc };
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          expect(Track.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the new track id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.tracks for the track that does NOT already exist on the client', (done) => {
        // Arrange
        const track1Id = testUtils.randomId();
        const trackName = testUtils.randomString();
        const tracks = {};
        const track1 = new Track({ _id: track1Id, name: trackName });
        tracks[track1._id.toString()] = track1.toObject();

        const createdTrack = new Track();
        jest.spyOn(Track.prototype, 'save').mockImplementation(function () {
          newTrack = this;
          return Promise.resolve(createdTrack);
        });
        jest.spyOn(Track, 'findOne').mockResolvedValue();

        exportStatementToOtherClient.catalogue = {
          tracks,
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Act
        exportStatementToOtherClient.createTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.tracks[track1Id]._idNew).toBe(createdTrack._id.toString());
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.createWorksFromTracks', () => {
    let newWork; let track1; let tracks; let tracksWithNewIds; let work1;
    beforeEach((done) => {
      track1 = new Track({ title: testUtils.randomString() });
      // Set up Work constructor (mirrors the WorkMock from the original suite)
      jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
        newWork = this;
        return Promise.resolve(this);
      });
      jest.spyOn(Work, 'findOne').mockImplementation(() => true);

      tracks = createCatalogueDictionary([track1]);
      tracksWithNewIds = addNewIdToCatalogue(tracks);

      work1 = new Work();

      exportStatementToOtherClient.catalogue = {
        tracks: tracksWithNewIds,
        releases: {},
        works: [work1.toObject()],
        composers: {},
        publishers: {},
      };

      done();
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 1 track that does NOT already exist as a work on the client', () => {
      it('should call Work.findOne with the correct arguments', (done) => {
        // Arrange
        jest.spyOn(Work, 'findOne').mockResolvedValue();
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve();
        });
        const query = { clientId: targetClient._id, title: track1.title };
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      describe('when Work.findOne returns an error', () => {
        it('should NOT call newWork.save', (done) => {
          // Arrange
          jest.spyOn(Work, 'findOne').mockRejectedValue(new Error('Error'));
          jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
            newWork = this;
            return Promise.resolve();
          });
          // Act
          exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
            // Assert
            expect(Work.prototype.save).not.toHaveBeenCalled();
            done();
          });
        });
      });

      it('should create a new Work document with clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.clientId.toString()).toBe(targetClient._id);
          expect(newWork.createdBy.toString()).toBe(curveUser.id);
          expect(newWork.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should set the Work title to the Track name', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.title).toBe(track1.title);
          done();
        });
      });

      it('should add the Track isrc as an array item to newWork.aliases', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.aliases.includes(track1.isrc)).toBe(true);
          done();
        });
      });

      it('should add the Track artist as an array item to newWork.performers', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.performers.includes(track1.artist)).toBe(true);
          done();
        });
      });

      it('should add the Track id as an array item to newWork.trackIds', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track1.id]._idNew)).toBe(true);
          done();
        });
      });

      it('should call newWork.save to save the work', (done) => {
        // Arrange
        jest.spyOn(Work, 'findOne').mockResolvedValue();
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve();
        });
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      describe('when newWork.save returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          jest.spyOn(Work, 'findOne').mockResolvedValue();
          const error = new Error();
          jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
            newWork = this;
            return Promise.reject(error);
          });
          // Act
          exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, (err) => {
            // Assert
            expect(err.toString()).toBe(error.toString());
            done();
          });
        });
      });

      describe('when newWork.save DOES NOT return an error', () => {
        it('should return nothing to the callback', (done) => {
          // Arrange
          jest.spyOn(Work, 'findOne').mockResolvedValue();
          jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
            newWork = this;
            return Promise.resolve();
          });
          // Act
          exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, (err) => {
            // Assert
            expect(!!err).toBe(false);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 1 track that DOES already exist as a work on the client', () => {
      it('should call Work.findOne with the correct arguments', (done) => {
        // Arrange
        jest.spyOn(Work, 'findOne').mockResolvedValue();
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve();
        });
        const query = { clientId: targetClient._id, title: track1.title };
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should NOT call newWork.save', (done) => {
        // Arrange
        jest.spyOn(Work, 'findOne').mockRejectedValue(new Error('Error'));
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve();
        });
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.tracks contains 1 track that does NOT already exist as a work on the client AND one more track that does exist as a work', () => {
      let track1; let track2; let work1;
      beforeEach((done) => {
        track1 = new Track({ title: testUtils.randomString() });
        track2 = new Track({ title: testUtils.randomString() });
        tracks = createCatalogueDictionary([track1, track2]);
        tracksWithNewIds = addNewIdToCatalogue(tracks);

        work1 = new Work();

        exportStatementToOtherClient.catalogue = {
          tracks: tracksWithNewIds,
          releases: {},
          works: [work1.toObject()],
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should call Work.findOne TWICE with the correct arguments', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.findOne).toHaveBeenCalledTimes(2);
          done();
        });
      });

      it('should create ONLY ONE new Work document with clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        Work.findOne.mockResolvedValue();
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.clientId.toString()).toBe(targetClient._id);
          expect(newWork.createdBy.toString()).toBe(curveUser.id);
          expect(newWork.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should set the Work title to the Track name of Track 1', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.title).toBe(track2.title);
          done();
        });
      });

      it('should add the Track isrc of Track 1 as an array item to newWork.aliases', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.aliases.includes(track1.isrc)).toBe(true);
          done();
        });
      });

      it('should add the Track artist of Track 1 as an array item to newWork.performers', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.performers.includes(track1.artist)).toBe(true);
          done();
        });
      });

      it('should add the Track id of Track 1 as an array item to newWork.trackIds', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track2.id]._idNew)).toBe(true);
          done();
        });
      });

      it('should call newWork.save ONCE to save the work', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should return nothing to the callback', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        Work.findOne.mockResolvedValue();
        // Act
        exportStatementToOtherClient.createWorksFromTracks(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(err).toBe(null);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.createReleases', () => {
    let release1; let releases; let newRelease;
    beforeEach((done) => {
      // Set up Release constructor
      jest.spyOn(Release, 'findOne').mockResolvedValue();
      jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
        newRelease = this;
        return Promise.resolve(this);
      });

      release1 = new Release({ title: testUtils.randomString(), distributionChannel: testUtils.randomString() });
      releases = createCatalogueDictionary([release1]);
      exportStatementToOtherClient.catalogue = {
        tracks: {},
        releases,
        works: {},
        composers: {},
        publishers: {},
      };
      done();
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that does not already exist on the client', () => {
      it('should create a new Release document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease._id).not.toBe(release1._id);
          expect(newRelease.clientId.toString()).toBe(targetClient._id);
          expect(newRelease.createdBy.toString()).toBe(curveUser.id);
          expect(newRelease.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newRelease.save to save the newly created release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should add the new release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
        // Arrange
        const errorMessage = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue(release1);
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(release1._id.toString()).toBe(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew);
          done();
        });
      });

      describe('when newRelease.save returns an error AND the error message DOES NOT include \'Cat No is required to be unique under each Distribution Channel\' '
      + 'OR the error message includes \'Barcode is required to be unique under each Distribution Channel\' OR \'Aliases are required to be unique under each Distribution Channel\'', () => {
        it('should NOT add the new release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
          // Arrange
          const errorMessage = new Error('Random Error');
          jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
            newRelease = this;
            return Promise.reject(errorMessage);
          });
          jest.spyOn(Release, 'findOne').mockResolvedValue(release1);
          // Act
          exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
            // Assert
            expect(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew).toBe(undefined);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that does not already exist on the client with one track that was either newly created or found', () => {
      let track1; let tracks; let trackWithNewIds;
      beforeEach((done) => {
        track1 = new Track();
        tracks = createCatalogueDictionary([track1]);
        trackWithNewIds = addNewIdToCatalogue(tracks);

        releases[release1._id].trackIds = [track1._id];

        exportStatementToOtherClient.catalogue = {
          tracks: trackWithNewIds,
          releases,
          works: {},
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should add the newly created or found track id (_idNew property, if it exists) from exportStatementToOtherClient.catalogue.tracks to newRelease.trackIds for this release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease.trackIds.includes(tracks[track1._id]._idNew)).toBe(true);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that does not already exist on the client with 2 tracks that were either newly created or found', () => {
      let track1; let track2; let tracks; let trackWithNewIds;
      beforeEach((done) => {
        track1 = new Track();
        track2 = new Track();
        tracks = createCatalogueDictionary([track1, track2]);
        trackWithNewIds = addNewIdToCatalogue(tracks);

        releases[release1._id].trackIds = [track1._id, track2._id];

        exportStatementToOtherClient.catalogue = {
          tracks: trackWithNewIds,
          releases,
          works: {},
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should add the newly created or found track ids (_idNew property, if it exists) from exportStatementToOtherClient.catalogue.tracks to newRelease.trackIds for this release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track1._id]._idNew)).toBe(true);
          expect(newRelease.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track2._id]._idNew)).toBe(true);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that does not already exist on the client '
    + 'with one track that was either newly created or found AND one track that was not', () => {
      let track1; let track2; let tracks; let trackWithNewIds;
      beforeEach((done) => {
        track1 = new Track();
        track2 = new Track();
        tracks = createCatalogueDictionary([track1, track2]);
        trackWithNewIds = addNewIdToCatalogue(tracks);

        releases[release1._id].trackIds = [track1._id];

        exportStatementToOtherClient.catalogue = {
          tracks: trackWithNewIds,
          releases,
          works: {},
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should add the newly created or found track id (_idNew property, if it exists) from exportStatementToOtherClient.catalogue.tracks to newRelease.tracksIds for this release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease.trackIds.includes(tracks[track1._id]._idNew)).toBe(true);
          done();
        });
      });

      it('should NOT add the other track id from exportStatementToOtherClient.catalogue.tracks to newRelease.trackIds for this release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track1._id]._idNew)).toBe(true);
          expect(newRelease.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track2._id]._idNew)).toBe(false);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that does not already exist on the client with one track that was NOT either newly created or found', () => {
      let track1; let track2; let tracks; let trackWithNewIds;
      beforeEach((done) => {
        track1 = new Track();
        track2 = new Track();
        tracks = createCatalogueDictionary([track1, track2]);
        trackWithNewIds = addNewIdToCatalogue(tracks);

        exportStatementToOtherClient.catalogue = {
          tracks: trackWithNewIds,
          releases,
          works: {},
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should NOT add the track id from exportStatementToOtherClient.catalogue.tracks to newRelease.trackIds for this release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease.trackIds.includes(tracks[track1._id]._idNew)).toBe(false);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that '
    + 'DOES have the same Name, Cat No AND Distribution Channel as one that already exists on the target client', () => {
      it('should create a new Release document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease._id).not.toBe(release1._id);
          expect(newRelease.clientId.toString()).toBe(targetClient._id);
          expect(newRelease.createdBy.toString()).toBe(curveUser.id);
          expect(newRelease.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newRelease.save to save the newly created release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('newRelease.save should return an error AND the error message should include \'Cat No is required to be unique under each Distribution Channel\'', (done) => {
        // Arrange
        const saveError = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(saveError);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(Release.findOne).toHaveBeenCalled();
          done();
        });
      });

      it('should call Release.findOne with the correct arguments to see if the release exists in DB and obtain the existing document', (done) => {
        // Arrange
        const error = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(error);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();

        const query = { clientId: targetClient._id, catNo: release1.catNo, distributionChannel: release1.distributionChannel };
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the found release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
        // Arrange
        const release = new Release();
        const errorMessage = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue(release);
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(release._id.toString()).toBe(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew);
          done();
        });
      });

      describe('when Release.findOne returns an error OR no release document is returned', () => {
        it('should NOT add the new release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
          // Arrange
          const release = new Release();
          const errorMessage = new Error('Cat No is required to be unique under each Distribution Channel');
          jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
            newRelease = this;
            return Promise.reject(errorMessage);
          });
          jest.spyOn(Release, 'findOne').mockRejectedValue(new Error('Error'));
          // Act
          exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
            // Assert
            expect(release._id.toString()).not.toBe(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that '
    + 'DOES have the same Name, Cat No AND Distribution Channel as one that already exists on the target client AND 1 release that does NOT exist on the client', () => {
      let release1; let release2; let releases;
      beforeEach((done) => {
        release1 = new Release({ title: testUtils.randomString(), distributionChannel: testUtils.randomString() });
        release2 = new Release({ title: testUtils.randomString(), distributionChannel: testUtils.randomString() });
        releases = createCatalogueDictionary([release1, release2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases,
          works: {},
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should call newRelease.save TWICE to save the newly created Releases', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });

      it('should call Release.findOne with the correct arguments ONCE to see if the release exists in DB and obtain the existing document', (done) => {
        // Arrange
        const error = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(error);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();
        const query = { clientId: targetClient._id, catNo: release1.catNo, distributionChannel: release1.distributionChannel };
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should NOT add the new release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
        // Arrange
        const release = new Release();
        const errorMessage = new Error('Random Error');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue(release);
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew).toBe(undefined);
          done();
        });
      });

      it('should add the found release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
        // Arrange
        const release = new Release();
        const errorMessage = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue(release);
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(release._id.toString()).toBe(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that '
    + 'DOES have the same Name, Barcode AND Distribution Channel as one that already exists on the target client', () => {
      it('should create a new Release document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease._id).not.toBe(release1._id);
          expect(newRelease.clientId.toString()).toBe(targetClient._id);
          expect(newRelease.createdBy.toString()).toBe(curveUser.id);
          expect(newRelease.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newRelease.save to save the newly created release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('newRelease.save should return an error AND the error message should include \'Barcode is required to be unique under each Distribution Channel\'', (done) => {
        // Arrange
        const saveError = new Error('Barcode is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(saveError);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(Release.findOne).toHaveBeenCalled();
          done();
        });
      });

      it('should call Release.findOne with the correct arguments to see if the release exists in DB and obtain the existing document', (done) => {
        // Arrange
        const error = new Error('Barcode is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(error);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();
        const query = { clientId: targetClient._id, catNo: release1.catNo, distributionChannel: release1.distributionChannel };
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the found release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
        // Arrange
        const release = new Release();
        const errorMessage = new Error('Cat No is required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue(release);
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(release._id.toString()).toBe(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew);
          done();
        });
      });

      describe('when Release.findOne returns an error OR no release document is returned', () => {
        it('should NOT add the new release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
          // Arrange
          const release = new Release();
          const errorMessage = new Error('Random Error');
          jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
            newRelease = this;
            return Promise.reject(errorMessage);
          });
          jest.spyOn(Release, 'findOne').mockResolvedValue(release);
          // Act
          exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
            // Assert
            expect(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew).toBe(undefined);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.releases contains 1 release that '
    + 'DOES have the same Name, Alias AND Distribution Channel as one that already exists on the target client', () => {
      it('should create a new Release document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newRelease._id).not.toBe(release1._id);
          expect(newRelease.clientId.toString()).toBe(targetClient._id);
          expect(newRelease.createdBy.toString()).toBe(curveUser.id);
          expect(newRelease.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newRelease.save to save the newly created release', (done) => {
        // Arrange
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.resolve(newRelease);
        });
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('newRelease.save should return an error AND the error message should include \'Aliases are required to be unique under each Distribution Channel\'', (done) => {
        // Arrange
        const saveError = new Error('Aliases are required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(saveError);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(Release.findOne).toHaveBeenCalled();
          done();
        });
      });

      it('should call Release.findOne with the correct arguments to see if the release exists in DB and obtain the existing document', (done) => {
        // Arrange
        const error = new Error('Aliases are required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(error);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue();

        const query = { clientId: targetClient._id, catNo: release1.catNo, distributionChannel: release1.distributionChannel };
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Release.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the found release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
        // Arrange
        const release = new Release();
        const errorMessage = new Error('Aliases are required to be unique under each Distribution Channel');
        jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
          newRelease = this;
          return Promise.reject(errorMessage);
        });
        jest.spyOn(Release, 'findOne').mockResolvedValue(release);
        // Act
        exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
          // Assert
          expect(release._id.toString()).toBe(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew);
          done();
        });
      });

      describe('when Release.findOne returns an error OR no release document is returned', () => {
        it('should NOT add the new release id as _idNew to the relevant exportStatementToOtherClient.catalogue.releases', (done) => {
          // Arrange
          const release = new Release();
          const errorMessage = new Error('Random Error');
          jest.spyOn(Release.prototype, 'save').mockImplementation(function () {
            newRelease = this;
            return Promise.reject(errorMessage);
          });
          jest.spyOn(Release, 'findOne').mockResolvedValue(release);
          // Act
          exportStatementToOtherClient.createReleases(targetClient._id, curveUser.id, () => {
            // Assert
            expect(exportStatementToOtherClient.catalogue.releases[release1._id.toString()]._idNew).toBe(undefined);
            done();
          });
        });
      });
    });
  });

  describe('exportStatementToOtherClient.getUsedComposersAndPublishers', () => {
    let work1; let works; let composerIds;
    beforeEach((done) => {
      composerIds = testUtils.randomId();
      work1 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: [composerIds] });
      works = createCatalogueDictionary([work1]);
      exportStatementToOtherClient.catalogue = {
        tracks: {},
        releases: {},
        works,
        composers: {},
        publishers: {},
      };
      exportStatementToOtherClient.usedComposerIds = [];
      done();
    });

    describe('exportStatementToOtherClient.catalogue.works contains 1 work', () => {
      it('should add work.usedComposerIds to exportStatementToOtherClient.usedComposerIds', (done) => {
        // Assert
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          expect(exportStatementToOtherClient.usedComposerIds[0]).toBe(composerIds);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 1 work without any ids in work.usedComposerIds', () => {
      let work1; let works;
      beforeEach((done) => {
        work1 = new Work({ identifier: testUtils.randomInt() });
        works = createCatalogueDictionary([work1]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('exportStatementToOtherClient.usedComposerIds should be an empty Array', (done) => {
        // Assert
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          expect(exportStatementToOtherClient.usedComposerIds).toEqual([]);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 2 works, one without any ids in work.usedComposerIds AND one with 1 id', () => {
      let work1; let work2; let works; let composerIds;
      beforeEach((done) => {
        composerIds = testUtils.randomId();
        work1 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: [composerIds] });
        work2 = new Work({ identifier: testUtils.randomInt() });
        works = createCatalogueDictionary([work1, work2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('should add ONLY the one id from work2.usedComposerIds to exportStatementToOtherClient.usedComposerIds', (done) => {
        // Act
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          // Assert
          expect(exportStatementToOtherClient.usedComposerIds[0]).toEqual(composerIds);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 2 works', () => {
      let work1; let work2; let works; let composerId1; let composerId2;
      beforeEach((done) => {
        composerId1 = testUtils.randomId();
        composerId2 = testUtils.randomId();
        work1 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: [composerId1] });
        work2 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: [composerId2] });
        works = createCatalogueDictionary([work1, work2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('should add work1.usedComposerIds AND work2.usedComposerIds to exportStatementToOtherClient.usedComposerIds', (done) => {
        // Act
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          // Assert
          expect(exportStatementToOtherClient.usedComposerIds).toEqual([composerId1, composerId2]);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 2 works which contain duplicates in their usedComposerIds', () => {
      let work1; let work2; let works; let composerId1;
      beforeEach((done) => {
        composerId1 = [testUtils.randomId()];
        work1 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: composerId1 });
        work2 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: composerId1 });
        works = createCatalogueDictionary([work1, work2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('should add work1.usedComposerIds AND work2.usedComposerIds to exportStatementToOtherClient.usedComposerIds WITHOUT any duplication', (done) => {
        // Assert
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          expect(exportStatementToOtherClient.usedComposerIds).toEqual(composerId1);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 1 work without any ids in work.usedPublisherIds', () => {
      let work1; let works;
      beforeEach((done) => {
        work1 = new Work({ identifier: testUtils.randomInt() });
        works = createCatalogueDictionary([work1]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('exportStatementToOtherClient.usedPublisherIds should be an empty Array', (done) => {
        // Assert
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          expect(exportStatementToOtherClient.usedPublisherIds).toEqual([]);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 2 works, one without any ids in work.usedPublisherIds AND one with 1 id', () => {
      let work1; let work2; let works; let composerId2;
      beforeEach((done) => {
        composerId2 = testUtils.randomId();
        work1 = new Work({ identifier: testUtils.randomInt() });
        work2 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: [composerId2] });
        works = createCatalogueDictionary([work1, work2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('should add ONLY the one id from work2.usedPublisherIds to exportStatementToOtherClient.usedPublisherIds', (done) => {
        // Act
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          // Assert
          expect(exportStatementToOtherClient.usedComposerIds).toEqual([composerId2]);
          done();
        });
      });
    });

    describe('exportStatementToOtherClient.catalogue.works contains 2 works which contain duplicates in their usedPublisherIds', () => {
      let work1; let work2; let works; let composerId1;
      beforeEach((done) => {
        composerId1 = [testUtils.randomId()];
        work1 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: composerId1 });
        work2 = new Work({ identifier: testUtils.randomInt(), usedComposerIds: composerId1 });
        works = createCatalogueDictionary([work1, work2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        exportStatementToOtherClient.usedComposerIds = [];
        done();
      });

      it('should add work1.usedPublisherIds AND work2.usedPublisherIds to exportStatementToOtherClient.usedPublisherIds WITHOUT any duplication', (done) => {
        // Assert
        exportStatementToOtherClient.getUsedComposersAndPublishers(() => {
          expect(exportStatementToOtherClient.usedComposerIds).toEqual(composerId1);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.getPublishers', () => {
    const clientId = testUtils.randomId();
    beforeEach((done) => {
      jest.spyOn(Publisher, 'find');
      done();
    });

    it('should call Publisher.find with the correct attributes', (done) => {
      // Arrange
      const randomPublisherIds = [testUtils.randomId()];
      exportStatementToOtherClient.usedPublisherIds = [randomPublisherIds[0]];
      const publishers = [];
      Publisher.find.mockResolvedValue(publishers);
      const query = { clientId, _id: { $in: exportStatementToOtherClient.usedPublisherIds } };
      // Assert
      exportStatementToOtherClient.getPublishers(clientId, () => {
        expect(Publisher.find).toHaveBeenCalledWith(query, expect.anything());
        done();
      });
    });

    describe('when Publisher.find returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const clientId = testUtils.randomId();
        const callbackError = testUtils.randomString();
        Publisher.find.mockRejectedValue(callbackError);
        // Assert
        exportStatementToOtherClient.getPublishers(clientId, (err) => {
          expect(err.toString()).toBe(callbackError.toString());
          done();
        });
      });
    });

    describe('when no publishers are found for the clientId', () => {
      it('exportStatementToOtherClient.catalogue.publishers should be an empty object', (done) => {
        // Arrange
        const publishers = [];
        Publisher.find.mockResolvedValue(publishers);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Assert
        exportStatementToOtherClient.getPublishers(clientId, () => {
          expect(exportStatementToOtherClient.catalogue.publishers).toEqual({});
          done();
        });
      });
    });

    describe('when 1 publisher is found for the clientId', () => {
      let pub1; let publishers; let foundPublishers;
      beforeEach((done) => {
        pub1 = new Publisher();
        publishers = createCatalogueDictionary([pub1]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers,
        };
        foundPublishers = [pub1];
        Publisher.find.mockResolvedValue(foundPublishers);
        done();
      });

      it('should convert the publisher to an object and add it to exportStatementToOtherClient.catalogue.publishers using the publisher id as the key', (done) => {
        // Act
        exportStatementToOtherClient.getPublishers(clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.publishers).toEqual(publishers);
          done();
        });
      });
    });

    describe('when 2 publishers are found for the clientId', () => {
      let pub1; let pub2; let publishers; let foundPublishers;
      beforeEach((done) => {
        pub1 = new Publisher();
        pub2 = new Publisher();
        publishers = createCatalogueDictionary([pub1, pub2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers,
        };
        foundPublishers = [pub1];
        Publisher.find.mockResolvedValue(foundPublishers);
        done();
      });

      it('should convert the found publishers to an object and add them to exportStatementToOtherClient.catalogue.publishers using the publisher id as the key', (done) => {
        // Act
        exportStatementToOtherClient.getPublishers(clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.publishers).toEqual(publishers);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.getComposers', () => {
    const clientId = testUtils.randomId();
    beforeEach((done) => {
      jest.spyOn(Composer, 'find');
      done();
    });

    it('should call Composer.find with the correct attributes', (done) => {
      // Arrange
      const randomComposerIds = [testUtils.randomId()];
      exportStatementToOtherClient.usedComposerIds = [randomComposerIds[0]];
      const composers = [];
      Composer.find.mockResolvedValue(composers);
      const query = { clientId, _id: { $in: exportStatementToOtherClient.usedComposerIds } };
      // Assert
      exportStatementToOtherClient.getComposers(clientId, () => {
        expect(Composer.find).toHaveBeenCalledWith(query, expect.anything());
        done();
      });
    });

    describe('when Composer.find returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const clientId = testUtils.randomId();
        const callbackError = testUtils.randomString();
        Composer.find.mockRejectedValue(callbackError);
        // Assert
        exportStatementToOtherClient.getComposers(clientId, (err) => {
          expect(err.toString()).toBe(callbackError.toString());
          done();
        });
      });
    });

    describe('when no composers are found for the clientId', () => {
      it('exportStatementToOtherClient.catalogue.composers should be an empty object', (done) => {
        // Arrange});
        const composers = [];
        Composer.find.mockResolvedValue(composers);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers: {},
        };
        // Assert
        exportStatementToOtherClient.getComposers(clientId, () => {
          expect(exportStatementToOtherClient.catalogue.composers).toEqual({});
          done();
        });
      });
    });

    describe('when 1 composer is found for the clientId', () => {
      let comp1; let composers; let foundComposers;
      beforeEach((done) => {
        comp1 = new Composer();
        composers = createCatalogueDictionary([comp1]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers,
          publishers: {},
        };
        foundComposers = [comp1];
        Composer.find.mockResolvedValue(foundComposers);
        done();
      });

      it('should convert the composer to an object and add it to exportStatementToOtherClient.catalogue.composers using the composer id as the key', (done) => {
        // Act
        exportStatementToOtherClient.getComposers(clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.composers).toEqual(composers);
          done();
        });
      });
    });

    describe('when 2 composers are found for the clientId', () => {
      let comp1; let comp2; let composers; let foundComposers;
      beforeEach((done) => {
        comp1 = new Composer();
        comp2 = new Composer();
        composers = createCatalogueDictionary([comp1, comp2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers,
          publishers: {},
        };
        foundComposers = [comp1, comp2];
        Composer.find.mockResolvedValue(foundComposers);
        done();
      });

      it('should convert the found composers to an object and add them to exportStatementToOtherClient.catalogue.composers using the composer id as the key', (done) => {
        // Act
        exportStatementToOtherClient.getComposers(clientId, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.composers).toEqual(composers);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.createPublishers', () => {
    let pub1; let publishers; let newPublisher;
    beforeEach((done) => {
      // Set up Publisher constructor
      jest.spyOn(Publisher, 'findById').mockResolvedValue();
      jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
        newPublisher = this;
        return Promise.resolve(this);
      });

      pub1 = new Publisher();
      publishers = createCatalogueDictionary([pub1]);
      exportStatementToOtherClient.catalogue = {
        tracks: {},
        releases: {},
        works: {},
        composers: {},
        publishers,
      };
      done();
    });

    describe('when exportStatementToOtherClient.catalogue.publishers contains 1 publisher that does NOT already exist on the client', () => {
      it('should create a new Publisher document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(newPublisher);
        });
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newPublisher._id).not.toBe(pub1._id);
          expect(newPublisher.clientId.toString()).toBe(targetClient._id);
          expect(newPublisher.createdBy.toString()).toBe(curveUser.id);
          expect(newPublisher.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newPublisher.save to save the newly created Publisher', (done) => {
        // Arrange
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(this);
        });
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Publisher.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should add the new publisher id as _idNew to the relevant exportStatementToOtherClient.catalogue.publishers', (done) => {
        // Arrange
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(this);
        });
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newPublisher._id.toString()).toBe(exportStatementToOtherClient.catalogue.publishers[pub1._id]._idNew);
          done();
        });
      });

      describe('when newPublisher.save returns an error AND the error message DOES NOT includes \'Name is required to be unique\'', () => {
        it('should NOT add the new publisher id as _idNew to the relevant exportStatementToOtherClient.catalogue.publishers', (done) => {
          // Arrange
          const callbackError = new Error();
          jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
            newPublisher = this;
            return Promise.reject(callbackError);
          });
          // Act
          exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
            // Assert
            expect(newPublisher._id.toString()).not.toBe(exportStatementToOtherClient.catalogue.publishers[pub1._id]._idNew);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.publishers contains 2 publishers that do NOT already exist on the client', () => {
      it('should call newPublisher.save TWICE to save the newly created Publishers', (done) => {
        // Arrange
        const pub1 = new Publisher();
        const pub2 = new Publisher();
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(newPublisher);
        });
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers: [pub1.toObject(), pub2.toObject()],
        };
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Publisher.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.publishers contains 1 publisher that DOES already exist on the client', () => {
      let pub1; let publishers;
      beforeEach((done) => {
        pub1 = new Publisher();
        publishers = createCatalogueDictionary([pub1]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers: {},
          publishers,
        };
        done();
      });

      it('should create a new Publisher document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(newPublisher);
        });
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newPublisher._id).not.toBe(pub1._id);
          expect(newPublisher.clientId.toString()).toBe(targetClient._id);
          expect(newPublisher.createdBy.toString()).toBe(curveUser.id);
          expect(newPublisher.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newPublisher.save to save the newly created Publisher', (done) => {
        // Arrange
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(newPublisher);
        });
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Publisher.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('newPublisher.save should return an error AND the error message should include \'Name is required to be unique\'', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.reject(callbackError);
        });
        jest.spyOn(Publisher, 'findOne').mockResolvedValue();
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Publisher.findOne).toHaveBeenCalled();
          done();
        });
      });

      it('should call Publisher.findOne with the correct arguments to see if the publisher exists in DB and obtain the existing document', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.reject(callbackError);
        });
        jest.spyOn(Publisher, 'findOne').mockResolvedValue();
        const query = { clientId: targetClient._id, name: pub1.name };
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Publisher.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the found publisher id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.publishers', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.reject(callbackError);
        });
        const foundPublisher = new Publisher();
        jest.spyOn(Publisher, 'findOne').mockResolvedValue(foundPublisher);
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.publishers[pub1._id]._idNew).toBe(foundPublisher._id.toString());
          done();
        });
      });

      describe('when Publisher.findOne returns an error OR no publisher document is returned', () => {
        it('should NOT add the new publisher id as _idNew to the relevant exportStatementToOtherClient.catalogue.publishers', (done) => {
          // Arrange
          const callbackError = new Error('Name is required to be unique');
          jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
            newPublisher = this;
            return Promise.reject(callbackError);
          });
          const foundPublisher = new Publisher();
          const findOneError = testUtils.randomString();
          jest.spyOn(Publisher, 'findOne').mockRejectedValue(findOneError);
          // Act
          exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
            // Assert
            expect(exportStatementToOtherClient.catalogue.publishers[pub1._id]._idNew).not.toBe(foundPublisher._id.toString());
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.publishers contains 1 publisher that DOES already exist on the client AND 1 publisher that does NOT exist on the client', () => {
      let newPublisher;
      beforeEach((done) => {
        newPublisher = new Publisher();
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.resolve(newPublisher);
        });
        done();
      });

      it('should call newPublisher.save TWICE to save the newly created Publishers', (done) => {
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Publisher.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      describe('When 1 Publisher is found', () => {
        it('should call Publisher.findOne with the correct arguments ONCE to see if the one publisher exists in DB and obtain the existing document', (done) => {
          // Arrange
          const callbackError = new Error('Name is required to be unique');
          jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
            newPublisher = this;
            return Promise.reject(callbackError);
          });
          jest.spyOn(Publisher, 'findOne').mockResolvedValue();
          const query = { clientId: targetClient._id, name: pub1.name };
          // Act
          exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
            // Assert
            expect(Publisher.findOne).toHaveBeenCalledWith(query, expect.anything());
            done();
          });
        });
      });

      it('should add the new publisher id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.publishers for the publisher that does NOT already exist on the client', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.reject(callbackError);
        });
        const foundPublisher = new Publisher();
        const findOneError = testUtils.randomString();
        jest.spyOn(Publisher, 'findOne').mockRejectedValue(findOneError);
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.publishers[pub1._id]._idNew).not.toBe(foundPublisher._id.toString());
          done();
        });
      });

      it('should add the found publisher id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.publishers for the publisher which already exists on the client', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Publisher.prototype, 'save').mockImplementation(function () {
          newPublisher = this;
          return Promise.reject(callbackError);
        });
        const foundPublisher = new Publisher();
        const findOneError = testUtils.randomString();
        jest.spyOn(Publisher, 'findOne').mockRejectedValue(findOneError);
        // Act
        exportStatementToOtherClient.createPublishers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.publishers[pub1._id]._idNew).not.toBe(foundPublisher._id.toString());
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.createComposers', () => {
    let comp1; let composers; let newComposer;
    beforeEach((done) => {
      // Set up Composer constructor
      jest.spyOn(Composer, 'findById').mockResolvedValue();
      jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
        newComposer = this;
        return Promise.resolve(this);
      });

      comp1 = new Composer();
      composers = createCatalogueDictionary([comp1]);
      exportStatementToOtherClient.catalogue = {
        tracks: {},
        releases: {},
        works: {},
        composers,
        publishers: {},
      };
      done();
    });

    describe('when exportStatementToOtherClient.catalogue.composers contains 1 composer that does NOT already exist on the client', () => {
      it('should create a new Composer document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(this);
        });
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newComposer._id).not.toBe(comp1._id);
          expect(newComposer.clientId.toString()).toBe(targetClient._id);
          expect(newComposer.createdBy.toString()).toBe(curveUser.id);
          expect(newComposer.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newComposer.save to save the newly created Composer', (done) => {
        // Arrange
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(this);
        });
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Composer.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should add the new composer id as _idNew to the relevant exportStatementToOtherClient.catalogue.composers', (done) => {
        // Arrange
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(this);
        });
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newComposer._id.toString()).toBe(exportStatementToOtherClient.catalogue.composers[comp1._id]._idNew);
          done();
        });
      });

      describe('when newComposer.save returns an error AND the error message DOES NOT includes \'Name is required to be unique\'', () => {
        it('should NOT add the new composer id as _idNew to the relevant exportStatementToOtherClient.catalogue.composers', (done) => {
          // Arrange
          jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
            newComposer = this;
            return Promise.reject(new Error('callbackError'));
          });
          // Act
          exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
            // Assert
            expect(newComposer._id.toString()).not.toBe(exportStatementToOtherClient.catalogue.composers[comp1._id]._idNew);
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.composers contains 2 composers that do NOT already exist on the client', () => {
      let comp1; let comp2; let composers; let newComposer;
      beforeEach((done) => {
        newComposer = new Composer();
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(newComposer);
        });

        comp1 = new Composer();
        comp2 = new Composer();
        composers = createCatalogueDictionary([comp1, comp2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers,
          publishers: {},
        };
        done();
      });

      it('should call newComposer.save TWICE to save the newly created Composers', (done) => {
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Composer.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.composers contains 1 composer that DOES already exist on the client', () => {
      it('should create a new Composer document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(newComposer);
        });
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newComposer._id).not.toBe(comp1._id);
          expect(newComposer.clientId.toString()).toBe(targetClient._id);
          expect(newComposer.createdBy.toString()).toBe(curveUser.id);
          expect(newComposer.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newComposer.save to save the newly created Composer', (done) => {
        // Arrange
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(newComposer);
        });
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Composer.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should call Composer.findOne with the correct arguments to see if the composer exists in DB and obtain the existing document', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.reject(callbackError);
        });
        jest.spyOn(Composer, 'findOne').mockResolvedValue();
        const query = { clientId: targetClient._id, name: comp1.name };
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Composer.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the found composer id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.composers', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.reject(callbackError);
        });
        const foundComposer = new Composer();
        jest.spyOn(Composer, 'findOne').mockResolvedValue(foundComposer);
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.composers[comp1._id]._idNew).toBe(foundComposer._id.toString());
          done();
        });
      });

      describe('when Composer.findOne returns an error OR no composer document is returned', () => {
        it('should NOT add the new composer id as _idNew to the relevant exportStatementToOtherClient.catalogue.composers', (done) => {
          // Arrange
          const callbackError = new Error('Name is required to be unique');
          jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
            newComposer = this;
            return Promise.reject(callbackError);
          });
          const foundComposer = new Composer();
          const findOneError = testUtils.randomString();
          jest.spyOn(Composer, 'findOne').mockRejectedValue(findOneError);
          // Act
          exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
            // Assert
            expect(exportStatementToOtherClient.catalogue.composers[comp1._id]._idNew).not.toBe(foundComposer._id.toString());
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.composers contains 1 composer that DOES already exist on the client AND 1 composer that does NOT exist on the client', () => {
      let comp1; let comp2; let composers; let newComposer;
      beforeEach((done) => {
        newComposer = new Composer();
        jest.spyOn(Composer.prototype, 'save').mockImplementation(() => {});
        jest.spyOn(Composer, 'findOne').mockImplementation(() => {});

        comp1 = new Composer();
        comp2 = new Composer();
        composers = createCatalogueDictionary([comp1, comp2]);
        exportStatementToOtherClient.catalogue = {
          tracks: {},
          releases: {},
          works: {},
          composers,
          publishers: {},
        };
        done();
      });

      it('should call newComposer.save TWICE to save the newly created Composers', (done) => {
        // Arrange
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.resolve(newComposer);
        });
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Composer.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });

      it('should call Composer.findOne with the correct arguments ONCE to see if the one composer exists in DB and obtain the existing document', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.reject(callbackError);
        });
        Composer.findOne.mockResolvedValue();
        const query = { clientId: targetClient._id, name: comp1.name };
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Composer.findOne).toHaveBeenCalledWith(query, expect.anything());
          done();
        });
      });

      it('should add the new composer id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.composers for the composer that does NOT already exist on the client', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.reject(callbackError);
        });
        const foundComposer = new Composer();
        const findOneError = testUtils.randomString();
        Composer.findOne.mockRejectedValue(findOneError);
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.composers[comp1._id]._idNew).not.toBe(foundComposer._id.toString());
          done();
        });
      });

      it('should add the found composer id as _idNew to the relevant key in exportStatementToOtherClient.catalogue.composers for the composer which already exists on the client', (done) => {
        // Arrange
        const callbackError = new Error('Name is required to be unique');
        jest.spyOn(Composer.prototype, 'save').mockImplementation(function () {
          newComposer = this;
          return Promise.reject(callbackError);
        });
        const foundComposer = new Composer();
        const findOneError = testUtils.randomString();
        Composer.findOne.mockRejectedValue(findOneError);
        // Act
        exportStatementToOtherClient.createComposers(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.catalogue.composers[comp1._id]._idNew).not.toBe(foundComposer._id.toString());
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.createWorks', () => {
    let work1; let works; let newWork; let track1; let tracks;
    beforeEach((done) => {
      // Set up Work constructor
      jest.spyOn(Work, 'findById').mockResolvedValue();
      jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
        newWork = this;
        return Promise.resolve(this);
      });

      track1 = new Track();
      tracks = createCatalogueDictionary([track1]);
      tracks[track1._id]._idNew = testUtils.randomId();

      work1 = new Work();
      works = createCatalogueDictionary([work1]);
      works[work1._id].trackIds = [track1._id];

      exportStatementToOtherClient.catalogue = {
        tracks,
        releases: {},
        works,
        composers: {},
        publishers: {},
      };
      done();
    });

    describe('when exportStatementToOtherClient.catalogue.works contains 1 work that does NOT already exist on the client', () => {
      it('should create a new Work document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork._id).not.toBe(work1._id);
          expect(newWork.clientId.toString()).toBe(targetClient._id);
          expect(newWork.createdBy.toString()).toBe(curveUser.id);
          expect(newWork.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should add only the newly created or found track ids (_idNew property, if it exists) from exportStatementToOtherClient.catalogue.tracks to newWork.trackIds for this work', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork.trackIds.includes(tracks[track1._id]._idNew)).toBe(true);
          done();
        });
      });

      it('should call exportStatementToOtherClient.replaceComposerAndPublisherInChain with the copied rights chain passed as the argument and assign the return of this to newWork.rightsChain', (done) => {
        // Arrange
        jest.spyOn(exportStatementToOtherClient, 'replaceComposerAndPublisherInChain');
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(exportStatementToOtherClient.replaceComposerAndPublisherInChain).toHaveBeenCalledWith([]);
          done();
        });
      });

      it('should call newWork.save to save the newly created Work', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      describe('when newWork.save returns an error AND the error message '
        + 'DOES NOT include \'Identifier is required to be unique\' OR \'Tunecode is required to be unique\' OR \'ISWC is required to be unique\'', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const callbackError = new Error();
          jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
            newWork = this;
            return Promise.reject(callbackError);
          });
          // Act
          exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, (err) => {
            // Assert
            expect(err.toString()).toBe(callbackError.toString());
            done();
          });
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.works contains 2 works that do NOT already exist on the client', () => {
      let work1; let work2; let works; let newWork;
      beforeEach((done) => {
        newWork = new Work();
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });

        work1 = new Work();
        work2 = new Work();
        works = createCatalogueDictionary([work1, work2]);
        works[work1._id].trackIds = [track1._id];

        exportStatementToOtherClient.catalogue = {
          tracks,
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should call newWork.save TWICE to save the newly created Works', (done) => {
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.works contains 1 work that DOES have the same Identifier as one that already exists on the target client', () => {
      let work1; let works;
      beforeEach((done) => {
        work1 = new Work();
        works = createCatalogueDictionary([work1]);

        exportStatementToOtherClient.catalogue = {
          tracks,
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should create a new Work document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork._id).not.toBe(work1._id);
          expect(newWork.clientId.toString()).toBe(targetClient._id);
          expect(newWork.createdBy.toString()).toBe(curveUser.id);
          expect(newWork.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newWork.save to save the newly created Work', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalled();
          done();
        });
      });

      it('should not return an error', (done) => {
        // Arrange
        const message = 'Identifier is required to be unique';
        const callbackError = new Error(message);
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.reject(callbackError);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(err).toBe(null);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.works contains 1 work that DOES have the same Identifier as one that already exists on the target client '
      + 'AND 1 work that does NOT have the same Identifier as one that already exists on the target client', () => {
      let work1; let work2; let works; let newWork;
      beforeEach((done) => {
        newWork = new Work();
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });

        work1 = new Work();
        work2 = new Work();
        works = createCatalogueDictionary([work1, work2]);
        works[work1._id].trackIds = [track1._id];

        exportStatementToOtherClient.catalogue = {
          tracks,
          releases: {},
          works,
          composers: {},
          publishers: {},
        };
        done();
      });

      it('should call newWork.save TWICE to save the newly created Works', (done) => {
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalledTimes(2);
          done();
        });
      });

      it('should return no error', (done) => {
        // Arrange
        const message = 'Identifier is required to be unique';
        const callbackError = new Error(message);
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.reject(callbackError);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(err).toBe(null);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.works contains 1 work that DOES have the same Tunecode as one that already exists on the target client', () => {
      it('should create a new Work document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork._id).not.toBe(work1._id);
          expect(newWork.clientId.toString()).toBe(targetClient._id);
          expect(newWork.createdBy.toString()).toBe(curveUser.id);
          expect(newWork.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newWork.save to save the newly created Work', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalledTimes(1);
          done();
        });
      });

      it('should return no error', (done) => {
        // Arrange
        const error = new Error('Tunecode is required to be unique');
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.reject(error);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(err).toBe(null);
          done();
        });
      });
    });

    describe('when exportStatementToOtherClient.catalogue.works contains 1 work that DOES have the same ISWC as one that already exists on the target client', () => {
      it('should create a new Work document with _id removed AND clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(newWork._id).not.toBe(work1._id);
          expect(newWork.clientId.toString()).toBe(targetClient._id);
          expect(newWork.createdBy.toString()).toBe(curveUser.id);
          expect(newWork.lastModifiedBy.toString()).toBe(curveUser.id);
          done();
        });
      });

      it('should call newWork.save to save the newly created Work', (done) => {
        // Arrange
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.resolve(newWork);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, () => {
          // Assert
          expect(Work.prototype.save).toHaveBeenCalledTimes(1);
          done();
        });
      });

      it('should return no error', (done) => {
        const error = new Error('ISWC is required to be unique');
        jest.spyOn(Work.prototype, 'save').mockImplementation(function () {
          newWork = this;
          return Promise.reject(error);
        });
        // Act
        exportStatementToOtherClient.createWorks(targetClient._id, curveUser.id, (err) => {
          // Assert
          expect(err).toBe(null);
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.copySalesFile', () => {
    describe('when statement.salesCsv exists', () => {
      let newSalesFile;

      beforeEach((done) => {
        // Set up SalesFile constructor
        const sourceKey = statement.salesCsv;
        const fileName = sourceKey.substr(sourceKey.lastIndexOf('/') + 1);
        const salesFileName = fileName.substr(0, fileName.lastIndexOf('.'));

        jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
          newSalesFile = this;
          newSalesFile.name = salesFileName;
          return Promise.resolve(this);
        });
        done();
      });

      it('should create a new SalesFile document with name, clientId, createdBy, lastModifiedBy added', (done) => {
        // Arrange
        jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
        jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
        jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
          newSalesFile = this;
          return Promise.resolve();
        });

        const sourceKey = statement.salesCsv;
        const fileName = sourceKey.substr(sourceKey.lastIndexOf('/') + 1);
        const name = fileName.substr(0, fileName.lastIndexOf('.'));
        const salesFile1 = new SalesFile({
          name,
          createdBy: curveUser.id,
          lastModifiedBy: curveUser.id,
          clientId: targetClient._id,
        });
        // Act
        exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(newSalesFile.name).toBe(salesFile1.name);
          expect(newSalesFile.clientId).toBe(salesFile1.clientId);
          expect(newSalesFile.createdBy.toString()).toBe(salesFile1.createdBy.toString());
          expect(newSalesFile.lastModifiedBy.toString()).toBe(salesFile1.lastModifiedBy.toString());
          done();
        });
      });

      describe('when contract type is Profit Share', () => {
        it('should set salesFile.overwriteFields.multiplier to the profit share percentage', (done) => {
          // Arrange
          jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
            newSalesFile = this;
            return Promise.resolve();
          });

          statement.contractType = 'Profit Share';
          statement.profitShareRate = testUtils.randomInt();
          const statementMultiplier = statement.profitShareRate / 100;
          // Act
          exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(newSalesFile.overwriteFields.multiplier).toBe(statementMultiplier);
            done();
          });
        });
      });

      describe('when contract type is NOT Profit Share', () => {
        it('salesFile.overwriteFields.multiplier should be undefined', (done) => {
          // Arrange
          jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
            newSalesFile = this;
            return Promise.resolve();
          });

          statement.contractType = 'Royalty';
          // Act
          exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(newSalesFile.overwriteFields.multiplier).toBe(undefined);
            done();
          });
        });
      });

      it('should call fileManager.copyS3File to copy the S3 file to a new bucket key', (done) => {
        // Arrange
        jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
        jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
        jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
          newSalesFile = this;
          return Promise.resolve();
        });

        // Act
        exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(fileManager.copyS3File).toHaveBeenCalled();
          done();
        });
      });

      describe('when fileManager.copyS3File returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const callbackError = new Error();
          jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(callbackError));
          jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
            newSalesFile = this;
            return Promise.resolve();
          });

          // Act
          exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, (err) => {
            // Assert
            expect(err.toString()).toBe(callbackError.toString());
            done();
          });
        });
      });

      describe('when fileManager.copyS3File DOES NOT return an error', () => {
        it('should assign the destination key to the salesFile', (done) => {
          // Arrange
          jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
          // Act
          exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, (err) => {
            // Assert
            const sourceKey = statement.salesCsv;
            const fileName = sourceKey.substr(sourceKey.lastIndexOf('/') + 1);
            const destKey = `salesFiles/${newSalesFile._id.toString()}/${fileName}`;

            expect(newSalesFile.file).toBe(destKey);
            done();
          });
        });

        it('should call salesFile.save to save the sales file', (done) => {
          // Arrange
          jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
          jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
            newSalesFile = this;
            return Promise.resolve();
          });
          // Act
          exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(SalesFile.prototype.save).toHaveBeenCalled();
            done();
          });
        });

        describe('when salesFile.save returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const callbackError = new Error();

            jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
            jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
            jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
              newSalesFile = this;
              return Promise.reject(callbackError);
            });
            // Act
            exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, (err) => {
              // Assert
              expect(err.toString()).toBe(callbackError.toString());
              done();
            });
          });
        });

        describe('when salesFile.save DOES NOT return an error', () => {
          it('should call salesFile.createIngestTask, passing priority (2) and callback as attributes', (done) => {
            // Arrange
            jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
            jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
              newSalesFile = this;
              return Promise.resolve();
            });
            jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
            // Act
            exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
              // Assert
              expect(SalesFile.prototype.createIngestTask).toHaveBeenCalledWith(2, expect.anything(), expect.any(Function));
              done();
            });
          });

          describe('when salesFile.createIngestTask returns an error', () => {
            it('should return the error to the callback', (done) => {
              // Arrange
              const callbackError = new Error();
              jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
              jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
                newSalesFile = this;
                return Promise.resolve();
              });
              jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(callbackError));
              // Act
              exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, (err) => {
                // Assert
                expect(err).toBe(callbackError);
                done();
              });
            });
          });

          describe('when salesFile.createIngestTask DOES NOT return an error', () => {
            it('should return the result of salesFile.createIngestTask to the callback', (done) => {
              // Arrange
              jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
              jest.spyOn(SalesFile.prototype, 'save').mockImplementation(function () {
                newSalesFile = this;
                return Promise.resolve();
              });
              jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
              // Act
              exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
                // Assert
                expect(SalesFile.prototype.createIngestTask).toHaveBeenCalled();
                done();
              });
            });
          });
        });
      });
    });

    describe('when statement.salesCsv DOES NOT exist', () => {
      it('should NOT call fileManager.copyS3File', (done) => {
        // Arrange
        statement.salesCsv = '';
        jest.spyOn(fileManager, 'copyS3File').mockImplementation(yields(null));
        // Act
        exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(fileManager.copyS3File).not.toHaveBeenCalled();
          done();
        });
      });

      it('should NOT call salesFile.save', (done) => {
        // Arrange
        statement.salesCsv = '';
        jest.spyOn(SalesFile.prototype, 'save').mockResolvedValue();
        // Act
        exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(SalesFile.prototype.save).not.toHaveBeenCalled();
          done();
        });
      });

      it('should NOT call salesFile.createIngestTask', (done) => {
        statement.salesCsv = '';
        jest.spyOn(SalesFile.prototype, 'createIngestTask').mockImplementation(yields(null));
        // Act
        exportStatementToOtherClient.copySalesFile(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(SalesFile.prototype.createIngestTask).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('exportStatementToOtherClient.copyCosts', () => {
    let newCost;
    beforeEach((done) => {
      // Set up Cost constructor
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation(() => {});
      jest.spyOn(ImportXlsx, 'getDataByTemplate').mockImplementation(() => {});
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      jest.spyOn(Client, 'findById').mockResolvedValue();
      jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
        newCost = this;
        return Promise.resolve(this);
      });
      done();
    });

    describe('when statement.costsCsv exists', () => {
      it('should call fileManager.downloadFromS3 with the correct attributes', () => {
        // Arrange
        const s3Bucket = process.env.S3_bucket;
        const string = testUtils.randomString();
        fileManager.downloadFromS3.mockImplementation(yields(null, string));
        ImportXlsx.getDataByTemplate.mockImplementation(yields(null));
        // Act
        exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(fileManager.downloadFromS3).toHaveBeenCalledWith(statement.costsCsv, s3Bucket, expect.any(Function));
        });
      });

      it('should call ImportXlsx.getDataByTemplate with the correct attributes', () => {
        // Arrange
        const string = testUtils.randomString();
        fileManager.downloadFromS3.mockImplementation(yields(null, string));
        ImportXlsx.getDataByTemplate.mockImplementation(yields(null));
        // Act
        exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(ImportXlsx.getDataByTemplate).toHaveBeenCalledWith(string, config.importTemplates.statementCosts, 0, 1, '', expect.any(Function));
        });
      });

      it('should call fs.unlinkSync with the correct attributes', () => {
        // Arrange
        const string = testUtils.randomString();
        fileManager.downloadFromS3.mockImplementation(yields(null, string));
        ImportXlsx.getDataByTemplate.mockImplementation(yields(null));
        // Act
        exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(fs.unlinkSync).toHaveBeenCalledWith(string);
        });
      });

      describe('when one cost is included in the downloaded costs csv', () => {
        it('should create a new Cost document', () => {
          // Arrange
          const string = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, string));
          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve();
          });

          const cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const costs = [cost1];
          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costs));

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(Cost.prototype.save).toHaveBeenCalled();
          });
        });

        it('should call newCost.save ONCE to save the newly create cost', () => {
          // Arrange
          const string = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, string));
          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve();
          });

          const cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const costs = [cost1];
          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costs));

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(Cost.prototype.save).toHaveBeenCalledTimes(1);
          });
        });
      });

      describe('when 2 costs are included in the downloaded costs csv', () => {
        it('should create 2 new Cost documents', () => {
          // Arrange
          const string = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, string));
          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve();
          });

          const cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const cost2 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const costs = [cost1, cost2];
          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costs));

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(Cost.prototype.save).toHaveBeenCalled();
          });
        });

        it('should call newCost.save TWICE to save the newly create costs', () => {
          // Arrange
          const string = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, string));
          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve();
          });

          const cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const cost2 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const costs = [cost1, cost2];
          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costs));

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(Cost.prototype.save).toHaveBeenCalledTimes(2);
          });
        });
      });

      describe('when one cost is included in the downloaded costs csv and cost.catNo matches one of exportStatementToOtherClient.catalogue.releases', () => {
        it('should add release._idNew as an array item to newCost.releaseIds', () => {
          // Arrange
          const string = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, string));
          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve();
          });

          exportStatementToOtherClient.catalogue = {
            tracks: {},
            releases: {},
            works: {},
            composers: {},
            publishers: {},
          };

          const cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const cost2 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString() });
          const costs = [cost1, cost2];
          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costs));

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(Cost.prototype.save).toHaveBeenCalledTimes(2);
          });
        });
      });

      describe('when one cost is included in the downloaded costs csv and cost.isrc matches one of exportStatementToOtherClient.catalogue.tracks', () => {
        it('should add track._idNew as an array item to newCost.trackIds', () => {
          // Arrange
          const track1 = new Track({ isrc: testUtils.randomString() });
          const tracks = {};
          tracks[track1._id] = track1.toObject();
          tracks[track1._id]._idNew = testUtils.randomId();

          exportStatementToOtherClient.catalogue = {
            tracks,
            releases: {},
            works: {},
            composers: {},
            publishers: {},
          };

          const localCostCsv = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, localCostCsv));

          const costRow = {
            name: testUtils.randomString(),
            type: testUtils.randomString(),
            date: testUtils.randomString(),
            territory: testUtils.randomString(),
            description: testUtils.randomString(),
            isrc: track1.isrc,
          };
          const costData = [costRow];

          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costData));

          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve(newCost);
          });

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(newCost.trackIds.includes(exportStatementToOtherClient.catalogue.tracks[track1._id]._idNew)).toBe(true);
          });
        });
      });

      describe('when statement is profit share', () => {
        it('cost.netAmount should be multiplied by profit share percentage and assigned to newCost.amount', () => {
          // Arrange
          statement.contractType = 'Profit Share';
          statement.profitShareRate = 40;

          const track1 = new Track({ isrc: testUtils.randomString() });
          const tracks = {};
          tracks[track1._id] = track1.toObject();
          tracks[track1._id]._idNew = testUtils.randomId();

          exportStatementToOtherClient.catalogue = {
            tracks,
            releases: {},
            works: {},
            composers: {},
            publishers: {},
          };

          const localCostCsv = testUtils.randomString();
          fileManager.downloadFromS3.mockImplementation(yields(null, localCostCsv));

          const costRow = {
            name: testUtils.randomString(),
            netAmount: testUtils.randomInt(),
            type: testUtils.randomString(),
            date: testUtils.randomString(),
            territory: testUtils.randomString(),
            description: testUtils.randomString(),
            isrc: track1.isrc,
          };
          const costData = [costRow];

          const profitShareAmount = costRow.netAmount * (statement.profitShareRate / 100);

          ImportXlsx.getDataByTemplate.mockImplementation(yields(null, costData));

          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve(newCost);
          });

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(newCost.amount).toBe(profitShareAmount);
          });
        });
      });

      describe('when NO costs are included in the downloaded costs csv', () => {
        it('should NOT create any costs', () => {
          // Arrange
          const track1 = new Track({ isrc: testUtils.randomString() });
          const tracks = {};
          tracks[track1._id] = track1.toObject();
          tracks[track1._id]._idNew = testUtils.randomId();

          exportStatementToOtherClient.catalogue = {
            tracks,
            releases: {},
            works: {},
            composers: {},
            publishers: {},
          };

          const downloadError = new Error();
          fileManager.downloadFromS3.mockImplementation(yields(downloadError));
          ImportXlsx.getDataByTemplate.mockImplementation(yields(null));
          jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
            newCost = this;
            return Promise.resolve();
          });

          // Act
          exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
            // Assert
            expect(Cost.prototype.save).not.toHaveBeenCalled();
          });
        });
      });
    });

    describe('when statement.costsCsv DOES NOT exist', () => {
      it('should NOT call newCost.save', () => {
        // Arrange
        statement.costsCsv = null;
        jest.spyOn(Cost.prototype, 'save').mockImplementation(function () {
          newCost = this;
          return Promise.resolve();
        });
        // Act
        exportStatementToOtherClient.copyCosts(statement, targetClient._id, curveUser.id, () => {
          // Assert
          expect(Cost.prototype.save).not.toHaveBeenCalled();
        });
      });
    });
  });
});
