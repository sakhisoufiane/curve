/* eslint-disable no-shadow */
process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const chai = require('chai');
const ingestCs = require('../../../libs/cwr/ingestCs');

const { expect } = chai;

describe('ingestCs', function () {
  logger.info('>>>file>>>> unit/libs/ingestCs .....................');

  describe('mapSociety', function () {
    it('return the right society name', (done) => {
      const society = ingestCs.mapSociety(338);
      expect(society).to.equal('EDEM');
      done();
    });
  });
});
