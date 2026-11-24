process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const sinon = require('sinon');
const util = require('util');
require('../../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WorkController } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const rewire = require('rewire');
const { separateWorkByValidationErrors } = require('../../../controllers/work');

describe('Work', () => {
  beforeEach((done) => {
    done();
  });
  describe('workSearchParams', () => {
    it('should have the correct searchIndex value');
    it('should have the correct filterItems');

    it('should have the correct payeeFilterFields');
    it('should have the correct textSearchFields');
  });

  describe('significantUpdateCheck', () => {
    describe('rightsChainObjectSort', () => {
      it('should return -1 if the first truthy value between a.publisherId and a.composerId is less than the first truthy value between b.publisherId and b.composerId');
      it('should return 1 if the first truthy value between a.publisherId and a.composerId is not less than the first truthy value between b.publisherId and b.composerId');
      describe('when no item[child] exists', () => {
        it('should delete item[child]');
      });

      describe('if item and item.children exist and item.children.length is greater than 0', () => {
        it('should call sort on item.children');
        it('should loop through item.children and call rightsChainObjectSort with the next item.children passed as a param until all item.children are sorted');
      });
    });

    describe('rightChainSort', () => {
      it('should create deep copies of arrOrg as arr using JSON.parse and JSON.stringify');
      it('should apply rightsChainObjectSort on every item in the array and return a sorted array');
    });

    describe('compareObjectArrays', () => {
      it('should create deep copies of arrOrg1 and arrOrg2 as arr1 and arr2 using JSON.parse and JSON.stringify');
      it('should check if the current element of arr1 has an identical match in arr2');
      it('should set objectFound to true and store the index of the matching element in indexEliminate if an identical match is found');
      it('should return false if no identical match is found for the current element of arr1');
      it('should remove the matched element from arr2 using indexEliminate');
      it('should continue iterating through arr1 until all elements have been checked');
      it('should return true if all elements in arr1 have identical matches in arr2 and arr2 is empty after the process');
      it('should return false if arr2 is not empty after the process');
    });

    describe('when oldwork.title does not equal work.title', () => {
      it('should push "title" to the significantUpdateChanges array');
    });

    describe('when oldWork.alternateTitles is different from work.alternateTitles', () => {
      it('should push "alternativeTitles" to the significantUpdateChanges array');
    });

    describe('when oldWork.performers is different from work.performers', () => {
      it('should push "performers" to the significantUpdateChanges array');
    });

    describe('when oldWork.trackIds is different from work.trackIds', () => {
      it('should push "trackIds" to the significantUpdateChanges array');
    });

    describe('when oldRightsChainSorted is different from newRightsChainSorted', () => {
      it('should push "rightsChain" to the significantUpdateChanges array');
    });
    it('should return significicantUpdate changes array');
  });

  describe('getSingleWorkDeliveries', () => {
    describe('when no work exists', () => {
      it('should throw error: "A work is required to get the list of deliveries');
    });
    it('should find all Delivery Partners by the work.clientId');
    describe('when partners are found', () => {
      it('should process all partners in batches of 10 assigning partner to deliveryPartner and "Undelivered" to status');
      it('should process all partners in batches of 10, assigning null to all other values');

      describe('when a matching deliveredTo entry exists on the work', () => {
        it('should populate originalDelivery, lastUpdate, and identifier from the deliveredTo entry');

        describe('when status does not exist or is Delivered', () => {
          it('should assign delivery.status to "Delivered"');
        });

        describe('when status is an ACK status', () => {
          it('should set delivery.lastAcknowledgment and cwrAcknowledgementId from the deliveredTo entry');

          describe('when DeliveredWorkController.ackDeliveryStatuses.Accepted includes status', () => {
            it('should update delivery.status to "Accepted"');
          });

          describe('when DeliveredWorkController.ackDeliveryStatuses.Rejected includes status', () => {
            it('should update delivery.status to "Rejected"');
          });

          describe('when status is not Accepted or Rejected', () => {
            it('should set delivery.status to "Other"');
          });
        });
      });
      describe('when work.forceRedelivery includes partner._id or work.inFutureDelivery includes partner._id', () => {
        it('should set delivery.status to "Queued');
      });
      describe('when work.holdRedelivery includes partner._id', () => {
        it('should set delivery.status to "On Hold');
      });
      it('should push delivery to deliveries');
    });
    it('should return sorted deliveries array');
  });

  describe('WorkController.updateDeliveryStatus', () => {
    describe('when newStatus is "Force Delivery"', () => {
      it('should add deliveryPartner._id to work.forceRedelivery if not already present');
      it('should remove deliveryPartner._id from work.holdRedelivery if present');
    });

    describe('when newStatus is "Resume"', () => {
      it('should remove deliveryPartner._id from work.holdRedelivery if present');
    });

    describe('when newStatus is "Hold"', () => {
      it('should add deliveryPartner._id to work.holdRedelivery if not already present');
      it('should remove deliveryPartner._id from work.inFutureDelivery if present');
    });

    describe('when newStatus is not "Force Delivery", "Resume", or "Hold"', () => {
      it('should clear the work delivery array for the specified delivery partner');

      describe('when an existing DeliveredWork record exists for the work/partner', () => {
        it('should update the existing deliveredWork status to newStatus');
        it('should save the updated deliveredWork');
      });

      describe('when no DeliveredWork record exists for the work/partner', () => {
        it('should create a new deliveredWork with the specified properties');
        it('should save the new deliveredWork');
      });

      it('should add a log entry to the DeliveryLogController');
      it('should sync the status to work.deliveredTo and save the work');
    });

    it('should save the updated work');
  });

  describe('WorkController.bulkUpdateDeliveryStatus', () => {
    it('should filter valid deliveryPartnerIds from the input');

    describe('when ids exist in the request body', () => {
      it('should filter valid workIds from the input');
    });

    describe('when ids do not exist in the request body', () => {
      it('should search for works using the provided filter and extract their ids');
    });

    describe('for each workId', () => {
      it('should find the work by ID');

      describe('for each deliveryPartnerId', () => {
        it('should clear the work delivery array for the specified delivery partner');

        describe('when a deliveredWork already exists', () => {
          it('should update the deliveredWork.status to deliveryStatus');
          it('should save the updated deliveredWork');
        });

        describe('when a deliveredWork does not exist', () => {
          it('should create a new deliveredWork with the specified properties');
          it('should save the new deliveredWork');
        });

        it('should add a log entry to the DeliveryLogController');
      });

      it('should save the updated work');
    });
  });

  describe('clearWorkDeliveryArray', () => {
    describe('when work.forceRedelivery includes deliveryPartnerId', () => {
      it('should remove deliveryPartnerId from work.forceRedelivery');
    });

    describe('when work.forceRedelivery does not include deliveryPartnerId', () => {
      it('should not modify work.forceRedelivery');
    });

    describe('when work.inFutureDelivery includes deliveryPartnerId', () => {
      it('should remove deliveryPartnerId from work.inFutureDelivery');
    });

    describe('when work.inFutureDelivery does not include deliveryPartnerId', () => {
      it('should not modify work.inFutureDelivery');
    });

    describe('when work.holdRedelivery includes deliveryPartnerId', () => {
      it('should remove deliveryPartnerId from work.holdRedelivery');
    });

    describe('when work.holdRedelivery does not include deliveryPartnerId', () => {
      it('should not modify work.holdRedelivery');
    });
  });

  describe('redeliverWorkIds', () => {
    describe('when filtered works', () => {
      describe('when action is "Force"', () => {
        describe('when work.forceRedelivery does not include deliveryPartnerId', () => {
          it('should add deliveryPartnerId to work.forceRedelivery');
        });

        describe('when work.holdRedelivery includes deliveryPartnerId', () => {
          it('should remove deliveryPartnerId from work.holdRedelivery');
        });
      });

      describe('when action is "Hold"', () => {
        describe('when deliveryPartnerId does not include work.holdRedelivery', () => {
          it('should add deliveryPartnerId to work.holdRedelivery');
        });

        describe('when work.inFutureDelivery includes deliveryPartnerId', () => {
          it('should remove deliveryPartnerId from work.inFutureDelivery');
        });
      });

      describe('when action is "Resume"', () => {
        describe('when work.holdRedelivery includes deliveryPartnerId', () => {
          it('should remove deliveryPartnerId from work.holdRedelivery');
        });
      });
    });
  });

  describe('getStatuses', () => {
    describe('when query text exists', () => {
      describe('when using Atlas Search', () => {
        it('should return works matching the query');
        it('should include pagination meta data in the response');
      });
    });

    describe('when query text does not exist', () => {
      describe('when running query using usual filters', () => {
        it('should return works matching the filter criteria');
        it('should include the status and deliveryDate if available');
        it('should include pagination meta data in the response');
        it('should return only works if there are no combined data or delivered works');
        it('should combine data with delivered works if they exist');
      });
    });
  });

  describe('WorkController.deliveryStatuses', () => {
    describe('when called with valid request and pagination params', () => {
      it('should return an object with a "works" property');
      it('should return an object with a "meta" property');
    });
  });

  describe('asyncCreateInTemplate', () => {
    it('should create an xlsx file using the provided formedData and template');
  });

  describe('deliveryStatusesCreateExportXlsx', () => {
    it('should return a file path');
    it('should use the "deliveryStatuses" template');
    it('should call asyncCreateInTemplate with the correct arguments');
  });

  describe('asyncAddData', () => {
    it('should add data to the writer and resolve');
  });

  describe('deliveryStatusesCreateExportCsv', () => {
    it('should create a CSV file with the correct headers');
    it('should call asyncAddData with the correct arguments');
    it('should return the file path of the created CSV file');
  });

  describe('formDeliveryStatusesExportData', () => {
    it('should format delivery status export data for a given client and delivery partner');
    it('should format delivery status export data with null dates if originalDelivery or lastAcknowledgment are not present');
    it('should format delivery status export data with an empty string for the rejection message if work is not rejected');
    it('should format delivery status export data with the rejection message if work is rejected');
  });

  describe('asyncUploadToS3', () => {
    it('should upload a file to S3 for the given client');
    it('should reject with an error if there is a problem with the S3 upload');
  });

  describe('asyncPublicLink24Hours', () => {
    it('returns a promise that resolves to a public link valid for 24 hours');
    it('rejects the promise if there was an error creating the public link');
  });

  describe('asyncNotificationGenerate', () => {
    it('should generate a notification for a client with a link to the export');
    it('should reject with an error if there was an error generating the notification');
  });

  describe('WorkController.exportDeliveryStatuses', () => {
    it('should create an Excel file if count is less than 3000');
    it('should create a CSV file if count is more than 3000');
    it('should upload the file to S3');
    it('should generate a public link for the file');
    it('should generate a notification for the user');
  });

  describe('WorkController.paramsToFilterField', () => {
    it('assigns user.contractIds to the salesReturnsRights.contractId in the params object for a user with payeeId and contractIds');
    it('assigns an empty array to salesReturnsRights.contractId in the params object for a user with a payeeId but no contractIds');
    it('assigns user.clientId to the clientId in the params object for a user with a clientId');
    it('assigns an array of ObjectIds to the _id in the params object when inputParams.ids exists');
    it('assigns { $ne: inputParams.deliveryPartnerId } to deliveredToPartners in the params object when inputParams.deliveryStatus is "Undelivered" and inputParams.deliveryPartnerId exists');
    it('assigns inputParams.deliveryPartnerId to forceRedelivery in the params object when inputParams.deliveryStatus is "Queued" and inputParams.deliveryPartnerId exists');
    it('creates a $or condition for holdRedelivery and onHold in the params object when inputParams.deliveryStatus is "On Hold" and inputParams.deliveryPartnerId exists');
    it('creates a $or condition in the params object for multiple fields matching inputParams.text');
    it('adds ObjectId of inputParams.text to the $or condition in the params object when inputParams.text is a valid ObjectId');
    it('assigns inputParams.catalogueGroups to the catalogueGroups in the params object when provided');
    it('assigns inputParams.contractIds to the salesReturnsRights.contractId in the params object when provided');
    it('assigns inputParams.composerIds to the usedComposerIds in the params object when provided');
    it('assigns inputParams.workIds to the _id in the params object when provided');
    it('assigns inputParams.publisherIds to the usedPublisherIds in the params object when provided');
    it('assigns true to onHold in the params object when inputParams.onHold is "true" or true');
    it('assigns false to onHold in the params object when inputParams.onHold is "false" or false');
    it('assigns inputParams.approvalStatus to the approvalStatus in the params object when provided');
    it('creates a createdAt condition in the params object based on inputParams.createdAfter and inputParams.createdBefore when either or both exist');
    it('adjusts the params object based on the returned filter from utils.paramsToFilterParticipation');
    it('adjusts the params object based on the returned filter from utils.paramsToFilterOwnership');
  });

  describe('separateWorkByValidationErrors', () => {
    it('should separate the work into an array with the same length as the validation errors', () => {
      const data = {
        _id: randomId(),
        title: randomString(),
        iswc: randomString(),
        composer: randomString(),
        validationErrors: ['Tunecode is required to be unique', 'ISWC is required to be unique'],
      };
      const results = separateWorkByValidationErrors(data);

      expect(results).has.length(2);
      expect(results[0]).to.deep.equal({
        _id: data._id,
        title: data.title,
        iswc: data.iswc,
        composer: data.composer,
        validationError: 'Tunecode is required to be unique',
      });
      expect(results[1]).to.deep.equal({
        _id: data._id,
        title: data.title,
        iswc: data.iswc,
        composer: data.composer,
        validationError: 'ISWC is required to be unique',
      });
    });

    it('Should return 1 work if there\'s one validation error', () => {
      const data = {
        _id: randomId(),
        title: randomString(),
        iswc: randomString(),
        composer: randomString(),
        validationErrors: ['Tunecode is required to be unique'],
      };
      const results = separateWorkByValidationErrors(data);

      expect(results).has.length(1);
      expect(results[0]).to.deep.equal({
        _id: data._id,
        title: data.title,
        iswc: data.iswc,
        composer: data.composer,
        validationError: 'Tunecode is required to be unique',
      });
    });

    it('Should return no work if there\'s no validation error', () => {
      const data = {
        _id: randomId(),
        title: randomString(),
        iswc: randomString(),
        composer: randomString(),
        validationErrors: [],
      };
      const results = separateWorkByValidationErrors(data);

      expect(results).has.length(0);
    });
  });
});
