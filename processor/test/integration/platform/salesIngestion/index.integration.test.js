process.env.NODE_ENV = 'test';
require('../../../../models/db');

const sinon = require('sinon');
const { expect } = require('chai');

const { testUtils,
  fileManager,
} = require('@curveroyaltysystems/platform-shared-utils');
const { promisify } = require('@curveroyaltysystems/platform-shared-utils/libs/promisify');
const salesIngestion = require('../../../../libs/platform/salesIngestion/index');
const SalesFile = require('../../../../models/salesFile');
const Task = require('../../../../models/task');

describe('salesIngestion', () => {
  let clientId;
  let salesFile;
  let task;
  const userId = '1';

  beforeEach(async () => {
    clientId = testUtils.randomId();
    await promisify(testUtils.cleanUp, clientId);

    salesFile = new SalesFile({
      file: 'testSalesFile/123456/some-file.csv',
    });
    await salesFile.save();

    task = new Task({});
    await task.save();
  });

  describe('ingestSalesFile', () => {
    it('should mark sales file and task as errored when download file fails', async () => {
      sinon.stub(fileManager, 'downloadFromS3').callsFake((key, bucket, cb) => {
        cb(new Error('Uhoh!'));
      });

      await salesIngestion.ingestSalesFile(salesFile, task._id.toString(), userId);

      const newTask = await Task.findById(task._id);
      const newSalesFile = await SalesFile.findById(salesFile._id);

      expect(newTask.status).to.equal('Errored');
      expect(newSalesFile.status).to.equal('Errored');
    });
  });
});
