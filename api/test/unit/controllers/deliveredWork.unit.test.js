process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('deliveredWork controller', () => {
  logger.info('\n\n**** .test/unit/controllers/deliveredWork.unit.test.js');
  let DeliveredWorkController;

  beforeEach((done) => {
    DeliveredWorkController = rewire('../../../controllers/deliveredWork');
    done();
  });
  describe('paramsToFilterFieldWork', () => {
    describe('when user has clientId', () => {
      it('should add clientId to the params object');
    });
    describe('when inputParams has composerIds array', () => {
      describe('when inputParams has composerIds array containing values', () => {
        it('should add composerIds to the params object');
      });
      describe('when inputParams has empty composerIds array', () => {
        it('should not add composerIds to the params object');
      });
    });
    describe('when inputParams has publisherIds array', () => {
      describe('when inputParams has publisherIds array containing values', () => {
        it('should add publisherIds to the params object');
      });
      describe('when inputParams has empty publisherIds array', () => {
        it('should not add publisherIds to the params object');
      });
    });
    describe('when inputParams has status', () => {
      it('should add status to the params object');
    });
    describe('when inputParams has text property', () => {
      describe('when text property is a valid ObjectId', () => {
        it('should add a params.$or object with a regex pattern based on inputParams.text');
      });
      describe('when text property is not a valid ObjectId', () => {
        it('should add a params.name object with a regex pattern based on inputParams.text');
      });
    });
    describe('when user does not have clientId', () => {
      it('should not add clientId to the params object');
    });
    describe('when inputParams has no workId ', () => {
      it('should not add workId to the params object');
    });
    describe('when inputParams has no status', () => {
      it('should not add status to the params object');
    });
    describe('when inputParams does not have text property', () => {
      it('should not add a name property to the params object');
      it('should not add a $or property to the params object');
    });
    it('should return params');
  });
  describe('paramsToFilterField', () => {
    describe('when user has clientId', () => {
      it('should add clientId to the params object');
    });
    describe('when inputParams has workId array', () => {
      describe('when inputParams has workId array containing values', () => {
        it('should add workId to the params object');
      });
      describe('when inputParams has empty workId array', () => {
        it('should not add workId to the params object');
      });
    });
    describe('when inputParams has deliveryPartnerId', () => {
      it('should add deliveryPartnerId to the params object');
    });
    describe('when inputParams has deliveryStatus', () => {
      it('should add deliveryStatus to the params object');
    });
    describe('when inputParams has text property', () => {
      describe('when text property is a valid ObjectId', () => {
        it('should add a params.$or object with a regex pattern based on inputParams.text');
      });
      describe('when text property is not a valid ObjectId', () => {
        it('should add a params.name object with a regex pattern based on inputParams.text');
      });
    });
    describe('when user does not have clientId', () => {
      it('should not add clientId to the params object');
    });
    describe('when inputParams has no workId ', () => {
      it('should not add workId to the params object');
    });
    describe('when inputParams has no deliveryPartnerId', () => {
      it('should not add deliveryPartnerId to the params object');
    });
    describe('when inputParams has no deliveryStatus', () => {
      it('should not add deliveryStatus to the params object');
    });
    describe('when inputParams does not have text property', () => {
      it('should not add a name property to the params object');
      it('should not add a $or property to the params object');
    });
    it('should return params');
  });
  describe('create', () => {
    it('should call DeliveredWork.save');
    it('should call DeliveredWork.save with the correct parameter');
    it('should return DeliveredWork');
  });
  describe('getSingle', () => {
    it('should call DeliveredWork.findOne');
    it('should call DeliveredWork.findOne with the correct parameters');
    it('should return a single DeliveredWork');
  });
  describe('get', () => {
    it('should call DeliveredWork.find');
    it('should call DeliveredWork.find with the correct parameters');
    it('should return countDocuments');
  });
  describe('count', () => {
    it('should call DeliveredWork.countDocuments');
    it('should call DeliveredWork.countDocuments with the correct parameters');
    it('should return the count of countDocuments');
  });
  describe('getWorkIdsByStatus', () => {
    describe('If status not equal to All', () => {
      it('should set the correct filter.status');
    });
    describe('If cwrDeliveryId', () => {
      it('should call DeliveredWork.find with the filter.cwrDeliveryId');
    });
    describe('If no cwrDeliveryId', () => {
      it('should call DeliveredWork.find with the filter.cwrAcknowledgementId');
    });
    it('should return the array of workIds');
  });
  describe('paginate', () => {
    describe('If req does not have curveUser.clientId', () => {
      it('should return staus 403');
    });
    describe('If req does have curveUser.companyId', () => {
      it('should return staus 403');
    });
    describe('when req.curveUser.clientId and not req.curveUser.companyId', () => {
      it('should call DeliveredWork.paginate with the correct parameters');
      describe('If req does have query.page', () => {
        it('should set paginationParams.page to query.page');
      });
      describe('If req does not have query.page', () => {
        it('should set paginationParams.page to 1');
      });
      describe('If req does have query.limit', () => {
        it('should set paginationParams.limit to query.limit');
      });
      describe('If req does not have query.limit', () => {
        it('should set paginationParams.limit to 25');
      });
      describe('If req does have query.orderBy', () => {
        describe('If req does have query.orderDir', () => {
          it('should set correct paginationParams.sort');
        });
        describe('If req does not have query.orderDir', () => {
          it('should set correct paginationParams.sort');
        });
      });
      describe('If req does not have query.orderBy', () => {
        it('should set paginationParams.sort as empty string');
      });
      describe('If req does have empty string query.orderBy', () => {
        it('should set paginationParams.sort as empty string');
      });
      it('should return the status 200');
      it('should return the pagination Object');
      it('should return the meta Object');
    });
  });
  describe('userForbidden', () => {
    describe('If user clientId equals delivery clientId', () => {
      it('should return true');
    });
    describe('If user clientId does not equal delivery clientId', () => {
      it('should return false');
    });
  });
  describe('getWorkData', () => {
    it('should call Work.find with the correct parameters');
    it('should return combined data');
  });
  describe('getAcknowledgementFileWorks', () => {
    describe('If status is passed', () => {
      describe('If status not equal to All', () => {
        it('should set the correct filter.status');
      });
      describe('If status equal to All', () => {
        it('should not set the filter.status');
      });
    });
    it('should call DeliveredWork.paginate with the correct parameters');
    it('should return the pagination Object');
    it('should return the meta Object');
  });
});
