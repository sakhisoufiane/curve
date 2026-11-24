process.env.NODE_ENV = 'test';
require('../../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('deliveredWork controller', () => {
  logger.info('\n\n**** .test/unit/libs/cwr/utils.unit.test.js');
  let DeliveredWorkController;

  beforeEach((done) => {
    // DeliveredWorkController = rewire('../../../../libs/cwr/utils');
    done();
  });
  describe('#getWorksMatchingFilter', () => {
    describe('when workIds has been passed', () => {
      describe('when paginationParams.page has been passed', () => {
        it('should call Work.paginate with the correct parameter');
        it('should return paginated works');
      });
      describe('when paginationParams.page has not been passed', () => {
        it('should call Work.find with the correct parameter');
        it('should return unpaginated works');
      });
    });
    describe('when filterType is "newAndUpdated"', () => {
      it('should call CwrUtils.getNewAndUpdatedWorks with the correct parameter');
    });
    describe('when filterType is "manuallyAdded"', () => {
      it('should call CwrUtils.getManuallyAddedWorks with the correct parameter');
    });
    describe('when filterType is "custom"', () => {
      it('should call CwrUtils.getCustomFilterWorks with the correct parameter');
    });
    describe('when filterType is "specific"', () => {
      it('should call CwrUtils.getSpecificFilterWorks with the correct parameter');
    });
  });
  describe('#getNewAndUpdatedWorks', () => {
    it('should call Work.aggregate with the correct parameter');
    describe('when onlyReturnFilter has been passed', () => {
      it('should return the correct filter with work Ids');
    });
    describe('when paginationParams.page has been passed', () => {
      it('should call Work.paginate with the correct parameter');
      it('should return paginated works');
    });
    describe('when paginationParams.page has not been passed', () => {
      it('should call Work.find with the correct parameter');
      it('should return unpaginated works');
    });
  });
  describe('#getManuallyAddedWorks', () => {
    describe('when onlyReturnFilter has been passed', () => {
      it('should return the correct filter');
    });
    describe('when paginationParams.page has been passed', () => {
      it('should call Work.paginate with the correct parameter');
      it('should return paginated works');
    });
    describe('when paginationParams.page has not been passed', () => {
      it('should call Work.find with the correct parameter');
      it('should return unpaginated works');
    });
  });
  describe('#getSpecificFilterWorks', () => {
    describe('when deliveryFilter.workIds contains Ids', () => {
      it('should add the list of Ids to the filter');
    });
    describe('when deliveryFilter.workIds contains no Ids', () => {
      it('should not add the list of Ids to the filter');
    });
    describe('when onlyReturnFilter has been passed', () => {
      it('should return the correct filter');
    });
    it('should call Work.paginate with the correct parameter');
    it('should return paginated works');
  });
  describe('#getCustomFilterWorks', () => {
    describe('when filter has been passed', () => {
      it('should assign the worksFilter from filter object');
    });
    describe('when filter has not been passed', () => {
      describe('when deliveryFilter has been passed', () => {
        it('should call CwrUtils.formWorkFilters with the correct parameter');
      });
      describe('when deliveryFilter has not been passed', () => {
        it('should call CwrUtils.formWorkFilters with the correct parameter');
      });
    });
    describe('when onlyReturnFilter has been passed', () => {
      it('should return the correct filter');
    });
    describe('when worksFilter is falsy', () => {
      it('should set worksFilter with clientId');
    });
    describe('when deliveryFilter.tab === "deliveryStatuses"', () => {
      describe('when deliveryFilter.deliveryStatus === "Accepted"', () => {
        it('should add the correct match stage to aggregation');
      });
      describe('when deliveryFilter.deliveryStatus === "Rejected"', () => {
        it('should add the correct match stage to aggregation');
      });
      describe('when deliveryFilter.deliveryStatus === "Delivered"', () => {
        it('should add the correct match stage to aggregation');
      });
      describe('when deliveryFilter.deliveryStatus === "Queued"', () => {
        it('should add the correct match stage to aggregation');
      });
      describe('when deliveryFilter.deliveryStatus not "Accepted/Rejected/Delivered/Queued"', () => {
        it('should add the correct match stage to aggregation');
      });
    });
    describe('when paginationParams.page has been passed', () => {
      describe('when paginationParams.page - 1 < 0', () => {
        it('should add the correct facet stage to aggregation');
      });
    });
    it('should call Work.aggregate with the correct parameter');
    describe('when paginationParams.page has not been passed', () => {
      it('should create the correct results array');
    });
    describe('when paginationParams.page has been passed', () => {
      it('should return pagination object');
    });
    describe('when paginationParams.page has not been passed', () => {
      it('should not return pagination object');
    });
  });
  describe('#formWorkFilters', () => {
    it('should set worksFilter.approvalStatus to Approved');
    describe('when filter.tab not equal to deliveryStatuses', () => {
      it('should set worksFilter.onHold to the correct value');
    });
    describe('when filter.tab equal to deliveryStatuses', () => {
      describe('when filter.deliveryStatus === On Hold', () => {
        it('should add correct holdRedelivery to orWorksFilter');
        it('should add onHold to orWorksFilter');
      });
      describe('when filter.deliveryStatus !== On Hold', () => {
        it('should add correct holdRedelivery to orWorksFilter');
        it('should not add onHold to orWorksFilter');
      });
    });
    describe('when filter.tab not equal to deliveryStatuses', () => {
      it('should add correct holdRedelivery to orWorksFilter');
      it('should not add onHold to orWorksFilter');
    });
    describe('when filter.territory has been passed', () => {
      describe('when filter.territory equal to WW', () => {
        it('should set worksFilter.territories to the correct value');
      });
      describe('when filter.territory equal to Africa', () => {
        it('should set worksFilter.territories to the correct value');
      });
      describe('when filter.territory equal to Americas', () => {
        it('should set worksFilter.territories to the correct value');
      });
      describe('when filter.territory equal to Asia', () => {
        it('should set worksFilter.territories to the correct value');
      });
      describe('when filter.territory equal to Europe', () => {
        it('should set worksFilter.territories to the correct value');
      });
      describe('when filter.territory equal to Oceania', () => {
        it('should set worksFilter.territories to the correct value');
      });
      describe('when filter.territory not equal to WW/Africa/Americas/Asia/Europe/Oceania', () => {
        it('should set worksFilter.territories to the correct value');
      });
    });
    describe('when filter.includeProductionLibrary === true', () => {
      it('should set worksFilter.productionLibrary to true');
    });
    describe('when filter.excludeProductionLibrary === true', () => {
      it('should set worksFilter.productionLibrary to ne true');
    });
    describe('when filter.excludeProductionLibrary and filter.includeProductionLibrary have not been passed', () => {
      it('should not set worksFilter.productionLibrary');
    });
    describe('when an non empty array of filter.catalogueGroups have been passed', () => {
      it('should set worksFilter.catalogueGroups to the correct value');
    });
    describe('when an non empty array of filter.excludeCatalogueGroups have been passed', () => {
      it('should set worksFilter.catalogueGroups to the correct value');
    });
    describe('when filter.catalogueGroups and filter.excludeCatalogueGroups have not been passed', () => {
      it('should not set worksFilter.catalogueGroups');
    });
    describe('when an non empty array of filter.composerIds have been passed', () => {
      it('should set worksFilter.usedComposerIds to the correct value');
    });
    describe('when an non empty array of filter.excludeComposers have been passed', () => {
      it('should set worksFilter.usedComposerIds to the correct value');
    });
    describe('when filter.composerIds and filter.excludeComposers have not been passed', () => {
      it('should not set worksFilter.usedComposerIds');
    });
    describe('when an non empty array of filter.publisherIds have been passed', () => {
      it('should set worksFilter.usedPublisherIds to the correct value');
    });
    describe('when an non empty array of filter.excludePublishers have been passed', () => {
      it('should set worksFilter.usedPublisherIds to the correct value');
    });
    describe('when filter.publisherIds and filter.excludePublishers have not been passed', () => {
      it('should not set worksFilter.usedPublisherIds');
    });
    describe('when filter.createdAfter has been passed', () => {
      it('should set worksFilter.createdAt.$gte to the correct value');
    });
    describe('when filter.createdBefore has been passed', () => {
      it('should set worksFilter.createdAt.$lte to the correct value');
    });
    describe('when filter.workCreatedNo has been passed', () => {
      describe('when filter.workCreatedNo is a number', () => {
        describe('when filter.workCreatedPeriod === Months', () => {
          it('should set worksFilter.createdAt.$gte to the correct value');
        });
        describe('when filter.workCreatedPeriod !== Months', () => {
          it('should set worksFilter.createdAt.$gte to the correct value');
        });
      });
    });
    describe('when filter.createdAfter and createdBefore and workCreatedNo has not been passed', () => {
      it('should not set worksFilter.createdAt');
    });
    describe('when filter.modifiedAfter has been passed', () => {
      it('should set worksFilter.updatedAt.$gte to the correct value');
    });
    describe('when filter.modifiedBefore has been passed', () => {
      it('should set worksFilter.updatedAt.$lte to the correct value');
    });
    describe('when filter.modifiedInLast has been passed', () => {
      describe('when filter.modifiedInLast is a number', () => {
        describe('when filter.modifiedInLastPeriod === Months', () => {
          it('should set worksFilter.updatedAt.$gte to the correct value');
        });
        describe('when filter.modifiedInLastPeriod !== Months', () => {
          it('should set worksFilter.updatedAt.$gte to the correct value');
        });
      });
    });
    describe('when filter.modifiedAfter and modifiedBefore and modifiedInLast has not been passed', () => {
      it('should not set worksFilter.updatedAt');
    });
    describe('when filter.approvedAfter has been passed', () => {
      it('should set worksFilter.approvedDate.$gte to the correct value');
    });
    describe('when filter.approvedBefore has been passed', () => {
      it('should set worksFilter.approvedDate.$lte to the correct value');
    });
    describe('when filter.approvedInLast has been passed', () => {
      describe('when filter.approvedInLast is a number', () => {
        describe('when filter.approvedInLastPeriod === Months', () => {
          it('should set worksFilter.approvedDate.$gte to the correct value');
        });
        describe('when filter.approvedInLastPeriod !== Months', () => {
          it('should set worksFilter.approvedDate.$gte to the correct value');
        });
      });
    });
    describe('when filter.approvedAfter and approvedBefore and approvedInLast has not been passed', () => {
      it('should not set worksFilter.approvedDate');
    });
    describe('when filter.deliveryStatus has been passed', () => {
      describe('when filter.deliveryStatus === Undelivered', () => {
        it('should set worksFilter.deliveredTo.deliveryPartnerId to the correct value');
      });
      describe('when filter.deliveryStatus === Delivered', () => {
        it('should set worksFilter.deliveredTo.deliveryPartnerId to the correct value');
      });
      describe('when filter.deliveryStatus === Queued', () => {
        it('should add inFutureDelivery to the orWorksFilter');
        it('should add forceRedelivery to the orWorksFilter');
      });
      describe('when filter.deliveryStatus === Accepted', () => {
        it('should set worksFilter.deliveredTo.deliveryPartnerId to the correct value');
      });
      describe('when filter.deliveryStatus === Rejected', () => {
        it('should set worksFilter.deliveredTo.deliveryPartnerId to the correct value');
      });
      describe('when filter.deliveryStatus === Other', () => {
        it('should set worksFilter.deliveredTo.deliveryPartnerId to the correct value');
      });
    });
    describe('when orWorksFilter array contains values', () => {
      it('should set worksFilter.$or to the correct value');
    });
    describe('when workIds array has been passed', () => {
      describe('when workIds array contains values', () => {
        describe('when filter.tab === deliveryStatuses', () => {
          it('should set worksFilter._id to the correct value');
        });
        describe('when filter.tab !== deliveryStatuses', () => {
          it('should set worksFilter.$or to the correct value');
        });
      });
    });
  });
  describe('#foundIdInArray', () => {
    describe('when searchObject[searchArray] is an array', () => {
      describe('when id exists in array', () => {
        it('should return true');
      });
      describe('when id does not exists in array', () => {
        it('should return false');
      });
    });
    describe('when searchObject[searchArray] is not an array', () => {
      it('should return false');
    });
  });
});
