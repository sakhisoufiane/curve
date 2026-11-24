process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrUtils } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const DeliverySchedule = require('../../../../models/deliverySchedule');
const Work = require('../../../../models/work');
const Client = require('../../../../models/client');

let flushDeliveryQueuedStatus;

describe('flushDeliveryQueuedStatus', () => {
  logger.info('\n\n**** .test/unit/processes/scheduledDeliveries/flushDeliveryQueuedStatus.test.js');

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    flushDeliveryQueuedStatus = rewire('../../../../processes/scheduledDeliveries/flushDeliveryQueuedStatus');

    sinon.stub(Client, 'find');
    Client.find.resolves();

    sinon.stub(DeliverySchedule, 'find');
    DeliverySchedule.find.resolves();

    sinon.stub(Work, 'updateMany');
    Work.updateMany.resolves();

    sinon.stub(CwrUtils, 'getWorksMatchingFilter');
    CwrUtils.getWorksMatchingFilter.resolves();

    sinon.restore();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('flushDeliveryQueuedStatus.run', () => {
    let runAsCron; let clientId;

    beforeEach((done) => {
      runAsCron = undefined;
      clientId = undefined;
      done();
    });

    describe('when a clientId is passed', () => {
      it('should call Client.find once');
    });

    describe('when a clientId is not passed', () => {
      it('should call Client.find once');
    });

    describe('when two clients are the result of Client.find', () => {
      it('should call DeliverySchedule.find twice');
    });

    describe('when two clients are the result of Client.find', () => {
      it('should call Work.updateMany twice');
    });

    describe('when two clients are the result of Client.find', () => {
      it('should call CwrUtils.getWorksMatchingFilter twice');
    });

    describe('when two clients are the result of Client.find and one result of CwrUtils.getWorksMatchingFilter is not empty', () => {
      it('should call Work.updateMany three times');
    });

    describe('when a runAsCron is true', () => {
      it('should call setTimeout once');
    });
  });
});
