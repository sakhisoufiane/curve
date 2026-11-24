process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');

const Notification = require('../../../models/notification');
const User = require('../../../models/user');
const SendEmail = require('../../../libs/sendEmail');

describe('Notification', () => {
  logger.info('>>>file>>>> unit/models/Notification .....................');

  const notificationFields = {
    clientId: testUtils.randomId(),
    userId: testUtils.randomId(),
    name: testUtils.randomString(),
    description: testUtils.randomString(),
    link: testUtils.randomString(),
  };

  beforeEach((done) => {
    sinon.restore();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it('should have expected fields', () => {
    const notification = new Notification(notificationFields);
    expect(notification).to.contain(notificationFields);
  });

  it('should generate email notification and call send email', (done) => {
    const options = { identifier: 'reportDownload', client: { }, subject: 'test', email: 'email address', link: 'document link' };

    sinon.stub(User, 'findOne').resolves();
    sinon.stub(SendEmail, 'reportDownload').yields(null);

    Notification.generate('name', 'subject', 'public-key', options, () => {
      expect(User.findOne.called).to.be.true;
      expect(SendEmail.reportDownload.calledWith(options.email, options.client, options.subject, options.link)).to.be.true;
      done();
    });
  });

  it('should generate periodComplete email notification and call send email', (done) => {
    const name = testUtils.randomString();
    const options = { identifier: 'periodComplete', client: { }, subject: 'test', email: 'email address' };

    sinon.stub(User, 'findOne').resolves();
    sinon.stub(SendEmail, 'genericComplete').yields(null);

    Notification.generate(name, options.subject, null, options, () => {
      expect(User.findOne.called).to.be.true;
      expect(SendEmail.genericComplete.calledWith(options.email, options.client, options.subject)).to.be.true;
      done();
    });
  });
});
