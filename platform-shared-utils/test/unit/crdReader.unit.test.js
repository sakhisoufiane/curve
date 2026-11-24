process.env.NODE_ENV = 'test';

const chai = require('chai');
const { readFileSync } = require('node:fs');
const CrdReader = require('../../libs/crdReader');
const { promisify } = require('../../libs/promisify');

chai.use(require('sinon-chai'));

const { expect, assert } = chai;

describe('crdReader', () => {
  it('should load CRD v2 data correctly', async () => {
    const reader = new CrdReader();
    const [results] = await promisify(reader.readCrdFile, 'test/data/crd/v2-sample.dat', 'utf8');

    const expectedResults = JSON.parse(readFileSync('test/data/crd/v2-expected-results.json', 'utf8'));

    expect(results).to.deep.equal(expectedResults);
  });

  it('should load CRD v2 data correctly even if no MWN records exist', async () => {
    const reader = new CrdReader();
    const [results] = await promisify(reader.readCrdFile, 'test/data/crd/v2-no-mwn.dat', 'utf8');

    const expectedResults = JSON.parse(readFileSync('test/data/crd/v2-no-mwn-expected-results.json', 'utf8'));

    expect(results).to.deep.equal(expectedResults);
  });

  it('should load CRD v4 data correctly', async () => {
    const reader = new CrdReader();
    const [results] = await promisify(reader.readCrdFile, 'test/data/crd/v4-sample.dat', 'utf8');

    const expectedResults = JSON.parse(readFileSync('test/data/crd/v4-expected-results.json', 'utf8'));

    expect(results).to.deep.equal(expectedResults);
  });

  it('should load CRD v4.01 data correctly', async () => {
    const reader = new CrdReader();
    const [results] = await promisify(reader.readCrdFile, 'test/data/crd/v4-01-sample.dat', 'utf8');

    const expectedResults = JSON.parse(readFileSync('test/data/crd/v4-01-expected-results.json', 'utf8'));

    expect(results).to.deep.equal(expectedResults);
  });

  it('should load PRS CRD v4 data correctly', async () => {
    const reader = new CrdReader();
    const [results] = await promisify(reader.readCrdFile, 'test/data/crd/prs-v4-sample.dat', 'utf8');

    const expectedResults = JSON.parse(readFileSync('test/data/crd/v4-expected-results.json', 'utf8'));

    expect(results).to.deep.equal(expectedResults);
  });

  it('should load PRS CRD v4.01 data correctly', async () => {
    const reader = new CrdReader();
    const [results] = await promisify(reader.readCrdFile, 'test/data/crd/prs-v4-01-sample.dat', 'utf8');

    const expectedResults = JSON.parse(readFileSync('test/data/crd/v4-01-expected-results.json', 'utf8'));

    expect(results).to.deep.equal(expectedResults);
  });

  it('should error when an invalid file is given', async () => {
    const reader = new CrdReader();

    try {
      await promisify(reader.readCrdFile, 'test/data/crd/invalid-sample.txt', 'utf8');
      assert.fail();
    } catch (error) {
      expect(error.message).to.equal('There was an error reading the CRD file. Data does not look like CRD Data');
    }
  });
});
