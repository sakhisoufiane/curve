const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const ingestCs = require('./ingestCs');

describe('ingestCs', function () {
  describe('mapSociety', function () {
    it('return the right society name', () => {
      const society = ingestCs.mapSociety(338);
      expect(society).toEqual('EDEM');
    });
  });
});
