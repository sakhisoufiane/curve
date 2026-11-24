process.env.NODE_ENV = 'test';
const sinon = require('sinon');
require('../../../models/db');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const chai = require('chai');
const DeliveryPartner = require('../../../controllers/deliveryPartner');
chai.use(require('sinon-chai'));

const { expect } = chai;

describe('DeliveryPartnerController', () => {
  logger.info('\n\n**** .test/unit/controllers/deliveryPartner.unit.test.js');

  const error = { message: 'some error' };

  afterEach(() => {
    sinon.restore();
  });

  describe('paramsToFilterField', () => {
    describe('when user has clientId', () => {
      it('should add clientId to the params object');
    });
    describe('when inputParams has text property', () => {
      it('should add a name property to the params object with a regex pattern based on inputParams.text');
    });
    describe('when user does not have clientId', () => {
      it('should not add clientId to the params object');
    });
    describe('when inputParams does not have text property', () => {
      it('should not add a name property to the params object');
    });
    it('should return params');
  });

  describe('calculateDaysTillDelivery', () => {
    describe('when deliverySchedule.scheduleType is "Month"', () => {
      describe('when deliverySchedule.scheduleDay is greater than days in the current month', () => {
        it('should set currentMonthDeliveryDate to the last day of the current month');
      });
      describe('when deliverySchedule.scheduleDay is within the current month', () => {
        it('should set currentMonthDeliveryDate to the deliverySchedule.scheduleDay of the current month');
      });
      describe('when deliverySchedule.scheduleDay is greater than days in the next month', () => {
        it('should set nextMonthDeliveryDate to the last day of the next month');
      });
      describe('when deliverySchedule.scheduleDay is within the next month', () => {
        it('should set nextMonthDeliveryDate to the deliverySchedule.scheduleDay of the next month');
      });
      describe('when currentDate is on or after the currentMonthDeliveryDate', () => {
        it('should calculate days till next month delivery');
      });
      describe('when currentDate is before the currentMonthDeliveryDate', () => {
        it('should calculate days till current month delivery');
      });
    });

    describe('when deliverySchedule.scheduleType is "Week"', () => {
      describe('when currentDay is 0', () => {
        it('should set currentDay to 7');
      });
      describe('when currentDay is less than deliveryDay', () => {
        it('should calculate days till delivery within the same week');
      });
      describe('when currentDay is greater than or equal to deliveryDay', () => {
        it('should calculate days till delivery in the next week');
      });
    });
    it('should return daysTillDelivery');
  });

  describe('getDeliveryPartners', () => {
    it('should return an array of delivery partners with relevant data and pagination metadata');

    describe('when no delivery partners are found', () => {
      it('should return an empty array and appropriate metadata');
    });

    describe('paginationParams', () => {
      it('should set default values for page, limit, sort, and select when not provided in the request');
      it('should use provided values for page, limit, sort, and select from the request');
    });

    describe('calculating latestDelivery for each delivery partner', () => {
      it('should find the most recent CwrDelivery for each delivery partner');
    });

    describe('retrieving delivery schedules for each delivery partner', () => {
      it('should fetch all delivery schedules associated with each delivery partner');
    });

    describe('processing active delivery schedules', () => {
      it('should filter active delivery schedules for each delivery partner');
      it('should calculate days till delivery for each active delivery schedule');
      it('should sort the active delivery schedules based on days till delivery');
    });

    describe('determining the next delivery date', () => {
      it('should set the next delivery date based on the soonest active delivery schedule');
      it('should set the next delivery date to undefined if no active delivery schedules');
    });

    describe('determining the status of each delivery partner', () => {
      it('should set status to "none" if no delivery schedules are associated');
      it('should set status to "inactive" if all associated delivery schedules are inactive');
      it('should set status to "active" if at least one associated delivery schedule is active');
    });

    describe('formatting and sorting the results', () => {
      it('should format the results with relevant data for each delivery partner');
      it('should sort the results based on the original order of delivery partners from the database');
    });
  });

  describe('uploadFtpKeyfile', () => {
    it('should upload file to s3 and return delivery partner', async () => {
      const deliveryPartnerMock = { _id: randomId() };
      const deliveryPartner = { ...deliveryPartnerMock, save: sinon.stub().resolves(deliveryPartnerMock) };
      const file = { originalname: randomString() };
      sinon.stub(fileManager, 'uploadToS3').yields();

      const result = await DeliveryPartner.uploadFtpKeyfile({ deliveryPartner, file });

      expect(fileManager.uploadToS3).to.have.been.calledOnceWith(`deliveryPartners/${deliveryPartner._id.toString()}/${file.originalname}`, file.buffer);
      expect(result).to.deep.equal(deliveryPartnerMock);
    });

    it('should throw error when failure uploading file to s3', async () => {
      const deliveryPartnerMock = { _id: randomId() };
      const deliveryPartner = { ...deliveryPartnerMock, save: sinon.stub().yields(error, deliveryPartnerMock) };
      const file = { originalname: randomString() };
      sinon.stub(fileManager, 'uploadToS3').yields();

      try {
        await DeliveryPartner.uploadFtpKeyfile({ deliveryPartner, file });
      } catch (error) {
        expect(fileManager.uploadToS3).to.have.been.calledOnceWith(`deliveryPartners/${deliveryPartner._id.toString()}/${file.originalname}`, file.buffer);
        expect(error).to.deep.equal(error);
      }
    });

    it('should throw error when failure saving delivery partner', async () => {
      const deliveryPartnerMock = { _id: randomId() };
      const deliveryPartner = { ...deliveryPartnerMock, save: sinon.stub().yields(null, deliveryPartnerMock) };
      const file = { originalname: randomString() };
      sinon.stub(fileManager, 'uploadToS3').yields(error);

      try {
        await DeliveryPartner.uploadFtpKeyfile({ deliveryPartner, file });
      } catch (error) {
        expect(fileManager.uploadToS3).to.have.been.calledOnceWith(`deliveryPartners/${deliveryPartner._id.toString()}/${file.originalname}`, file.buffer);
        expect(error).to.deep.equal(error);
      }
    });
  });

  describe('deleteFtpKeyFile', () => {
    it('should delete file from s3', async () => {
      const deliveryPartnerMock = { _id: randomId(), ftpFileKey: randomString() };
      sinon.stub(fileManager, 'deleteFromS3').yields();

      const result = await DeliveryPartner.deleteFtpKeyFile({ key: deliveryPartnerMock.ftpFileKey });

      expect(fileManager.deleteFromS3).to.have.been.calledOnceWith(deliveryPartnerMock.ftpFileKey);
      expect(result).to.eql(deliveryPartnerMock.ftpFileKey);
    });

    it('should throw error when failure deleting file from s3', async () => {
      const deliveryPartnerMock = { _id: randomId(), ftpFileKey: randomString() };
      sinon.stub(fileManager, 'deleteFromS3').yields(error);

      try {
        await DeliveryPartner.deleteFtpKeyFile({ key: deliveryPartnerMock.ftpFileKey });
      } catch (error) {
        expect(fileManager.deleteFromS3).to.have.been.calledOnceWith(deliveryPartnerMock.ftpFileKey);
        expect(error).to.deep.equal(error);
      }
    });
  });
});
