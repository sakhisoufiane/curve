process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const DeliverySchedule = require('../../../../models/deliverySchedule');
const Client = require('../../../../models/client');
const Work = require('../../../../models/work');
const User = require('../../../../models/user');
const SendEmail = require('../../../../libs/sendEmail');

let preDeliveryNotification;

describe('preDeliveryNotification', () => {
  logger.info('\n\n**** .test/unit/processes/scheduledDeliveries/preDeliveryNotification.test.js');

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    preDeliveryNotification = rewire('../../../../processes/scheduledDeliveries/preDeliveryNotification');

    sinon.stub(DeliverySchedule, 'find');
    DeliverySchedule.find.resolves();

    sinon.stub(Client, 'find');
    Client.find.resolves();

    sinon.stub(Work, 'countDocuments');
    Work.countDocuments.resolves();

    sinon.stub(User, 'find');
    User.find.resolves();

    sinon.stub(SendEmail, 'genericEmail');
    SendEmail.genericEmail.resolves();

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

  describe('preDeliveryNotification.notify', () => {
    let clientId;

    beforeEach((done) => {
      clientId = undefined;
      done();
    });

    describe('when a clientId is passed', () => {
      it('should call Client.find once using the clientId');
    });

    describe('when a clientId is not passed', () => {
      it('should call Client.find once without the clientId');
    });

    describe('when Client.find returns clients', () => {
      it('should call DeliverySchedule.find for each client');
    });

    describe('when DeliverySchedule.find returns deliverySchedules', () => {
      it('should call Work.countDocuments for each deliverySchedule');
    });

    describe('when Work.countDocuments returns worksCount', () => {
      it('should select the right body and subject for an email');
    });

    describe('when Work.countDocuments returns no worksCount', () => {
      it('should select the right body and subject for an email');
    });

    describe('when client.deliveryEmails is not empty', () => {
      it('should call User.find once');
    });

    describe('when User.find returns users', () => {
      it('should call SendEmail.genericEmail for every user');
    });
  });
});
