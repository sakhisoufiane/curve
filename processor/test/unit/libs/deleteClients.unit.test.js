process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const { randomString, cleanUp, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const sinon = require('sinon');

const { describe } = require('mocha');
const DeleteClient = require('../../../libs/support/stagingDeletion/deleteClients');
const Client = require('../../../models/client');

describe('#DeleteClient', () => {
  const clientIds = [randomId()];
  let db;
  let mongoCollectionStub;
  let mongoFindStub;
  const client = new Client({
    name: randomString(),
    _id: clientIds[0],
  });

  before(() => {
    sinon.restore();
  });

  beforeEach(() => {
    // Stubs
    mongoFindStub = sinon.stub().returns({
      sort: sinon.stub().returns({
        limit: sinon.stub().returns({
          toArray: sinon.stub().resolves([]),
        }),
      }),
    });

    mongoCollectionStub = sinon.stub().returns({
      find: mongoFindStub,
    });

    db = {
      collection: mongoCollectionStub,
    };
    sinon.stub(DeleteClient, 'connectToDb').resolves(db);
    sinon.stub(Client, 'findById').resolves(client);
    sinon.stub(Client, 'findOneAndDelete').resolves();
  });

  afterEach(() => {
    sinon.restore(); // Restore stubs after each test
  });

  it('Should call Client.findById', async () => {
    await DeleteClient.run(clientIds);
    expect(Client.findById.calledOnce).to.be.true;
  });

  describe('When connecting to the Db', async () => {
    beforeEach(() => {
      DeleteClient.connectToDb.rejects(new Error('Cannot connect to db'));
    });

    it('Should throw an error when the connection to the db fails', async () => {
      try {
        await DeleteClient.run(clientIds);
      } catch (error) {
        expect(() => {
          DeleteClient.connectToDb().to.throw('Cannot connect to db');
        });
      }
    });
  });

  it('Should call Client.findOneAndDelete', async () => {
    await DeleteClient.run(clientIds);
    expect(Client.findOneAndDelete.calledOnce).to.be.true;
  });

  describe('When Client.findById returns nothing', () => {
    beforeEach(() => {
      Client.findById.rejects(); // Stubbing to reject with an error
    });

    it('We should throw an error', async () => {
      try {
        await DeleteClient.run(['invalid_id']);
      } catch (error) {
        expect(error.message).to.equal('Staging-Delete-Client | Client not found - invalid_id');
      }
    });
  });

  describe('When Client.findOneAndDelete throws an error', () => {
    beforeEach(async () => {
      Client.findOneAndDelete.rejects(new Error('error deleting client')); // Stubbing findOneAndDelete to throw an error
    });

    afterEach(() => {
      cleanUp(clientIds);
    });

    it('We should throw an error', async () => {
      try {
        await DeleteClient.run(clientIds);
      } catch (error) {
        expect(error.message).to.equal('error deleting client');
      }
    });
  });
  describe('When we find a client', () => {
    it('when no files inside the model are found we return', async () => {
      await DeleteClient.run(clientIds);
      expect(mongoCollectionStub.called).to.be.true;
    });
  });

  describe('When files are found', () => {
    beforeEach(() => {
      const documents = [
        { _id: randomId(), clientIds, allFilesZip: 'file1.zip', salesCsv: 'file2.csv' },
      ];
      mongoFindStub = sinon.stub().returns({
        sort: sinon.stub().returns({
          limit: sinon.stub().returns({
            toArray: sinon.stub().resolves(documents),
          }),
        }),
      });
      const mongoDeleteManyStub = sinon.stub().resolves();
      mongoCollectionStub = sinon.stub().returns({
        find: mongoFindStub,
        deleteMany: mongoDeleteManyStub,
      });
      db = {
        collection: mongoCollectionStub,
      };
      DeleteClient.connectToDb.returns(db);
    });

    it('Should call fileManager.deleteFromS3async for each file in the document', async () => {
      const fileManagerStub = sinon.stub(fileManager, 'deleteFromS3async').resolves();
      await DeleteClient.run(clientIds); // Call the DeleteClient logic

      expect(fileManagerStub.callCount).to.equal(2);
    });

    it('Should throw an error when  fileManager.deleteFromS3async cant find a file to delete', async () => {
      sinon.stub(fileManager, 'deleteFromS3async').rejects(new Error('No file matching that name found'));
      try {
        await DeleteClient.run(clientIds);
      } catch (error) {
        expect(error.message).to.equal('No file matching that name found');
      }
    });
  });

  describe('When there are more than 1000 documents', () => {
    let documentsBatch1;
    let documentsBatch2;
    let mongoFindStub;
    let mongoDeleteManyStub;

    beforeEach(() => {
      sinon.stub(fileManager, 'deleteFromS3async').resolves();

      documentsBatch1 = Array.from({ length: 1000 }, () => ({
        _id: randomId(),
        clientIds,
        allFilesZip: 'file1.zip',
        salesCsv: 'file2.csv',
      }));
      documentsBatch2 = Array.from({ length: 500 }, () => ({
        _id: randomId(),
        clientIds,
        allFilesZip: 'file3.zip',
        salesCsv: 'file4.csv',
      }));

      mongoFindStub = sinon.stub();

      mongoFindStub.onFirstCall().returns({
        sort: sinon.stub().returns({
          limit: sinon.stub().returns({
            toArray: sinon.stub().resolves(documentsBatch1),
          }),
        }),
      });

      mongoFindStub.onSecondCall().returns({
        sort: sinon.stub().returns({
          limit: sinon.stub().returns({
            toArray: sinon.stub().resolves(documentsBatch2),
          }),
        }),
      });
      mongoDeleteManyStub = sinon.stub().resolves();

      mongoCollectionStub = sinon.stub().returns({
        find: mongoFindStub,
        deleteMany: mongoDeleteManyStub,
      });

      db = {
        collection: mongoCollectionStub,
      };
      DeleteClient.connectToDb.returns(db);

      mongoFindStub.returns({
        sort: sinon.stub().returns({
          limit: sinon.stub().returns({
            toArray: sinon.stub().resolves(),
          }),
        }),
      });
    });

    it('Should call deleteCollection recursively until all documents are deleted', async () => {
      await DeleteClient.run(clientIds);

      expect(mongoFindStub.callCount).to.equal(29);
    });
  });
});
