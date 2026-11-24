process.env.NODE_ENV = 'test';
const { logger, testUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');
const moment = require('moment');
const { expect } = require('chai');
const rewire = require('rewire');
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const Invoice = require('../../../models/invoice');

let Billing;

let client;

describe('Billing', () => {
  logger.info('>>>file>>>> unit/models/release .....................');

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    Billing = rewire('../../../libs/billing');
    client = new Client({ name: testUtils.randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
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

  describe('getCustomerId', () => {
    describe('when the client has a customerId', () => {
      it('should return the customerId', async () => {
        // Arrange
        client.billing = { stripeCustomerId: testUtils.randomString() };
        // Act
        const customerId = await Billing.getCustomerId(client);
        // Assert
        expect(customerId).to.eq(client.billing.stripeCustomerId);
      });
    });

    describe('when the client has no customerId', () => {
      const customerId = testUtils.randomString();
      beforeEach((done) => {
        sinon.stub(Client.prototype, 'save');
        Client.prototype.save.resolves(client);

        sinon.stub(Billing.__get__('Stripe').customers, 'create');
        Billing.__get__('Stripe').customers.create.resolves({ id: customerId });

        done();
      });

      it('should create a new Stripe Customer', async () => {
        // Act
        await Billing.getCustomerId(client);
        // Assert
        expect(Billing.__get__('Stripe').customers.create.called).to.be.true;
      });

      it('should return the customerId', async () => {
        // Act
        const customerId = await Billing.getCustomerId(client);
        // Assert
        expect(customerId).to.eq(customerId);
      });

      it('should save the customerId against the client', async () => {
        // Act
        await Billing.getCustomerId(client);
        // Assert
        expect(Client.prototype.save.called).to.be.true;
      });

      describe('when Stripe errors', () => {
        it('should return an error', async () => {
          // Arrange
          const error = new Error(testUtils.randomString());
          Billing.__get__('Stripe').customers.create.rejects(error);
          // Act
          await Billing.getCustomerId(client)
            .catch((err) => {
            // Assert
              expect(err).to.eq(error);
            });
        });
      });
    });
  });

  describe('getSetupIntents', () => {
    describe('when the client has a customerId', () => {
      const expectedSetupIntent = testUtils.randomString();
      beforeEach((done) => {
        sinon.stub(Billing.__get__('Stripe').setupIntents, 'create');
        Billing.__get__('Stripe').setupIntents.create.resolves(expectedSetupIntent);

        done();
      });

      it('should create a new Stripe setup intent', async () => {
        // Arrange
        client.billing = { stripeCustomerId: testUtils.randomString() };
        // Act
        await Billing.getSetupIntents(client);
        // Assert
        expect(Billing.__get__('Stripe').setupIntents.create.called).to.eq(true);
      });

      it('should return the setup intent', async () => {
        // Arrange
        client.billing = { stripeCustomerId: testUtils.randomString() };
        // Act
        const intent = await Billing.getSetupIntents(client);
        // Assert
        expect(intent).to.eq(expectedSetupIntent);
      });

      describe('when Stripe errors', () => {
        it('should return an error', async () => {
          // Arrange
          const expectedError = new Error(testUtils.randomString());
          client.billing = { stripeCustomerId: testUtils.randomString() };
          Billing.__get__('Stripe').setupIntents.create.rejects(expectedError);
          // Act
          await Billing.getSetupIntents(client)
            .catch((err) => {
            // Assert
              expect(err).to.eq(expectedError);
            });
        });
      });
    });

    describe('when the client has no billing object', () => {
      it('should return an error', async () => {
        // Arrange
        const expectedError = 'Client has no Stripe customer ID';
        sinon.stub(Billing, 'getCustomerId').resolves(client);
        // Act
        await Billing.getSetupIntents(client)
          .catch((err) => {
            // Assert
            expect(err.message).to.eq(expectedError);
          });
      });
    });

    describe('when the client has no customerId', () => {
      it('should return an error', async () => {
        // Arrange
        const expectedError = 'Client has no Stripe customer ID';
        client.billing = {};
        sinon.stub(Billing, 'getCustomerId').resolves(client);
        // Act
        Billing.getSetupIntents(client)
          .catch((err) => {
          // Assert
            expect(err.message).to.eq(expectedError);
          });
      });
    });
  });

  describe('updatePaymentMethod', () => {
    describe('when an intent is passed', () => {
      beforeEach((done) => {
        sinon.stub(Client.prototype, 'save');
        Client.prototype.save.resolves(client);
        done();
      });

      it('should update the payment method on the client', async () => {
        // Arrange
        const intent = { setupIntent: { payment_method: testUtils.randomString() } };
        // Act
        await Billing.updatePaymentMethod(client, intent);
        // Assert
        expect(client.billing.stripePaymentMethod).to.eq(intent.setupIntent.payment_method);
        expect(Client.prototype.save.called).to.be.true;
      });
    });

    describe('when no intent is passed', () => {
      it('should return an error', async () => {
        // Arrange
        const expectedError = 'A payment intent is required to update the client\'s payment method';
        // Act
        await Billing.updatePaymentMethod(client, null)
          .catch((err) => {
          // Assert
            expect(err.message).to.eq(expectedError);
          });
      });
    });
  });

  describe('retrievePaymentMethod', () => {
    describe('when the client has a payment method', () => {
      const expectedPaymentMethod = {
        card: {
          brand: 'Visa',
          expt_month: '09',
          expt_year: '2020',
          last4: 1221,
        },
      };
      beforeEach((done) => {
        sinon.stub(Billing.__get__('Stripe').paymentMethods, 'retrieve');
        Billing.__get__('Stripe').paymentMethods.retrieve.resolves(expectedPaymentMethod);
        sinon.stub(Billing, 'getCustomerId').resolves(client);

        done();
      });

      it('should return the payment method on file', async () => {
        // Arrange
        const expectedCard = {
          card: {
            brand: expectedPaymentMethod.card.brand.charAt(0).toUpperCase() + expectedPaymentMethod.card.brand.slice(1),
            exp_month: expectedPaymentMethod.card.exp_month,
            exp_year: expectedPaymentMethod.card.exp_year,
            last4: expectedPaymentMethod.card.last4,
          },
        };
        client.billing = { stripePaymentMethod: testUtils.randomString() };
        // Act
        const paymentMethod = await Billing.retrievePaymentMethod(client);
        // Assert
        expect(expectedCard).to.deep.eq(paymentMethod);
      });
      it('should not call getCustomerId', async () => {
        // Arrange
        const options = { skipGettingCustomerId: true };
        client.billing = { stripePaymentMethod: testUtils.randomString() };
        // Act
        await Billing.retrievePaymentMethod(client, options);
        // Assert
        expect(Billing.getCustomerId.called).to.be.false;
      });
      it('should call getCustomerId', async () => {
        // Arrange
        client.billing = { stripePaymentMethod: testUtils.randomString() };
        // Act
        await Billing.retrievePaymentMethod(client);
        // Assert
        expect(Billing.getCustomerId.called).to.be.true;
      });
    });

    describe('when the client has no payment method', () => {
      it('should return an empty callback', async () => {
        // Arrange
        const expectedError = 'Client has no payment method on file';
        sinon.stub(Billing, 'getCustomerId').resolves(client);
        // Act
        await Billing.retrievePaymentMethod(client)
          .catch((err) => {
            expect(err.message).to.eq(expectedError);
          });
      });
    });
  });

  describe('chargeClient', () => {
    const curveUser = {};
    const usage = {
      amount: testUtils.randomInt(),
      vat: testUtils.randomInt(),
    };
    let ignoreLastPaymentFailure = false;
    beforeEach((done) => {
      sinon.stub(Billing, 'getClientUsage');
      Billing.getClientUsage.resolves(usage);

      sinon.stub(Client.prototype, 'save');
      Client.prototype.save.resolves(client);

      sinon.stub(Billing.__get__('Stripe').paymentIntents, 'create');
      Billing.__get__('Stripe').paymentIntents.create.resolves();

      Billing.__set__('notifiyClientAfterChargeAttempt', sinon.stub());
      Billing.__get__('notifiyClientAfterChargeAttempt').returns();

      Billing.__set__('createInvoice', sinon.stub());
      Billing.__get__('createInvoice').resolves();

      done();
    });

    describe('when checking if the client is locked', () => {
      describe('when the client is already locked', () => {
        it('should not charge the client', async () => {
          // Arrange
          client.lockedForNonPayment = true;
          const expectedError = 'Client account already locked';
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err.message).to.eq(expectedError);
            });
        });
      });

      describe('when the client is locked but ignoreLastPaymentFailure is true', () => {
        it('should charge the client', async () => {
          // Arrange
          client.lockedForNonPayment = true;
          ignoreLastPaymentFailure = true;
          const expectedError = 'Client account already locked';
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err.message).to.not.eq(expectedError);
            });
        });
      });

      describe('when the client is not locked', () => {
        it('should charge the client', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          const expectedError = 'Client account already locked';
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err.message).to.not.eq(expectedError);
            });
        });
      });
    });

    describe('when checking the client billing type', () => {
      describe('when the client\'s payment method is not "Card"', () => {
        it('should not charge the client', async () => {
          // Arrange
          client.billing = { billingType: 'Invoice' };
          const expectedError = 'Billing type is not Card';
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err.message).to.eq(expectedError);
            });
        });
      });

      describe('when the client\'s payment method is "Card"', () => {
        it('should charge the client', async () => {
          // Arrange
          client.billing = { billingType: 'Card' };
          const expectedError = 'Billing type is not Card';
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err).to.not.eq(expectedError);
            });
        });
      });
    });

    describe('when checking if the payment is due', () => {
      describe('when the client has never been charged', () => {
        beforeEach((done) => {
          client.billing = { billingType: 'Card', lastPaymentDate: null };
          done();
        });

        describe('when the client has signed up >= 14 days ago', () => {
          it('should charge the client', async () => {
            // Arrange
            const expectedError = 'Payment not due';
            client.createdAt = moment().subtract(20, 'days').format();
            // Act
            await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
              .catch((err) => {
              // Assert
                expect(err).to.not.eq(expectedError);
              });
          });
        });

        describe('when the client has signed up < 14 days ago', () => {
          it('should not charge the client', async () => {
            // Arrange
            const expectedError = 'Payment not due';
            client.createdAt = moment().subtract(10, 'days').format();
            // Act
            await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
              .catch((err) => {
              // Assert
                expect(err.message).to.eq(expectedError);
              });
          });
        });
      });

      describe('when the client has been charged before', () => {
        beforeEach((done) => {
          client.billing = { billingType: 'Card' };
          done();
        });

        describe('when the client\'s last charge date is >= a month ago', () => {
          it('should charge the client', async () => {
            // Arrange
            const expectedError = 'Payment not due';
            client.billing.lastPaymentDate = moment().subtract(40, 'days').format();
            // Act
            await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
              .catch((err) => {
              // Assert
                expect(err.message).to.not.eq(expectedError);
              });
          });
        });

        describe('when the client\'s last charge date is < a month ago', () => {
          it('should not charge the client', async () => {
            // Arrange
            const expectedError = 'Payment not due';
            client.billing.lastPaymentDate = moment().subtract(20, 'days').format();
            // Act
            await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
              .catch((err) => {
              // Assert
                expect(err.message).to.eq(expectedError);
              });
          });
        });
      });
    });

    describe('when calculating the amount to charge', () => {
      describe('when the client has a set billing amount', () => {
        beforeEach((done) => {
          client.billing = {
            billingType: 'Card',
            lastPaymentDate: moment().subtract(40, 'days').format(),
            stripeCustomerId: testUtils.randomString(),
            stripePaymentMethod: testUtils.randomString(),
            amount: testUtils.randomInt(),
          };
          done();
        });

        it('should charge billing.amount', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const chargedAmount = Billing.__get__('Stripe').paymentIntents.create.args[0][0].amount;
          expect(chargedAmount).to.eq(client.billing.amount * 100);
        });
      });

      describe('when the client has not set billing amount', () => {
        beforeEach((done) => {
          client.billing = {
            billingType: 'Card',
            lastPaymentDate: moment().subtract(40, 'days').format(),
            stripeCustomerId: testUtils.randomString(),
            stripePaymentMethod: testUtils.randomString(),
          };
          done();
        });

        it('should call getClientUsage', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          // Assert
          expect(Billing.getClientUsage.called).to.be.true;
        });

        it('should set amount set to usage.amount + usage.vat', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          // Assert
          const chargedAmount = Billing.__get__('Stripe').paymentIntents.create.args[0][0].amount;
          const expectedChargeAmount = (usage.amount + usage.vat) * 100;
          expect(chargedAmount).to.be.eq(expectedChargeAmount);
        });

        it('should set the user usage', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const userUsage = Billing.__get__('createInvoice').args[0][1];
          expect(userUsage).to.deep.eq(usage);
        });
      });
    });

    describe('when charging the card', () => {
      beforeEach((done) => {
        client.billing = {
          billingType: 'Card',
          lastPaymentDate: moment().subtract(40, 'days').format(),
          stripeCustomerId: testUtils.randomString(),
          stripePaymentMethod: testUtils.randomString(),
        };
        done();
      });

      describe('when the client has no Stripe customer ID', () => {
        it('should return an error', async () => {
          // Arrange
          const expectedError = 'No Customer ID saved against the client.';
          delete client.billing.stripeCustomerId;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err.message).to.eq(expectedError);
            });
        });
      });

      describe('when the client has no payment method on file', () => {
        it('should return an error', async () => {
          // Arrange
          const expectedError = 'No Payment Method saved against the client.';
          delete client.billing.stripePaymentMethod;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch((err) => {
            // Assert
              expect(err.message).to.eq(expectedError);
            });
        });
      });

      it('should call Stripe.paymentIntents with the right args', async () => {
        // Arrange
        client.billing.currency = 'GBP';
        const expectedArgs = {
          amount: (usage.amount + usage.vat) * 100,
          currency: client.billing.currency,
          customer: client.billing.stripeCustomerId,
          payment_method: client.billing.stripePaymentMethod,
          off_session: true,
          confirm: true,
        };
        // Act
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        // Assert
        expect(Billing.__get__('Stripe').paymentIntents.create.calledWith(expectedArgs)).to.be.true;
      });

      describe('when Stripe.paymentIntents returns an error', () => {
        it('should set lastPaymentFailure to the error message', async () => {
          // Arrange
          const expectedError = new Error(testUtils.randomString());
          const rawError = { message: testUtils.randomString() };
          expectedError.raw = rawError;
          Billing.__get__('Stripe').paymentIntents.create.rejects(expectedError);
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure).catch(() => {
            // Assert
            expect(client.billing.lastPaymentFailure).to.eq(rawError.message);
          });
        });

        it('should set lockedForNonPayment to true', async () => {
          // Arrange
          const expectedError = { raw: { message: testUtils.randomString() } };
          Billing.__get__('Stripe').paymentIntents.create.rejects(expectedError);
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch(() => {
            // Assert
              expect(client.lockedForNonPayment).to.be.true;
            });
        });

        it('should notify the client', async () => {
          // Arrange
          const expectedError = { raw: { message: testUtils.randomString() } };
          Billing.__get__('Stripe').paymentIntents.create.rejects(expectedError);
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .catch(() => {
            // Assert
              expect(
                Billing.__get__('notifiyClientAfterChargeAttempt')
                  .calledWith(client, curveUser, usage.amount + usage.vat, 'GBP', true),
              ).to.be.true;
            });
        });
      });

      describe('when Stripe.paymentIntents doesn\'t return an error', () => {
        it('should set lastPaymentFailure to null', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .then(() => {
            // Assert
              expect(client.billing.lastPaymentFailure).to.be.null;
            });
        });

        it('should set lockedForNonPayment to false', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure)
            .then(() => {
            // Assert
              expect(client.lockedForNonPayment).to.be.false;
            });
        });

        it('should notify the client', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          // Assert
          expect(
            Billing.__get__('notifiyClientAfterChargeAttempt')
              .calledWith(client, curveUser, usage.amount + usage.vat, 'GBP', false),
          ).to.be.true;
        });

        it('should create an invoice', async () => {
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          // Assert
          expect(
            Billing.__get__('createInvoice')
              .calledWith(client, usage),
          ).to.be.true;
        });
      });
    });
  });

  describe('getClientUsage', () => {
    const amount = testUtils.randomInt();
    const nextTier = {};
    const contractsCount = testUtils.randomInt();
    const releasesCount = testUtils.randomInt();
    const tracksCount = testUtils.randomInt();
    const worksCount = testUtils.randomInt();
    let catalogueCount = releasesCount + tracksCount + worksCount;
    beforeEach((done) => {
      sinon.stub(Contract, 'countDocuments');
      Contract.countDocuments.resolves(contractsCount);

      sinon.stub(Release, 'countDocuments');
      Release.countDocuments.resolves(releasesCount);

      sinon.stub(Track, 'countDocuments');
      Track.countDocuments.resolves(tracksCount);

      sinon.stub(Work, 'countDocuments');
      Work.countDocuments.resolves(worksCount);

      Billing.__set__('getBillingAmountFromUsage', sinon.stub());
      Billing.__get__('getBillingAmountFromUsage').returns({ amount, nextTier });

      sinon.stub(Billing, 'getCustomerId').resolves(client);

      done();
    });

    it('should count the client\'s contracts', async () => {
      // Act
      await Billing.getClientUsage(client);
      // Assert
      expect(Contract.countDocuments.called).to.be.true;
    });

    it('should count the client\'s releases', async () => {
      // Act
      await Billing.getClientUsage(client);
      // Assert
      expect(Release.countDocuments.called).to.be.true;
    });

    it('should count the client\'s tracks', async () => {
      // Act
      await Billing.getClientUsage(client);
      // Assert
      expect(Track.countDocuments.called).to.be.true;
    });

    it('should count the client\'s works', async () => {
      // Act
      await Billing.getClientUsage(client);
      // Assert
      expect(Work.countDocuments.called).to.be.true;
    });

    it('should call getBillingAmountFromUsage with the right args', async () => {
      // Arrange
      client.paymentTier = 'Lite';
      const type = ['Publisher', 'Label'];
      client.clientType = type[Math.floor(Math.random() * type.length)];
      catalogueCount = client.clientType === 'Publisher' ? worksCount : (releasesCount + tracksCount + worksCount);
      // Act
      await Billing.getClientUsage(client);
      // Assert
      expect(Billing.__get__('getBillingAmountFromUsage').calledWith(
        client.clientType,
        client.paymentTier,
        contractsCount,
        catalogueCount,
        'GBP',
      )).to.be.true;
    });

    it('should return the client\'s usage', async () => {
      // Arrange
      const type = ['Publisher', 'Label'];
      client.clientType = type[Math.floor(Math.random() * type.length)];
      catalogueCount = client.clientType === 'Publisher' ? worksCount : (releasesCount + tracksCount + worksCount);
      const expectedUsage = {
        amount,
        vat: 0,
        contracts: contractsCount,
        catalogue: catalogueCount,
        nextBillingDate: moment(client.createdAt).add(14, 'days').format(),
        currencyToCharge: 'GBP',
        nextTier: { nextTierVat: 0 },
      };
      client.paymentTier = 'Lite';
      // Act
      const usage = await Billing.getClientUsage(client);
      // Assert
      expect(usage).to.deep.eq(expectedUsage);
    });
  });

  describe('notifiyClientAfterChargeAttempt', () => {
    const amount = testUtils.randomInt();
    const currency = 'GBP';
    const curveUser = {};

    beforeEach((done) => {
      sinon.stub(Billing.__get__('Notification'), 'generate');
      Billing.__get__('Notification').generate.returns();
      done();
    });

    describe('when the charge failed', () => {
      it('should notify the client', async () => {
        // Arrange
        client.billing.stripePaymentMethod = true;
        // Act
        Billing.__get__('notifiyClientAfterChargeAttempt')(client, curveUser, amount, currency, true);
        // Assert
        const expectedGenerateOptions = {
          identifier: 'genericError',
          curveUser,
          client,
          subject: 'Payment Failed',
          mainText: `Unfortunately we have failed to charge your card for the amount £${amount}. Please check your card details in your account under Settings > Billing, and try again.`,
          closingText: '',
        };
        expect(Billing.__get__('Notification').generate.calledWith(
          'Payment Failed',
          `Unfortunately we have failed to charge your card for the amount £${amount}. Please check your card details in your account under Settings > Billing, and try again.`,
          null,
          curveUser,
          expectedGenerateOptions,
        )).to.be.true;
      });
    });

    describe('when the charge is successful', () => {
      it('should notify the client', async () => {
        // Act
        Billing.__get__('notifiyClientAfterChargeAttempt')(client, curveUser, amount, currency, false);
        // Assert
        const expectedGenerateOptions = {
          identifier: 'genericComplete',
          curveUser,
          client,
          subject: 'Successful Payment',
          mainText: `You have successfully been charged £${amount} to your card on file. You can find you invoices and billing information in your account under Settings > Billing. As ever, thank you for your business!`,
        };

        expect(Billing.__get__('Notification').generate.calledWith(
          'Successful Payment',
          `You have successfully been charged £${amount} to your card on file. You can find you invoices and billing information in your account under Settings > Billing. As ever, thank you for your business!`,
          null,
          curveUser,
          expectedGenerateOptions,
        )).to.be.true;
      });
    });
  });

  describe('createInvoice', () => {
    const usage = {
      amount: testUtils.randomInt(),
      vat: testUtils.randomInt(),
    };
    beforeEach((done) => {
      const s3Key = testUtils.randomString();
      sinon.stub(fileManager, 'uploadToS3').yields(null, s3Key);
      sinon.stub(Invoice.prototype, 'save');
      Invoice.prototype.save.resolves();
      done();
    });

    it('should create an invoice with the right args', async () => {
      // Act
      await Billing.__get__('createInvoice')(client, usage);
      // Assert
      expect(Invoice.prototype.save.called).to.be.true;
    });
  });
});
