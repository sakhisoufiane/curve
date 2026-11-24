const { AtlasSearch } = require('@curveroyaltysystems/curve-shared-logic');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const fs = require('fs');
const csv = require('csv-parser');

const Client = require('../../models/client');
const Notification = require('../../models/notification');
const Work = require('../../models/work');

const { runValidationExport, separateWorkByValidationErrors } = require('.');

describe('WorkController', function () {
  logger.info('>>>file>>>> controllers/work .....................');

  describe('runValidationExport', () => {
    let client; let writeStreamSpy; let works; let data;

    beforeAll(async () => {
      jest.spyOn(Notification, 'generate').mockImplementation((...args) => args[args.length - 1](null));
      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, localPath, callback) => callback(null, ''));
      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, callback) => callback(null, ''));
      writeStreamSpy = jest.spyOn(fs, 'createWriteStream');

      client = new Client({ name: randomString(), email: 'test@curve.com', primaryEmail: 'test@curve.com', createdBigQueryTables: true, createdBigQueryBackups: true });
      await client.save();

      jest.spyOn(AtlasSearch, 'buildSearchAggregation').mockResolvedValue({
        aggregation: [{ $match: { clientId: client._id.toString() } }],
      });

      works = [
        {
          clientId: client._id.toString(),
          title: randomString(),
          iswc: randomString(),
          composer: randomString(),
        },
        {
          clientId: client._id.toString(),
          title: randomString(),
          iswc: randomString(),
          composer: randomString(),
          validationErrors: [
            'At least one territory needs to be selected',
            'Default Chain: At least one IP Chain has to be controlled',
          ],
        }, {
          clientId: client._id.toString(),
          title: randomString(),
          iswc: randomString(),
          validationErrors: [
            'A work can only have one instance of a contract attached to it. Please ensure a contract is only included once.',
          ],
        }, {
          clientId: client._id.toString(),
          title: randomString(),
          validationErrors: [
            'Society Identifiers are required to be unique',
          ],
        }, {
          clientId: client._id.toString(),
          title: randomString(),
          iswc: randomString(),
          composer: randomString(),
          validationErrors: [
            'Arrangement Type is required when Version Type is Modification',
            'These changes will invalidate the work. Please check and try again',
            'Default Chain: IP Chains total mechanical ownership should add up to 100%',
            'Default Chain: IP Chains total performance ownership should add up to 100%',
            'Default Chain: IP Chains total mechanical collection should add up to 100%',
            'Default Chain: IP Chains total performance collection should add up to 100%',
            'Default Chain: Publisher performance ownership should be no greater than 50%',
            'Default Chain: Publisher performance collection should be no greater than 50%',
          ],
        }];
      works = await Work.insertMany(works);
    });

    it('should create a file with one error per row', async () => {
      const filter = { ids: works.map((work) => work._id.toString()) };
      await runValidationExport({ curveUser: { clientId: client._id.toString() }, filter });
      expect(writeStreamSpy).toHaveBeenCalled();
      const outputFilePath = writeStreamSpy.mock.calls[0][0];
      data = await parseCsvFile(outputFilePath);

      const separatedWorks = works.reduce((acc, work) => [...acc, ...separateWorkByValidationErrors(work.toObject())], []);
      expect(data.length).toBe(12);

      // Loop through the data and make sure it's all there and correct
      expect(
        separatedWorks.every((work) => data.find(
          (row) => row.ID === work._id
            && row.Composers === work.composer
            && row.ISWC === work.iswc
            && row.Title === work.title
            && row['Validation Error'] === work.validationError,
        )),
      );
    });
  });
});

const parseCsvFile = (outputFilePath) => new Promise((resolve, reject) => {
  const results = [];

  fs.createReadStream(outputFilePath)
    .pipe(csv())
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', () => {
      resolve(results);
    })
    .on('error', (err) => {
      reject(err);
    });
});
