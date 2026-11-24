process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const sgMail = require('@sendgrid/mail');
const SendEmail = require('../../../libs/sendEmail');
const Parent = require('../../../models/parent');

describe('sendEmail', () => {
  logger.info('>>>file>>>> unit/libs/sendEmail .....................');

  beforeEach(() => {
    sinon.stub(sgMail, 'send').yields(null, 'success');
    sinon.stub(Parent, 'findById').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('genericComplete', () => {
    it('should call send mail with expected params', (done) => {
      const email = testUtils.randomString();
      const client = { fugaIntegration: { statementNotifications: email } };
      const subject = testUtils.randomString();
      const mainText = testUtils.randomString();
      const expectedMessage = {
        to: email,
        from: 'Curve Royalties <noreply@curveroyaltysystems.com>',
        subject,
        html: mainText,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
      };

      SendEmail.genericComplete(email, client, subject, mainText, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.equal('success');
        expect(sgMail.send.calledOnce).to.be.true;
        expect(sgMail.send.args[0][0]).to.contain(expectedMessage);
        expect(sgMail.send.args[0][0].substitutions.supportEmail).to.eq('royalties-support@fuga.com');
        done();
      });
    });
  });
});
