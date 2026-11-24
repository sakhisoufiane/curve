/* eslint-disable no-promise-executor-return */
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const CreateSalesZip = require('./createSalesZip');
const Period = require('../../../../models/period');

describe('createSalesZip', () => {
  describe('downloadStatement', () => {
    it('should download a statement pdf from S3', async () => {
      // Arrange
      const fileKey = `statements/${randomId()}/All Calculated Sales.csv`;
      const filePath = randomString();
      jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((fileKey, bucket, options, callback) => {
        callback(null, filePath);
      });
      // Act
      const localFile = await CreateSalesZip.downloadStatement(fileKey);
      // Assert
      expect(localFile).toEqual(filePath);
    });
  });

  describe('saveFileKeys', () => {
    it('should save specified file keys on a period', async () => {
      // Arrange
      const periodId = randomId();
      const clientId = randomId();
      const fileKeys = ['periods/1/export1', 'periods/1/export2'];
      const urls = [randomString(), randomString()];
      jest.spyOn(Period, 'updateOne').mockResolvedValue();
      // Act
      await CreateSalesZip.saveFileKeys(periodId, clientId, fileKeys, urls);
      // Assert
      // Filter
      expect(Period.updateOne.mock.calls[0][0]).toEqual({ _id: periodId, clientId });
      // Query
      expect(Period.updateOne.mock.calls[0][1]).toEqual({
        statementSalesExportFileKeys: fileKeys,
        statementSalesExportZipsPublicLinks: urls,
      });
    });
  });
});
