process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const Period = require('../../../models/period');
const Statement = require('../../../models/statement');
const Notification = require('../../../models/notification');

const StatementController = require('../../../controllers/statement');

describe('Statement Controller', () => {
  logger.info('\n\n**** .test/unit/controllers/statement.controller.test.js');

  const email1 = randomString();
  const email2 = randomString();
  const curveUser = { _id: randomId() };

  beforeEach(() => {
    sinon.stub(Statement, 'find');
    sinon.stub(Statement, 'findById');
    sinon.stub(Period, 'findById');
    Period.findById.returns();
    sinon.stub(Notification, 'generate');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#sendAllStatementsPublishedEmail', () => {
    it('should send published notification email when period provided', async () => {
      const client = { _id: randomId(), fugaIntegration: { statementNotifications: email1 } };
      const period = { _id: randomId(), year: randomString(), accountingPeriod: randomString() };
      const curveUser = { _id: randomId() };
      const ids = [];
      // Statement.find({ clientId: client._id, periodId }, 'status').lean().exec();
      Statement.find.returns({ lean: () => ({ exec: sinon.stub().resolves([{ _id: randomId(), status: 'Published' }]) }) });
      Period.findById.returns({ lean: () => ({ exec: sinon.stub().resolves(period) }) });
      Notification.generate.yields({});

      await StatementController.sendAllStatementsPublishedEmail({ client, period, curveUser, ids });

      expect(Statement.find).to.have.been.calledOnce;
      expect(Notification.generate).to.have.been.calledOnce;
      expect(Notification.generate.args[0][0]).to.eq('Statements Published');
      expect(Notification.generate.args[0][1]).to.eq(`Your Splits Statement Period ${period.year} ${period.accountingPeriod} is Ready for Review`);
      expect(Notification.generate.args[0][3]).to.eq(curveUser);
      expect(Notification.generate.args[0][4].identifier).to.eq('genericEmail');
      expect(Notification.generate.args[0][4].email).to.eq(email1);
    });

    it('should send published notification emails to all recipients', async () => {
      const client = { _id: randomId(), fugaIntegration: { statementNotifications: `${email1},${email2}` } };
      const period = { _id: randomId(), year: randomString(), accountingPeriod: randomString() };
      const ids = [];
      Statement.find.returns({ lean: () => ({ exec: () => [{ _id: randomId(), status: 'Published' }] }) });
      Period.findById.returns({ lean: () => ({ exec: () => period }) });
      Notification.generate.yields({});

      await StatementController.sendAllStatementsPublishedEmail({ client, period, curveUser, ids });

      expect(Notification.generate).to.have.been.calledTwice;
      expect(Notification.generate.args[0][4].email).to.eq(email1);
      expect(Notification.generate.args[1][4].email).to.eq(email2);
    });

    it('should send published notification email when ids provided ', async () => {
      const client = { _id: randomId(), fugaIntegration: { statementNotifications: email1 } };
      const period = { _id: randomId(), year: randomString(), accountingPeriod: randomString() };
      const ids = [randomId()];
      Statement.findById.returns({ lean: () => ({ exec: () => ({ _id: randomId(), periodId: randomId() }) }) });
      Statement.find.returns({ lean: () => ({ exec: () => [{ _id: randomId(), status: 'Published' }] }) });
      Period.findById.returns({ lean: () => ({ exec: () => period }) });
      Notification.generate.yields({});

      await StatementController.sendAllStatementsPublishedEmail({ client, period: null, curveUser, ids });

      expect(Notification.generate).to.have.been.calledOnce;
    });

    it('should not send published notification email when not all statements published ', async () => {
      const client = { _id: randomId(), fugaIntegration: { statementNotifications: email1 } };
      const period = { _id: randomId(), year: randomString(), accountingPeriod: randomString() };
      const ids = [randomId()];
      Statement.findById.returns({ lean: () => ({ exec: () => ({ _id: randomId(), periodId: randomId() }) }) });
      Statement.find.returns({ lean: () => ({ exec: () => [{ _id: randomId(), status: 'Processing' }] }) });
      Period.findById.returns({ lean: () => ({ exec: () => period }) });

      await StatementController.sendAllStatementsPublishedEmail({ client, period: null, curveUser, ids });

      expect(Notification.generate).not.to.have.been.called;
    });
  });

  describe('#setStatementStatus', () => {
    it('should build correct filter for statements with ids', async () => {
      const clientId = randomId();
      const period = {};
      const status = 'Published';
      const ids = [randomId(), randomId()];
      Statement.find.returns({ sort: () => ({ limit: () => [] }) });

      try {
        await StatementController.setStatementStatus({ clientId, period, status, ids });
      } catch (error) {
        expect(Statement.find).to.have.been.calledOnce;
        expect(Statement.find.args[0][0].clientId).to.eq(clientId);
        expect(Statement.find.args[0][0].$and).to.deep.eq([{ _id: { $in: ids } }]);
        expect(error.message).to.contain('No Statements found');
      }
    });

    it('should build correct filter for statements with period id', async () => {
      const clientId = randomId();
      const period = { _id: randomId() };
      const status = 'Published';
      const ids = [randomId(), randomId()];
      Statement.find.returns({ sort: () => ({ limit: () => [] }) });

      try {
        await StatementController.setStatementStatus({ clientId, period, status, ids });
      } catch (error) {
        expect(Statement.find).to.have.been.calledOnce;
        expect(Statement.find.args[0][0].clientId).to.eq(clientId);
        expect(Statement.find.args[0][0].$and).to.deep.eq([{ periodId: period._id.toString() }, { _id: { $in: ids } }]);
        expect(error.message).to.contain('No Statements found');
      }
    });
  });
});
