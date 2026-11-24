process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../../../../models/client');

const fugaSalesIngestion = rewire('../../../../libs/fuga/fugaSalesIngestion');

describe('fugaSalesIngestion', () => {
  logger.debug('\n\n**** ./test/unit/libs/fuga/fugaSalesIngestion.unit.test.js');

  const client = { _id: randomId(), name: randomString() };
  const message = {
    name: randomString(),
    metadata: {
      fuga_organization_id: randomString(),
      statement_run_title: randomString(),
      statement_id: randomString(),
    },
  };
  const mockTask = { _id: randomId(), status: 'pending' };
  let downloadFileFromGCSStub; let createSalesFileStub; let createIngestionTaskStub;

  beforeEach(() => {
    downloadFileFromGCSStub = sinon.stub().resolves(randomString());
    createSalesFileStub = sinon.stub().resolves({ _id: randomId(), name: randomString() });
    createIngestionTaskStub = sinon.stub().resolves(mockTask);

    sinon.stub(Client, 'find').resolves([client]);

    fugaSalesIngestion.__set__('downloadFileFromGCS', downloadFileFromGCSStub);
    fugaSalesIngestion.__set__('createSalesFile', createSalesFileStub);
    fugaSalesIngestion.__set__('createIngestionTask', createIngestionTaskStub);
  });

  afterEach(() => sinon.restore());

  describe('processClient', () => {
    it('should not return task if no client passed', async () => {
      const result = await fugaSalesIngestion.processClient(null, message);
      expect(result).to.be.undefined;
    });

    it('should return task', async () => {
      const result = await fugaSalesIngestion.processClient(client, message);

      expect(downloadFileFromGCSStub.calledOnce).to.be.true;
      expect(createSalesFileStub.calledOnce).to.be.true;
      expect(createIngestionTaskStub.calledOnce).to.be.true;
      expect(result).to.eql(mockTask);
    });
  });

  describe('processClient', () => {
    it('should look up the client(s) the number of clients found', async () => {
      const result = await fugaSalesIngestion.ingestFile({ message });
      expect(Client.find.calledWith({ 'fugaIntegration.fugaOrgId': message.metadata.fuga_organization_id, 'fugaIntegration.fugaAutoIngestSales': true })).to.be.true;
      expect(result).to.eql(1);
    });

    it('should throw an error if the metadata is not valid', async () => {
      try {
        await fugaSalesIngestion.ingestFile({
          message: {
            name: randomString(),
            metadata: {},
          },
        });
      } catch (err) {
        expect(err.message).to.equal('Fuga Sales: fuga_organization_id is missing from metadata');
      }
      try {
        await fugaSalesIngestion.ingestFile({
          message: {
            name: randomString(),
            metadata: {
              fuga_organization_id: randomString(),
              statement_run_title: randomString(),
            },
          },
        });
      } catch (err) {
        expect(err.message).to.equal('Fuga Sales: statement_run_title or statement_id is missing from metadata');
      }
    });
  });
});
