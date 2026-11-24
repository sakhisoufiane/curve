process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const { expect } = require('chai');
const sinon = require('sinon');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');

const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const WriteCsv = require('../../../../libs/writeCsv/writeCsvObject');

logger.debug('\n\n**** .test/unit/libs/writeCsv/writeCsvObject.unit.test.js');

describe.skip('WriteCsv Unit Tests', function () {
  let params; let writeCsv;

  before(function (done) {
    sinon.restore();
    done();
  });

  beforeEach(function (done) {
    params = {
      headers: [randomString(), randomString(), randomString()],
      outputLocation: `${appRootDir}/tmp/${randomString()}`,
      s3AccessKey: randomString(),
      s3SecretKey: randomString(),
      s3Region: randomString(),
      s3Bucket: randomString(),
    };

    writeCsv = new WriteCsv(params);

    setTimeout(() => {
      done();
    }, 500);
  });

  afterEach(function (done) {
    if (fs.existsSync(params.outputLocation)) { fs.unlinkSync(params.outputLocation); }
    sinon.restore();
    done();
  });

  after(function (done) {
    sinon.restore();
    done();
  });

  it('Should export all the functions', function (done) {
    // Assert
    expect(writeCsv.prepareWriter).to.exist;
    expect(writeCsv.addData).to.exist;
    expect(writeCsv.addRow).to.exist;
    expect(writeCsv.write).to.exist;
    done();
  });

  describe('WriteCSV.prepareWriter', function () {
    it('Should initiliaze writer', function (done) {
      // Assert
      expect(writeCsv.writer.headers).to.deep.eq(params.headers);
      expect(writeCsv.outputLocation).to.eq(params.outputLocation);
      done();
    });

    it.skip('Should create a file in the output location', function (done) {
    // Assert
      expect(fs.existsSync(params.outputLocation)).to.be.true;
      done();
    });
  });

  describe('WriteCSV.addData', function () {
    it('Should return an error if data is not an array', function (done) {
      const expectedError = 'Data must be an array';
      // Act
      writeCsv.addData(randomString(), function (err) {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });

    it('Should add data to the output location', function (done) {
      // Arrange
      const line = {};
      line[params.headers[0]] = randomString();
      line[params.headers[1]] = randomString();
      line[params.headers[2]] = randomString();
      const expectedLine = [line[params.headers[0]], line[params.headers[1]], line[params.headers[2]]];
      // Act
      writeCsv.addData([line], function (err) {
        writeCsv.write(function (err, outputLocation) {
          fs.readFile(outputLocation, { encoding: 'utf-8' }, function (err, data) {
            // Assert
            data = data.split('\n');
            const headers = data[0].split(',');
            const line1 = data[1].split(',');

            expect(headers).to.deep.eq(params.headers);
            expect(line1).to.deep.eq(expectedLine);
            done();
          });
        });
      });
    });
  });

  describe('WriteCSV.addRow', function () {
    it('Should add data to the output location', function (done) {
      // Arrange
      const line = {};
      line[params.headers[0]] = randomString();
      line[params.headers[1]] = randomString();
      line[params.headers[2]] = randomString();
      // Act
      writeCsv.addData([line], function (err) {
        writeCsv.addRow(line, function (err) {
          writeCsv.write(function (err, outputLocation) {
            fs.readFile(outputLocation, { encoding: 'utf-8' }, function (err, data) {
              // Assert
              data = data.split('\n');
              const lastLine = data[2].split(',');

              const expectedLine = [line[params.headers[0]], line[params.headers[1]], line[params.headers[2]]];
              expect(lastLine).to.deep.eq(expectedLine);
              done();
            });
          });
        });
      });
    });
  });

  describe('WriteCSV.write', function () {
    it('Should end write stream and return output location', function (done) {
      // Assert
      expect(writeCsv.writer.writable).to.be.true;
      // Act
      writeCsv.write(function (err, location) {
        // Assert
        expect(err).to.not.exist;
        expect(writeCsv.writer.writable).to.be.false;
        expect(location).to.eq(params.outputLocation);
        done();
      });
    });
  });
});
