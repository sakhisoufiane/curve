process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');

const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const SendEmail = require('../../../libs/sendEmail');
const Notification = require('../../../models/notification');
const User = require('../../../models/user');

chai.use(require('sinon-chai'));

describe('Notification', () => {
  logger.info('::::file:::: unit/models/notification .....................');

  let options;
  let userStub;
  let loggerStub;
  let clientId;
  let name;

  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    clientId = randomId();
    userStub = sandbox.stub(User, 'findById');
    loggerStub = sandbox.stub(logger, 'info');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should log no notification generated if email not provided in curve user', async () => {
    const curveUserMock = {
      id: clientId,
      clientId,
    };
    options = { curveUser: curveUserMock };
    userStub.resolves();

    await Notification.generate(name, null, null, curveUserMock, options);

    expect(userStub).to.have.been.calledWith(clientId);
    expect(loggerStub).to.have.been.called;
    expect(loggerStub).to.have.been.calledWith(`No notification generated, User not found ${clientId}`);
  });

  it('should log no notification generated if options curve user not provided', () => {
    const curveUserMock = {
      id: clientId,
      clientId,
    };
    options = {};
    userStub.resolves();

    Notification.generate(name, null, null, curveUserMock, options, () => {
      expect(userStub).to.have.been.calledWith(clientId);
      expect(loggerStub).to.have.been.called;
      expect(loggerStub).to.have.been.calledWith(`No notification generated, User not found ${clientId}`);
    });
  });

  it('should call send email for notification', () => {
    const curveUserMock = {
      id: clientId,
      clientId,
      email: randomString(),
    };
    options = { curveUser: curveUserMock, identifier: 'exportDownload' };
    userStub.resolves();
    SendEmail.exportDownload = sandbox.stub().returns();

    Notification.generate(name, null, null, curveUserMock, options, () => {
      expect(userStub).to.have.been.calledWith(clientId);
      expect(SendEmail.exportDownload).to.have.been.calledWith(curveUserMock, null, null, null, sinon.match.func);
    });
  });

  it('should generate generic email notification and call send email', () => {
    const curveUserMock = { id: clientId, clientId, email: randomString() };
    const subject = randomString();
    options = { curveUser: curveUserMock, identifier: 'genericEmail', email: randomString(), client: {}, mainText: randomString() };
    userStub.resolves();
    sinon.stub(SendEmail, 'genericEmail').yields();

    Notification.generate('Statements Published', subject, null, curveUserMock, options, () => {
      expect(userStub).to.have.been.calledWith(clientId);
      expect(SendEmail.genericEmail).to.have.been.calledWith(options.email, options.client, options.subject, options.mainText, sinon.match.func);
    });
  });
});
