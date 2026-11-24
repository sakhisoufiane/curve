process.env.NODE_ENV = 'test';
require('../../../models/db');
const { logger, fileManager, createXlsx, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { expect } = require('chai');
const sinon = require('sinon');
const async = require('async');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const Payee = require('../../../models/payee');
const Client = require('../../../models/client');
const Parent = require('../../../models/parent');
const Statement = require('../../../models/statement');
const Contract = require('../../../models/contract');
const ImportXlsx = require('../../../libs/importXlsx');
const Notification = require('../../../models/notification');
const ModelErrors = require('../../../libs/modelErrors');

// Intermitent failure in tests - needs investigation
describe('Payee', function () {
  logger.info('::::file:::: unit/models/payee .....................');

  let client;
  let client2;
  let parent;
  let payeeFields;
  let payee;
  let clientFindByIdStub;
  let clientBQStub;
  let parentFindByIdStub;

  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach(async () => {
    // Set up relations and payee
    // Set up Stubs
    clientBQStub = sinon.stub(Client.prototype, 'createBigQueryTables');
    clientBQStub.yields(null);
    sinon.stub(Client.prototype, 'createBigQueryBackups').yields();
    parentFindByIdStub = sinon.stub(Parent, 'findById');
    sinon.stub(Payee.prototype, 'isPayeePayable').resolves({});
    parentFindByIdStub.yields(null, {});
    client = new Client({ name: testUtils.randomString(), homeCurrency: 'GBP' });
    client2 = new Client({ name: testUtils.randomString() });
    parent = new Parent({ name: testUtils.randomString() });
    clientFindByIdStub = sinon.stub(Client, 'findById');

    // this was switched to resolves instead of yields as this is required by encryption when encrypted fields are used. Need to add yields for specific calls using onCall(x) when required
    clientFindByIdStub.resolves(client);
    await client.save();
    await parent.save();
    payeeFields = {
      clientId: client._id,
      name: testUtils.randomString(),
      alternateName: testUtils.randomString(),
      payeeCategories: testUtils.randomArray(),
      foreignId: testUtils.randomString(),
      projectId: testUtils.randomString(),
      supplierCode: testUtils.randomString(),
      contactEmail: testUtils.randomString(),
      address: testUtils.randomString(),
      country: 'GB',
      vatNo: testUtils.randomString(),
      bankName: testUtils.randomString(),
      bankAddress: testUtils.randomString(),
      accountNo: testUtils.randomString(),
      sortCode: testUtils.randomString(),
      iban: testUtils.randomString(),
      swiftCode: testUtils.randomString(),
      notes: testUtils.randomString(),
      duplicatedFrom: testUtils.randomString(),
      selfBillingTaxText: testUtils.randomString(),
      selfBillingTaxRate: testUtils.randomInt(),
      feesInvoiceTaxRate: testUtils.randomInt(),
      withholdingTaxRate: testUtils.randomInt(),
      withholdingTaxWording: testUtils.randomString(),
      createdBy: testUtils.randomId(),
      lastModifiedBy: testUtils.randomId(),
    };
    payee = new Payee(payeeFields);
    await payee.save();
    // @TODO: clientId should be set to a clientId rather than payee's id. Changing this to payee.clientId fails the tests. Needs further investigation
    client.inheritCatalogueFrom = [
      { clientId: payee._id.toString(), transferPayees: true },
    ];
    client.parentId = parent._id;
    await client.save();
    await client2.save();
  });

  afterEach((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  after((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  describe('fields', function () {
    it('should have a clientId parameter', function (done) {
      // Assert
      expect(payee.clientId).to.eq(client._id.toString());
      done();
    });

    it('should have a name parameter', function (done) {
      // Assert
      expect(payee.name).to.eq(payeeFields.name);
      done();
    });

    it('should have a alternateName parameter', function (done) {
      // Assert
      expect(payee.alternateName).to.eq(payeeFields.alternateName);
      done();
    });

    it('should have a payeeCategories parameter', function (done) {
      // Assert
      expect(payee.payeeCategories).to.deep.eq(payeeFields.payeeCategories);
      done();
    });

    it('should have a contactEmail parameter', function (done) {
      // Assert
      expect(payee.contactEmail).to.eq(payeeFields.contactEmail);
      done();
    });

    it('should have a foreignId parameter', function (done) {
      // Assert
      expect(payee.foreignId).to.eq(payeeFields.foreignId);
      done();
    });

    it('should have a projectId parameter', function (done) {
      // Assert
      expect(payee.projectId).to.eq(payeeFields.projectId);
      done();
    });

    it('should have a supplierCode parameter', function (done) {
      // Assert
      expect(payee.supplierCode).to.eq(payeeFields.supplierCode);
      done();
    });

    it('should have a address parameter', function (done) {
      // Assert
      expect(payee.address).to.eq(payeeFields.address);
      done();
    });

    it('should have a country parameter', function (done) {
      // Assert
      expect(payee.country).to.eq(payeeFields.country);
      done();
    });

    it('should have a vatNo parameter', function (done) {
      // Assert
      expect(payee.vatNo).to.eq(payeeFields.vatNo);
      done();
    });

    it('should have a bankName parameter', function (done) {
      // Assert
      expect(payee.bankName).to.eq(payeeFields.bankName);
      done();
    });

    it('should have a bankAddress parameter', function (done) {
      // Assert
      expect(payee.bankAddress).to.eq(payeeFields.bankAddress);
      done();
    });

    it('should have a accountNo parameter', function (done) {
      // Assert
      expect(payee.accountNo).to.eq(payeeFields.accountNo);
      done();
    });

    it('should have a sortCode parameter', function (done) {
      // Assert
      expect(payee.sortCode).to.eq(payeeFields.sortCode);
      done();
    });

    it('should have a iban parameter', function (done) {
      // Assert
      expect(payee.iban).to.eq(payeeFields.iban);
      done();
    });

    it('should have a notes parameter', function (done) {
      // Assert
      expect(payee.notes).to.eq(payeeFields.notes);
      done();
    });

    it('should have a duplicatedFrom parameter', function (done) {
      // Assert
      expect(payee.duplicatedFrom).to.eq(payeeFields.duplicatedFrom);
      done();
    });

    it('should have a selfBillingTaxText parameter', function (done) {
      // Assert
      expect(payee.selfBillingTaxText).to.eq(payeeFields.selfBillingTaxText);
      done();
    });

    it('should have a selfBillingTaxRate parameter', function (done) {
      // Assert
      expect(payee.selfBillingTaxRate).to.eq(payeeFields.selfBillingTaxRate);
      done();
    });

    it('should have a feesInvoiceTaxRate parameter', function (done) {
      // Assert
      expect(payee.feesInvoiceTaxRate).to.eq(payeeFields.feesInvoiceTaxRate);
      done();
    });

    it('should have a withholdingTaxRate parameter', function (done) {
      // Assert
      expect(payee.withholdingTaxRate).to.eq(payeeFields.withholdingTaxRate);
      done();
    });

    it('should have a withholdingTaxWording parameter', function (done) {
      // Assert
      expect(payee.withholdingTaxWording).to.eq(payeeFields.withholdingTaxWording);
      done();
    });

    it('should have a createdBy parameter', function (done) {
      // Assert
      expect(payee.createdBy.toString()).to.eq(payeeFields.createdBy);
      done();
    });

    it('should have a lastModifiedBy parameter', function (done) {
      // Assert
      expect(payee.lastModifiedBy.toString()).to.eq(payeeFields.lastModifiedBy);
      done();
    });
  });

  describe('validation', function () {
    describe('when the payee name is blank', function () {
      it('should return an error', function (done) {
        // Arrange
        const newPayee = new Payee({ clientId: client._id });

        // Act
        newPayee.save()
          .then((savedPayee) => {
            // Assert
            expect(savedPayee).to.not.exist;
            done('Should have thrown an error');
          })
          .catch((err) => {
            expect(err.message).to.eq('A Name is required');
            done();
          });
      });

      it('should call ModelErrors.map', function (done) {
        // Arrange
        const spy = sinon.spy(ModelErrors, 'map');
        const newPayee = new Payee({ clientId: client._id });

        // Act
        newPayee.save()
          .then((savedPayee) => {
            done('Should have thrown an error');
          }).catch(() => {
            expect(spy.called).to.be.true;
            spy.restore();
            done();
          });
      });
    });

    describe('when the payee name is not unique within the same client', function () {
      // Arrange
      const name = testUtils.randomString();
      let previousPayee;
      beforeEach(function (done) {
        previousPayee = new Payee({ name, clientId: client._id });
        previousPayee.save()
          .then(() => {
            done();
          }).catch(done);
      });

      it('should return an error', function (done) {
        const newPayee = new Payee({ name, clientId: client._id });
        // Act
        newPayee.save()
          .then((savedPayee) => {
            // Assert
            done('Should have thrown an error');
          })
          .catch((err) => {
            expect(err.message).to.eq('Name is required to be unique');
            done();
          });
      });

      it('should not save the payee', function (done) {
        const newPayee = new Payee({ name, clientId: client._id });
        // Act
        newPayee.save()
          .then(() => {
            Payee.findById(newPayee._id)
              .then((foundPayee) => {
                // Assert
                expect(foundPayee).to.not.exist;
                done();
              }).catch(done);
          })
          .catch(() => {
            done();
          });
      });
    });

    describe('when the payee name is not unique but on different clients', function () {
      // Arrange
      const name = testUtils.randomString();
      let previousPayee;

      beforeEach(async () => {
        previousPayee = new Payee({ name, clientId: client._id });
        await previousPayee.save();
      });

      it('should not return an error', function (done) {
        const newPayee = new Payee({ name, clientId: testUtils.randomId() });
        // Act
        newPayee.save()
          .then(() => {
            // Assert
            done();
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should save the payee', function (done) {
        // Arrange
        const clientId = testUtils.randomId();
        // Act
        Payee.deleteOne({ name, clientId })
          .then(() => {
            const newPayee = new Payee({ name, clientId });
            newPayee.save()
              .then(() => {
                Payee.findById(newPayee._id)
                  .then((foundPayee) => {
                    // Arrange
                    expect(foundPayee).to.exist;
                    done();
                  }).catch(done);
              }).catch(done);
          }).catch(done);
      });
    });

    describe('when the payee name is unique and present per client', function () {
      it('should call payee.updateCopyToCatalogueClients', function (done) {
        // Arrange
        const payee = new Payee({ name: `Payee ${Math.random().toString(36)}`, clientId: client._id });
        const spy = sinon.spy(payee, 'updateCopyToCatalogueClients');

        // Act
        payee.save()
          .then(() => {
            // Assert
            expect(spy.called).to.be.true;
            spy.restore();
            done();
          }).catch(done);
      });
    });
  });

  describe('deleteOne', function () {
    // Arrange
    let newPayee;
    beforeEach(function (done) {
      newPayee = new Payee({ name: `Test Payee ${Math.random().toString(36)}`, clientId: client._id });
      newPayee.save()
        .then(() => {
          const contract = new Contract({ name: 'contract', payees: [{ payeeId: newPayee._id.toString(), percentage: 100 }], clientId: client._id });
          contract.save()
            .then(() => {
              done();
            }).catch(done);
        }).catch(done);
    });

    describe('when payee has contract associated', function () {
      it('should return an error', function (done) {
        // Act
        newPayee.deleteOne()
          .then(() => {
            done('Should have thrown an error');
          }).catch((err) => {
            // Assert
            expect(JSON.parse(err.message).length).to.eq(1);
            done();
          });
      });

      it('should not delete the payee', function (done) {
        // Act
        newPayee.deleteOne()
          .then(() => {
            done('Should have thrown an error');
          }).catch((err) => {
            done();
          });
      });
    });

    describe('when payee has no contract associated', function () {
      it('should not return an error', function (done) {
        // Arrange
        const anotherPayee = new Payee({ name: `Test Payee ${Math.random().toString(36)}`, clientId: client._id });

        // Act
        anotherPayee.save()
          .then(() => {
            anotherPayee.deleteOne()
              .then(() => {
                // Assert
                done();
              }).catch(done);
          }).catch(done);
      });

      it('should delete the payee', function (done) {
        // Arrange
        const anotherPayee = new Payee({ name: `Test Payee ${Math.random().toString(36)}`, clientId: client._id });

        // Act
        anotherPayee.save()
          .then(() => {
            anotherPayee.deleteOne()
              .then(() => {
                Payee.findById(anotherPayee._id)
                  .then((foundPayee) => {
                    // Assert
                    expect(foundPayee).to.eq(null);
                    done();
                  }).catch(done);
              }).catch(done);
          }).catch(done);
      });
    });
  });

  describe('paramsToFilterField', function () {
    describe('passed input params and a curveUser', function () {
      it('should return an object', function (done) {
        // Arrange
        const inputParams = null;
        const clientId = testUtils.randomId();
        const curveUser = { clientId };

        // Act
        const result = Payee.paramsToFilterField(inputParams, curveUser);

        // Assert
        expect(typeof result).to.eq('object');
        done();
      });

      describe('when curveUser has a payeeId and contractIds', function () {
        it('should add an $and to the request', function (done) {
          // Arrange
          const inputParams = null;
          const curveUser = { payeeId: '123', contractIds: ['321'] };

          // Act
          const result = Payee.paramsToFilterField(inputParams, curveUser);

          // Assert
          expect(result.$and).to.exist;
          done();
        });
      });

      describe('when curveUser does not have a payeeId, but has a clientId', function () {
        it('should add clientId to the request', function (done) {
          // Arrange
          const inputParams = null;
          const clientId = testUtils.randomId();
          const curveUser = { clientId };

          // Act
          const result = Payee.paramsToFilterField(inputParams, curveUser);

          // Assert
          expect(result.clientId).to.eq(clientId);
          done();
        });
      });
      describe('when curveUser does not have a payeeId or a clientId', function () {
        it('should raise an error', function (done) {
          try {
            // Arrange
            const inputParams = null;
            const curveUser = {};

            // Act
            const result = Payee.paramsToFilterField(inputParams, curveUser);

            // Assert
            expect(result).to.not.exist;
          } catch (err) {
            // Assert
            expect(err.message).to.eq('curveUser is required to have one of clientId or payeeId');
            done();
          }
        });
      });
      describe('when passed a text field', function () {
        it('should add a $or field to the data', function (done) {
          // Arrange
          const searchText = 'Hello world';
          const regex = new RegExp(searchText, 'i');
          const inputParams = { text: searchText };
          const clientId = testUtils.randomId();
          const curveUser = { clientId };

          // Act
          const result = Payee.paramsToFilterField(inputParams, curveUser);

          // Assert
          expect(result.$or).to.deep.eq([
            { name: { $regex: regex } },
            { alternateName: { $regex: regex } },
            { foreignId: { $regex: regex } },
            { projectId: { $regex: regex } },
          ]);
          done();
        });
      });
      describe('when passed a text field containing a valid ObjectId string', function () {
        it('should add a $or field to the data including _id', function (done) {
          // Arrange
          const searchText = testUtils.randomId();
          const regex = new RegExp(searchText, 'i');
          const inputParams = { text: searchText };
          const clientId = testUtils.randomId();
          const curveUser = { clientId };

          // Act
          const result = Payee.paramsToFilterField(inputParams, curveUser);

          // Assert
          expect(result.$or).to.deep.eq([
            { name: { $regex: regex } },
            { alternateName: { $regex: regex } },
            { foreignId: { $regex: regex } },
            { projectId: { $regex: regex } },
            { _id: searchText },
          ]);
          done();
        });
      });
    });

    describe('when not passed input params', function () {
      it('should return an object with the just the user specific payeeFields added', function (done) {
        // Arrange
        const inputParams = null;
        const clientId = testUtils.randomId();
        const curveUser = { clientId };

        // Act
        const result = Payee.paramsToFilterField(inputParams, curveUser);

        // Assert
        expect(result).to.deep.eq({ clientId });
        done();
      });
    });

    describe('when not passed a curveUser', function () {
      it('should raise an error stating it requires a curveUser', function (done) {
        try {
          // Arrange
          const inputParams = {};
          const curveUser = null;

          // Act
          Payee.paramsToFilterField(inputParams, curveUser);
        } catch (err) {
          // Assert
          expect(err.message).to.eq('A curveUser is required');
          done();
        }
      });
    });
  });

  describe('importFromExcel', function () {
    let importXlsxStub; let importPayeesStub; let savePayee; let generateNotificationStub;

    beforeEach(function (done) {
      // Set up stubs
      importXlsxStub = sinon.stub(ImportXlsx, 'getDataByTemplate');
      importPayeesStub = sinon.stub(Payee, 'importPayees');
      generateNotificationStub = sinon.stub(Notification, 'generate');
      savePayee = sinon.spy(payee, 'save');
      // Set stub to yield for non-async calls that use findById with a callback
      clientFindByIdStub.onCall(4).resolves(client);
      importXlsxStub.yields(null, [{ some: 'data' }]);
      importPayeesStub.yields(null, 1, [payee]);
      generateNotificationStub.yields(null, { notfication: 'result' });
      done();
    });

    afterEach(function (done) {
      importXlsxStub.restore();
      importPayeesStub.restore();
      generateNotificationStub.restore();
      savePayee.restore();
      done();
    });

    describe('when passed a file and user', function () {
      it('should call ImportXlsx.getDataByTemplate with the passed template and payee template', function (done) {
        // Arrange
        const file = { path: '../../data/template.xlsx' };
        const curveUser = { email: 'test@curve.com', clientId: client._id };
        const overwriteBlanks = true;

        // Act
        Payee.importFromExcel(file, curveUser, overwriteBlanks, function (err) {
          // Assert
          expect(importXlsxStub.called).to.be.true;
          done();
        });
      });

      describe('when ImportXlsx.getDataByTemplate returns data', function () {
        it('should call Payee.importPayees with the returned data', function (done) {
          // Arrange
          const file = { path: '../../data/template.xlsx' };
          const curveUser = { email: 'test@curve.com', clientId: client._id };
          const overwriteBlanks = true;

          // Act
          Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
            // Assert
            expect(importPayeesStub.called).to.be.true;
            done();
          });
        });

        describe('when Payee.importPayees returns some payees', function () {
          it('should save each of the payees', function (done) {
            // Arrange
            const file = { path: '../../data/template.xlsx' };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            const overwriteBlanks = true;

            // Act
            Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
              // Assert
              expect(savePayee.called).to.be.true;
              done();
            });
          });

          it('should call Notification.generate with the returned count from Payee.importPayees', function (done) {
            // Arrange
            const file = { path: '../../data/template.xlsx' };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            const overwriteBlanks = true;

            // Act
            Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
              // Assert
              expect(generateNotificationStub.called).to.be.true;
              done();
            });
          });

          it('should call Notification.generate with the returned count from Payee.importPayees', function (done) {
            // Arrange
            const file = { path: '../../data/template.xlsx' };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            const overwriteBlanks = true;

            // Act
            Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
              // Assert
              expect(generateNotificationStub.args[0][0]).to.eq('Your Payee Import Has Completed');
              done();
            });
          });
        });
        describe('when Payee.importPayees returns an error', function () {
          it('should call SendEmail.importError with the returned errors', function (done) {
            // Arrange
            const file = { path: '../../data/template.xlsx' };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            const overwriteBlanks = true;
            importPayeesStub.yields('An Error');

            // Act
            Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
              // Assert
              expect(generateNotificationStub.args[0][0]).to.eq('Your Payee Import Has Errored');
              done();
            });
          });
        });
      });
      describe('when ImportXlsx.getDataByTemplate returns an error', function () {
        it('should call SendEmail.importError stating the template does not match', function (done) {
          // Arrange
          const file = { path: '../../data/template.xlsx' };
          const curveUser = { email: 'test@curve.com', clientId: client._id };
          const overwriteBlanks = true;
          importXlsxStub.yields('This is an error');

          // Act
          Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
            // Assert
            expect(generateNotificationStub.args[0][0]).to.eq('Your Payee Import Has Errored');
            done();
          });
        });
      });
    });

    describe('when not passed a file', function () {
      it('should call SendEmail.importError stating a file should be passed', function (done) {
        // Arrange
        const file = null;
        const curveUser = { email: 'test@curve.com', clientId: client._id };
        const overwriteBlanks = true;

        // Act
        Payee.importFromExcel(file, curveUser, overwriteBlanks, function () {
          // Assert
          expect(generateNotificationStub.args[0][0]).to.eq('Your Payee Import Has Errored');
          expect(generateNotificationStub.args[0][1]).to.eq('No file was uploaded');
          done();
        });
      });
    });

    describe('when not passed a curveUser', function () {
      it('should return an error stating a curveUser must be passed', function (done) {
        // Arrange
        const file = { path: '../../data/template.xlsx' };
        const curveUser = null;
        const overwriteBlanks = true;
        importXlsxStub.yields('This is an error');

        // Act
        Payee.importFromExcel(file, curveUser, overwriteBlanks, function (err) {
          // Assert
          expect(err.message).to.eq('importFromExcel requires a curveUser to be passed');
          done();
        });
      });
    });
  });

  describe('importPayee', function () {
    let isClientAdminUser = false;
    describe('when passed an object', function () {
      let payeeStub;
      beforeEach(function (done) {
        payeeStub = sinon.stub(Payee, 'findOne');
        payeeStub.resolves(null);
        // Set stub to yield for non-async calls that use findById with a callback
        clientFindByIdStub.onCall(4).resolves(client);
        done();
      });

      afterEach(function (done) {
        payeeStub.restore();
        done();
      });

      describe('when _id is present', function () {
        describe('and is a valid ObjectId', function () {
          it('should call find with the passed _id and clientId', function (done) {
            // Arrange
            const data = {
              _id: new ObjectId(), clientId: 'ClientID', name: 'Payee', address: 'Address', vatNo: 'vatNo',
            };
            const clientId = 'clientID';
            const overwriteBlanks = true;

            // Act
            Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function () {
              // Assert
              expect(payeeStub.called).to.be.true;
              expect(payeeStub.calledWith({ _id: data._id, clientId })).to.be.true;
              done();
            });
          });
        });

        describe('and is not a valid ObjectId', function () {
          it('should not call find with the passed _id and clientId', function (done) {
            // Arrange
            const data = {
              _id: 'Anything Else', clientId: 'ClientID', name: 'Payee', address: 'Address 2', vatNo: 'vatNo 2',
            };
            const clientId = 'clientID';
            const overwriteBlanks = true;

            // Act
            Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function () {
              // Assert
              expect(payeeStub.calledWith({ name: data.name, clientId })).to.be.true;
              done();
            });
          });
        });
      });

      describe('when _id is not present', function () {
        describe('when name is present', function () {
          it('should call find with the passed name and clientId', function (done) {
            // Arrange
            const data = {
              clientId: 'ClientID', name: 'Anything Else', address: 'Address 2', vatNo: 'vatNo 2',
            };
            const clientId = 'clientID';
            const overwriteBlanks = true;

            // Act
            Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function () {
              // Assert
              expect(payeeStub.called).to.be.true;
              expect(payeeStub.calledWith({ name: data.name, clientId })).to.be.true;
              done();
            });
          });

          describe('when a payee is found by the name', function () {
            it('should update the found payee with the passed payeeFields', function (done) {
              payeeStub.resolves(payee);
              // Arrange
              const data = {
                clientId: 'ClientID', name: 'Payee', address: 'Address 2', vatNo: 'vatNo 2',
              };
              const clientId = 'clientID';
              const overwriteBlanks = true;

              // Act
              Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function (err, result) {
                // Assert
                expect(payeeStub.args[0][0]).to.deep.eq({ clientId, name: data.name });
                expect(result._id).to.eq(payee._id);
                expect(result.name).to.eq(data.name);
                expect(result.address).to.eq(data.address);
                done();
              });
            });
          });

          describe('when a payee is not found by the name', function () {
            it('should create a new payee', function (done) {
              // Arrange
              payeeStub.restore();
              const data = {
                clientId: client._id, name: `Payee${Math.random().toString(36)}`, address: 'Address 2', vatNo: 'vatNo 2',
              };
              const clientId = client._id;
              const overwriteBlanks = true;

              // Act
              Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function (err, result) {
                // Assert
                expect(result._id).to.not.eq(payee._id);
                done();
              });
            });
          });

          it('should set the passed payeeFields to the Payee', function (done) {
            // Arrange
            const data = {
              clientId: client._id,
              name: 'New Payee',
              alternateName: 'Alt',
              foreignId: 'foreign',
              projectId: testUtils.randomString(),
              contactEmail: 'contact',
              address: 'Address 4',
              country: 'GB',
              vatNo: 'ID 4',
              selfBillingTaxText: 'Tax Text',
              selfBillingTaxRate: 123,
              feesInvoiceTaxRate: 321,
              paymentEmail: 'payment@payee.com',
              paymentCurrency: 'GBP',
              bankName: 'Bank',
              bankAddress: 'Address',
              accountNo: 'Acc No',
              sortCode: 'sort',
              iban: 'IBAN',
              notes: 'notes',
            };
            const clientId = client._id;
            const overwriteBlanks = true;
            isClientAdminUser = true;

            // Act
            Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function (err, result) {
              // Assert
              expect(result.name).to.eq(data.name);
              expect(result.alternateName).to.eq(data.alternateName);
              expect(result.foreignId).to.eq(data.foreignId);
              expect(result.projectId).to.eq(data.projectId);
              expect(result.contactEmail).to.eq(data.contactEmail);
              expect(result.address).to.eq(data.address);
              expect(result.country).to.eq(data.country);
              expect(result.vatNo).to.eq(data.vatNo);
              expect(result.selfBillingTaxText).to.eq(data.selfBillingTaxText);
              expect(result.selfBillingTaxRate).to.eq(data.selfBillingTaxRate);
              expect(result.feesInvoiceTaxRate).to.eq(data.feesInvoiceTaxRate);
              expect(result.paymentEmail).to.eq(data.paymentEmail);
              expect(result.paymentCurrency).to.eq(data.paymentCurrency);
              expect(result.bankName).to.eq(data.bankName);
              expect(result.bankAddress).to.eq(data.bankAddress);
              expect(result.accountNo).to.eq(data.accountNo);
              expect(result.sortCode).to.eq(data.sortCode);
              expect(result.iban).to.eq(data.iban);
              expect(result.notes).to.eq(data.notes);
              done();
            });
          });
        });
        describe('when name is not present', function () {
          it('should return an error to the callback stating that an vatNo is required', function (done) {
            // Arrange
            const data = {
              _id: '', clientId: client._id, address: 'Address 2', vatNo: 'vatNo 2',
            };
            const clientId = client._id;
            const overwriteBlanks = true;

            // Act
            Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function (err) {
              // Assert
              expect(err.message).to.eq('Name must be passed');
              done();
            });
          });

          it('should not create a new Payee', function (done) {
            // Arrange
            const data = { clientId: client._id, address: 'Address 1' };
            const clientId = client._id;
            const overwriteBlanks = true;

            // Act
            Payee.countDocuments({})
              .then((originalCount) => {
                Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function (err, result) {
                  Payee.countDocuments({})
                    .then((newCount) => {
                      // Assert
                      expect(result).to.eq(undefined);
                      expect(originalCount).to.eq(newCount);
                      done();
                    }).catch(done);
                });
              }).catch(done);
          });
        });
      });
    });

    describe('when not passed an object', function () {
      it("should return an error in the callback stating data doesn't match the template", function (done) {
        // Arrange
        const data = null;
        const clientId = client._id;
        const overwriteBlanks = true;
        // Set stub to yield for non-async calls that use findById with a callback
        clientFindByIdStub.onCall(4).resolves(client);

        // Act
        Payee.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, function (err) {
          // Assert
          expect(err.message).to.eq("Data doesn't match template");
          done();
        });
      });
    });
  });

  describe('importPayees', function () {
    const isClientAdminUser = false;
    describe('when passed an array and clientId', function () {
      let importPayee;
      beforeEach(function () {
        importPayee = sinon.stub(Payee, 'importPayee');
        // Set stub to yield for non-async calls that use findById with a callback
        clientFindByIdStub.onCall(4).resolves(client);
      });
      afterEach(function () {
        importPayee.restore();
      });

      it('should call importPayee for each payee passed', function (done) {
        // Arrange
        const payees = [
          {
            _id: '', name: 'Payee 1', address: 'Address 1', vatNo: 'ID1',
          },
          { _id: '', name: 'Payee 2', address: 'Address 2' },
          { _id: '', name: 'Payee 3', address: 'Address 3' },
        ];
        const { clientId } = payee;
        const overwriteBlanks = true;

        importPayee.yields(null, payees);

        // Act
        Payee.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, function () {
          // Assert
          expect(importPayee.callCount).to.eq(payees.length);
          done();
        });
      });

      it('should add each returned error from importPayee to the errors array', function (done) {
        // Arrange
        const payees = [
          {
            _id: '', name: 'Payee 1', address: 'Address 1', vatNo: 'ID1',
          },
          { _id: '', name: 'Payee 2', address: 'Address 2' },
          { _id: '', name: 'Payee 3', address: 'Address 3' },
        ];
        const { clientId } = payee;
        const overwriteBlanks = true;

        importPayee.yields(new Error('An Error'), null);

        // Act
        Payee.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, function (err) {
          // Assert
          expect(err.length).to.eq(payees.length);
          expect(err[0]).to.eq('Line 3: An Error');
          done();
        });
      });

      it('should add each returned payee from importPayee to the imported array', function (done) {
        // Arrange
        const payees = [
          {
            _id: '', name: 'Payee 1', address: 'Address 1', vatNo: 'ID1',
          },
          { _id: '', name: 'Payee 2', address: 'Address 2' },
          { _id: '', name: 'Payee 3', address: 'Address 3' },
        ];
        const { clientId } = payee;
        const overwriteBlanks = true;

        importPayee.yields(null, payee);

        // Act
        Payee.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, function (err, count, result) {
          // Assert
          expect(result.length).to.eq(payees.length);
          done();
        });
      });
    });

    describe('when not passed an array', function () {
      it('should return an error in the callback stating it must be passed an array', function (done) {
        // Arrange
        const payees = {
          _id: '123', name: 'Payee 1', address: 'Address 1', vatNo: 'ID1',
        };
        const { clientId } = payee;
        const overwriteBlanks = true;

        // Act
        Payee.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, function (err) {
          // Assert
          expect(err).to.deep.eq(['Data must be an Array']);
          done();
        });
      });
    });

    describe('when not passed a clientId', function () {
      it('should return an error in the callback stating it must be passed a client ID', function (done) {
        // Arrange
        const payees = [
          {
            _id: '', name: 'Payee 1', address: 'Address 1', vatNo: 'ID1',
          },
          { _id: '', name: 'Payee 1', address: 'Address 1' },
          { _id: '', name: 'Payee 2', address: 'Address 2' },
        ];
        const clientId = null;
        const overwriteBlanks = true;

        // Act
        Payee.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, function (err) {
          // Assert
          expect(err).to.deep.eq(['A Client ID must be passed']);
          done();
        });
      });
    });
  });

  describe('sendExport', function () {
    describe('when passed a filter and user', function () {
      let payeeFindStub; let convertPayeesForXlsxStub; let createXlsxStub; let fileManagerPublicLinkStub; let fileManagerUploadToS3Stub; let notificationGenerateStub; let exportsGetTemplateStub;
      // Results
      const findResult = ['find'];
      const payeesData = ['Payees', 'Data'];
      const createXlsxData = 'link/to/file.xlsx';
      const emailExport = { data: 'Data' };
      const s3Link = 'link/to/s3/file.xlsx';
      const publicLink = 'public/link/file.xlsx';

      beforeEach(function (done) {
        // Set up stubs
        payeeFindStub = sinon.stub(Payee, 'find');
        convertPayeesForXlsxStub = sinon.stub(Payee, 'convertPayeesForXlsx');
        createXlsxStub = sinon.stub(createXlsx, 'createInTemplate');
        notificationGenerateStub = sinon.stub(Notification, 'generate');
        fileManagerUploadToS3Stub = sinon.stub(fileManager, 'uploadToS3');
        fileManagerPublicLinkStub = sinon.stub(fileManager, 'publicLink24Hours');
        exportsGetTemplateStub = sinon.stub(Exports, 'getTemplate');
        // Set up standard yields
        clientFindByIdStub.onCall(4).resolves(client);
        payeeFindStub.resolves(findResult);
        convertPayeesForXlsxStub.yields(null, payeesData);
        createXlsxStub.yields(null, createXlsxData);
        notificationGenerateStub.yields(null, emailExport);
        fileManagerUploadToS3Stub.yields(null, s3Link);
        fileManagerPublicLinkStub.yields(null, publicLink);
        exportsGetTemplateStub.resolves(testUtils.randomString());
        done();
      });

      afterEach(function () {
        payeeFindStub.restore();
        convertPayeesForXlsxStub.restore();
        createXlsxStub.restore();
        notificationGenerateStub.restore();
        fileManagerUploadToS3Stub.restore();
        fileManagerPublicLinkStub.restore();
      });

      describe('when passed a filter and a curveUser', function () {
        it("should call Client.findById with the user's clientId", function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(clientFindByIdStub.called).to.be.true;
            expect(clientFindByIdStub.calledWith(curveUser.clientId, { name: 1, parentId: 1, features: 1 })).to.be.true;
            done();
          });
        });

        it('should call Payee.find with the passed filter', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(payeeFindStub.called).to.be.true;
            expect(payeeFindStub.calledWith(filter)).to.be.true;
            done();
          });
        });

        describe('when Payee.find returns an error', function () {
          it('should call Notification.generate with the error', function (done) {
            // Arrange
            const filter = { _id: { $in: [payee._id] } };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            payeeFindStub.rejects('This is an error');

            // Act
            Payee.sendExport(filter, curveUser, function () {
              // Assert
              expect(notificationGenerateStub.called).to.be.true;
              expect(notificationGenerateStub.args[0][0]).to.eq('Your Payee Export Has Errored');
              done();
            });
          });
        });

        it('should call Payee.convertPayeesForXlsx with the returned data from Payee.find and the payee template', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(convertPayeesForXlsxStub.called).to.be.true;
            expect(convertPayeesForXlsxStub.calledWith(findResult)).to.be.true;
            done();
          });
        });

        describe('when Payee.convertPayeesForXlsx returns an error', function () {
          it('should call Notification.generate with the error', function (done) {
            // Arrange
            const filter = { _id: { $in: [payee._id] } };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            convertPayeesForXlsxStub.yields('This is an error', null);

            // Act
            Payee.sendExport(filter, curveUser, function () {
              // Assert
              expect(notificationGenerateStub.called).to.be.true;
              expect(notificationGenerateStub.args[0][0]).to.eq('Your Payee Export Has Errored');
              done();
            });
          });
        });

        it('should call CreateXlsx.createInTemplate with the returned data from Payee.convertPayeesForXlsx and the payee template', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };
          const expectedTemplate = testUtils.randomString();
          exportsGetTemplateStub.resolves(expectedTemplate);
          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(createXlsxStub.called).to.be.true;
            expect(createXlsxStub.calledWith([payeesData], expectedTemplate)).to.be.true;
            done();
          });
        });

        describe('when CreateXlsx.createInTemplate returns an error', function () {
          it('should call Notification.generate with the error', function (done) {
            // Arrange
            const filter = { _id: { $in: [payee._id] } };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            createXlsxStub.yields('This is an error', null);

            // Act
            Payee.sendExport(filter, curveUser, function () {
              // Assert
              expect(notificationGenerateStub.called).to.be.true;
              expect(notificationGenerateStub.args[0][0]).to.eq('Your Payee Export Has Errored');
              done();
            });
          });
        });

        it('should call fileManager.uploadToS3 with the relevant naming convention', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(fileManagerUploadToS3Stub.called).to.be.true;
            done();
          });
        });

        describe('when fileManager.uploadToS3 returns an error', function () {
          it('should call Notification.generate with the error', function (done) {
            // Arrange
            const filter = { _id: { $in: [payee._id] } };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            fileManagerUploadToS3Stub.yields('This is an error', null);

            // Act
            Payee.sendExport(filter, curveUser, function () {
              // Assert
              expect(notificationGenerateStub.called).to.be.true;
              expect(notificationGenerateStub.args[0][0]).to.eq('Your Payee Export Has Errored');
              done();
            });
          });
        });

        it('should call fileManager.publicLink24Hours with the returned key from fileManager.uploadToS3', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(fileManagerPublicLinkStub.called).to.be.true;
            expect(fileManagerPublicLinkStub.calledWith(s3Link)).to.be.true;
            done();
          });
        });

        describe('when fileManager.publicLink24Hours returns an error', function () {
          it('should call Notification.generate with the error', function (done) {
            // Arrange
            const filter = { _id: { $in: [payee._id] } };
            const curveUser = { email: 'test@curve.com', clientId: client._id };
            fileManagerPublicLinkStub.yields('This is an error', null);

            // Act
            Payee.sendExport(filter, curveUser, function () {
              // Assert
              expect(notificationGenerateStub.called).to.be.true;
              expect(notificationGenerateStub.args[0][0]).to.eq('Your Payee Export Has Errored');
              done();
            });
          });
        });

        it('should call Notification.generate with the link from fileManager.publicLink24Hours', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function () {
            // Assert
            expect(notificationGenerateStub.called).to.be.true;
            expect(notificationGenerateStub.args[0][0]).to.eq('Payee Export Ready');
            expect(notificationGenerateStub.args[0][4].link).to.eq(publicLink);
            done();
          });
        });
      });

      describe('when not passed a filter', function () {
        it('should return an error stating a filter must be passed', function (done) {
          // Arrange
          const filter = null;
          const curveUser = { email: 'test@curve.com', clientId: client._id };

          // Act
          Payee.sendExport(filter, curveUser, function (err) {
            // Assert
            expect(err).to.exist;
            expect(err.message).to.eq('sendExport requires filter to be passed');
            done();
          });
        });
      });

      describe('when not passed a curveUser', function () {
        it('should return an error stating a user must be passed', function (done) {
          // Arrange
          const filter = { _id: { $in: [payee._id] } };
          const curveUser = null;

          // Act
          Payee.sendExport(filter, curveUser, function (err) {
            // Assert
            expect(err).to.exist;
            expect(err.message).to.eq('sendExport requires curveUser to be passed');
            done();
          });
        });
      });
    });
  });

  describe('convertPayeesForXlsx', function () {
    describe('when passed an array', function () {
      let exportData; const exportDataResult = { name: 'Payee 1' };

      beforeEach(function () {
        exportData = sinon.stub(payee, 'exportData');
        exportData.returns(exportDataResult);
      });

      afterEach(function () {
        exportData.restore();
      });

      it('should not return an error', function (done) {
        // Arrange
        const payees = [payee];

        // Act
        Payee.convertPayeesForXlsx(payees, { features: {} }, function (err) {
          // Assert
          expect(err).to.eq(null);
          done();
        });
      });

      it('should return an array', function (done) {
        // Arrange
        const payees = [payee];

        // Act
        Payee.convertPayeesForXlsx(payees, { features: {} }, function (err, mappedData) {
          // Assert
          expect(mappedData instanceof Array).to.be.true;
          done();
        });
      });

      it('should call exportData for payees', function (done) {
        // Arrange
        const payees = [payee];

        // Act
        Payee.convertPayeesForXlsx(payees, { features: {} }, function () {
          // Assert
          expect(exportData.callCount).to.eq(1);
          done();
        });
      });

      it('should add the returned value from exportData to the returned array', function (done) {
        // Arrange
        const payees = [payee];

        // Act
        Payee.convertPayeesForXlsx(payees, { features: {} }, function (err, mappedData) {
          // Assert
          expect(mappedData).to.deep.eq([exportDataResult]);
          done();
        });
      });
    });

    describe('when not passed an array', function () {
      it('should return an error in the callback stating it must be passed an array', function (done) {
        // Arrange
        const payees = null;

        // Act
        Payee.convertPayeesForXlsx(payees, { features: {} }, function (err) {
          // Assert
          expect(err).to.deep.eq(['Must be passed an Array of Payees']);
          done();
        });
      });
    });
  });

  describe('getParent', function () {
    beforeEach(function (done) {
      // Set stub to yield for non-async calls that use findById with a callback
      clientFindByIdStub.onCall(4).resolves(client);
      done();
    });

    describe('when payee has a client associated', function () {
      it("should call Client.findById with the payee's client ID", function (done) {
        // Act
        payee.getParent(function () {
          // Assert
          expect(clientFindByIdStub.called).to.be.true;
          expect(clientFindByIdStub.calledWith(payee.clientId)).to.be.true;
          done();
        });
      });

      it("should call Parent.findById with the client's parent ID", function (done) {
        // Act
        payee.getParent(function () {
          // Assert
          expect(parentFindByIdStub.called).to.be.true;
          expect(parentFindByIdStub.calledWith(client.parentId)).to.be.true;
          done();
        });
      });
    });

    describe('when payee has no client associated', function () {
      it('should return an error stating there is no client associated', function (done) {
        // Arrange
        clientFindByIdStub.onCall(4).resolves();
        // Act
        payee.getParent(function (err) {
          // Assert
          expect(err.message).to.eq('No client associated with Payee');
          done();
        });
      });
    });
  });

  describe('getClientValues', function () {
    beforeEach(function (done) {
      // Set stub to yield for non-async calls that use findById with a callback
      clientFindByIdStub.onCall(4).resolves(client);
      done();
    });

    describe('when payee has a client associated', function () {
      it("should call Client.findById with the payee's client ID", function (done) {
        // Act
        payee.getClientValues(function () {
          // Assert
          expect(clientFindByIdStub.called).to.be.true;
          expect(clientFindByIdStub.calledWith(payee.clientId)).to.be.true;
          done();
        });
      });

      it('should add the payeeFields to the returned payee from the client', function (done) {
        // Arrange
        clientFindByIdStub.restore();
        const newData = {
          distributionChannels: ['Channels'], configurations: ['Some config here'], priceCategories: ['Price Cat'],
        };
        // Act
        Client.findByIdAndUpdate(client._id, newData, { new: true })
          .then((client) => {
            payee.getClientValues(function (err, result) {
              // Assert
              expect(result.distributionChannels).to.deep.eq(client.distributionChannels);
              expect(result.configurations).to.deep.eq(client.configurations);
              expect(result.priceCategories).to.deep.eq(client.priceCategories);
              done();
            });
          }).catch(done);
      });
    });

    describe('when payee has no client associated', function () {
      it('should return the passed payee as json', function (done) {
        // Arrange
        payee.clientId = new ObjectId();
        clientFindByIdStub.restore();
        // Act
        payee.getClientValues(function (err, result) {
          // Assert
          expect(result).to.deep.eq(payee.toJSON());
          done();
        });
      });
    });
  });

  describe('summary', function () {
    let contract; let statement; let contractSpy; let statementSpy;

    beforeEach(function (done) {
      // Set up spys
      contractSpy = sinon.stub(Contract, 'find');
      statementSpy = sinon.stub(Statement, 'find');
      // Set and save contract and statement
      async.waterfall([
        function (cb) {
          contract = new Contract({ name: 'Contract 4', active: true, payeeId: payee._id });
          sinon.stub(Contract.prototype, 'save');
          Contract.prototype.save.resolves(contract);
          cb(null, contract);
        },
        function (contract, cb) {
          statement = new Statement({
            name: 'Statment 4', status: 'Published', contractId: contract._id, grossAmount: 1, netAmount: 2, grossCosts: 3, netCosts: 4,
          });
          statement.save()
            .then(() => {
              cb();
            })
            .catch(cb);
        },
      ], done);
    });

    afterEach(function (done) {
      // Restore Spys
      contractSpy.restore();
      statementSpy.restore();
      done();
    });

    describe('when payee has a contract', function () {
      it("should call Contract.find on payees.payeeId with the payee's ID", function (done) {
        // Arrange
        contractSpy.reset();
        contractSpy.resolves([contract]);
        statementSpy.resolves([statement]);

        // Act
        payee.summary(function () {
          // Assert
          expect(contractSpy.called).to.be.true;
          expect(contractSpy.calledWith({ clientId: payee.clientId, 'payees.payeeId': payee._id }, { name: 1 })).to.be.true;
          done();
        });
      });

      it('should call Statement.find on contractId with contract IDs', function (done) {
        // Arrange
        statementSpy.reset();
        contractSpy.resolves([contract]);
        statementSpy.resolves([statement]);

        // Act
        payee.summary(function (err, summary) {
          // Assert
          expect(summary._id).to.eq(payee._id);
          expect(statementSpy.called).to.be.true;
          expect(statementSpy.calledWith({ clientId: payee.clientId, contractId: { $in: [contract.id] }, status: 'Published' })).to.be.true;
          done();
        });
      });

      it('should return an object', function (done) {
        // Arrange
        contractSpy.resolves([contract]);
        statementSpy.resolves([statement]);

        // Act
        payee.summary(function (err, summary) {
          /// Assert
          expect(typeof summary).to.eq('object');
          done();
        });
      });

      it('should sum the netAmount across all statements', function (done) {
        // Arrange
        contractSpy.resolves([contract]);
        statementSpy.resolves([statement]);

        // Assert
        payee.summary(function (err, summary) {
          // Act
          expect(summary.totalRevenuesToDate).to.eq(statement.netAmount);
          done();
        });
      });

      it('should sum the netCosts across all statements', function (done) {
        // Arrange
        contractSpy.resolves([contract]);
        statementSpy.resolves([statement]);

        // Assert
        payee.summary(function (err, summary) {
          // Act
          expect(summary.totalCostsToDate).to.eq(statement.netCosts);
          done();
        });
      });
    });

    describe('when Contract.find raises an error', function () {
      it('should return the error', function (done) {
        // Arrange
        statementSpy.reset();
        contractSpy.reset();
        contractSpy.rejects('Contract Error');
        statementSpy.resolves([]);

        // Act
        payee.summary(function (err) {
          // Assert
          expect(err.name).to.eq('Contract Error');
          done();
        });
      });
    });

    describe('when no statements are returned', function () {
      it('return 0 for totalRevenuesToDate and totalCostsToDate', function (done) {
        // Arrange
        const contract = new Contract({ name: 'Contract 4', active: true, payeeId: payee.id });
        statementSpy.restore();
        contractSpy.resolves([contract]);
        statementSpy.resolves([]);

        // Act
        payee.summary(function (err, summary) {
          // Assert
          expect(summary.totalRevenuesToDate).to.eq(0);
          expect(summary.totalCostsToDate).to.eq(0);
          done();
        });
      });
    });

    describe('when statement find returns an error', function () {
      it('should raise error', function (done) {
        // Arrange
        contractSpy.resolves([contract]);
        statementSpy.rejects('An Error');

        // Act
        payee.summary(function (err) {
          // Assert
          expect(err.name).to.eq('An Error');
          done();
        });
      });
    });
  });

  describe('analytics', function () {
    let contract; let statement; let statement2; let contractSpy; let statementSpy;
    beforeEach(function (done) {
      // Set up spys
      contractSpy = sinon.stub(Contract, 'find');
      statementSpy = sinon.stub(Statement, 'find');
      // Set and save contract and statement
      async.waterfall([
        function (cb) {
          contract = new Contract({ name: 'Contract 5', active: true, payeeId: payee._id });
          sinon.stub(Contract.prototype, 'save');
          Contract.prototype.save.resolves(contract);
          cb(null, contract);
        },
        function (contract, cb) {
          statement = new Statement({
            name: 'Statment 5', status: 'Published', contractId: contract._id, grossAmount: 1, netAmount: 2, grossCosts: 3, netCosts: 4,
          });
          statement.analysis = { net: {} };
          statement.analysis.net.distributionChannels = [{
            type: 'channels',
            units: 1,
            value: 1,
          }];
          statement.analysis.net.configurations = [{
            type: 'configs',
            units: 1,
            value: 1,
          }];
          statement.analysis.net.territories = [{
            type: 'territories',
            units: 1,
            value: 1,
          }];
          statement.analysis.net.sources = [{
            type: 'sources',
            units: 1,
            value: 1,
          }];
          statement.analysis.net.subSources = [{
            type: 'subSources',
            units: 1,
            value: 1,
          }];
          statement.analysis.net.costs = [{
            type: 'costs',
            units: 1,
            value: 1,
          }];
          statement.save()
            .then(() => {
              cb();
            }).catch(cb);
        },
        function (cb) {
          statement2 = new Statement({
            name: 'Statment 6', status: 'Published', contractId: contract._id, grossAmount: 1, netAmount: 2, grossCosts: 3, netCosts: 4,
          });
          statement2.analysis = { net: {} };
          statement2.analysis.net.distributionChannels = [{
            type: 'channels',
            units: 1,
            value: 1,
          }];
          statement2.analysis.net.configurations = [{
            type: 'configs',
            units: 1,
            value: 1,
          }];
          statement2.analysis.net.territories = [{
            type: 'territories',
            units: 1,
            value: 1,
          }];
          statement2.analysis.net.sources = [{
            type: 'sources',
            units: 1,
            value: 1,
          }];
          statement2.analysis.net.subSources = [{
            type: 'subSources',
            units: 1,
            value: 1,
          }];
          statement2.analysis.net.costs = [{
            type: 'costs',
            units: 1,
            value: 1,
          }];
          statement2.save()
            .then(() => {
              cb();
            }).catch(cb);
        },
      ], done);
    });

    afterEach(function (done) {
      // Restore Spys
      contractSpy.restore();
      statementSpy.restore();
      done();
    });

    it("should call Contract.find on payees.payeeId with the payee's ID", function (done) {
      // Arrange
      contractSpy.reset();
      contractSpy.resolves([contract]);
      statementSpy.resolves([statement]);

      // Act
      payee.analytics(function () {
        // Assert
        expect(contractSpy.called).to.be.true;
        expect(contractSpy.calledWith({ clientId: payee.clientId, 'payees.payeeId': payee._id }, { name: 1 })).to.be.true;
        done();
      });
    });

    it('should call Statement.find on contractId with contract IDs', function (done) {
      // Arrange
      statementSpy.reset();
      contractSpy.resolves([contract]);
      statementSpy.resolves([statement]);

      // Act
      payee.analytics(function () {
        // Assert
        expect(statementSpy.called).to.be.true;
        expect(statementSpy.calledWith({ clientId: payee.clientId, contractId: { $in: [contract.id] }, status: 'Published' }, { analysis: 1 })).to.be.true;
        done();
      });
    });

    describe('when Contract.find returns an error', function () {
      it('should return the error', function (done) {
        // Arrange
        contractSpy.rejects('Contract Error');
        statementSpy.resolves([]);

        // Assert
        payee.analytics(function (err) {
          // Act
          expect(err.name).to.eq('Contract Error');
          done();
        });
      });
    });

    describe('when payee has no statement found', function () {
      it('should return the error', function (done) {
        // Arrange
        contractSpy.resolves([]);
        statementSpy.rejects('Statement Error');

        // Act
        payee.analytics(function (err) {
          // Assert
          expect(err.name).to.eq('Statement Error');
          done();
        });
      });
    });

    describe('when no statements are returned', function () {
      it('should return blank arrays', function (done) {
        // Arrange
        contractSpy.resolves([]);
        statementSpy.resolves([]);

        // Act
        payee.analytics(function (err, summary) {
          // Assert
          expect(summary).to.deep.eq({
            net: {
              distributionChannels: [], configurations: [], territories: [], sources: [], subSources: [], costs: [],
            },
            overTime: { data: [[], []], labels: [] },
          });
          done();
        });
      });
    });

    describe('when statements are returned', function () {
      // Arrange
      let analytics;
      beforeEach(function (done) {
        contractSpy.resolves([contract]);
        statementSpy.resolves([statement, statement2]);
        // Act
        payee.analytics(function (err, data) {
          analytics = data;
          done();
        });
      });

      it('should total distributionChannels from each of the returned statements', function (done) {
        // Assert
        expect(analytics.net.distributionChannels[0]).to.deep.eq({ type: 'channels', units: 2, value: 2 });
        done();
      });

      it('should total configurations from each of the returned statements', function (done) {
        // Assert
        expect(analytics.net.configurations[0]).to.deep.eq({ type: 'configs', units: 2, value: 2 });
        done();
      });

      it('should total territories from each of the returned statements', function (done) {
        // Assert
        expect(analytics.net.territories[0]).to.deep.eq({ type: 'territories', units: 2, value: 2 });
        done();
      });

      it('should total sources from each of the returned statements', function (done) {
        // Assert
        expect(analytics.net.sources[0]).to.deep.eq({ type: 'sources', units: 2, value: 2 });
        done();
      });

      it('should total subSources from each of the returned statements', function (done) {
        // Assert
        expect(analytics.net.subSources[0]).to.deep.eq({ type: 'subSources', units: 2, value: 2 });
        done();
      });

      it('should total costs from each of the returned statements', function (done) {
        // Assert
        expect(analytics.net.costs[0]).to.deep.eq({ type: 'costs', units: 2, value: 2 });
        done();
      });

      it('should build the time series data from the returned data', function (done) {
        // Assert
        expect(analytics.overTime).to.deep.eq({ data: [[2, 2], [4, 4]], labels: [moment().format('MM-YYYY'), moment().format('MM-YYYY')] });
        done();
      });
    });
  });

  describe('exportData', function () {
    it('should return an array', function (done) {
      // Act
      const data = payee.exportData({ features: {} });

      // Assert
      expect(data instanceof Array).to.be.true;
      done();
    });

    it('should return data in specific order', function (done) {
      // Act
      const data = payee.exportData({ features: {} });

      // Assert
      expect(data[0]).to.eq(payee._id.toString());
      expect(data[1]).to.eq(payee.name);
      expect(data[2]).to.eq(payee.alternateName);
      expect(data[3]).to.eq(payee.foreignId);
      expect(data[4]).to.eq(payee.projectId);
      expect(data[5]).to.eq(payee.supplierCode);
      expect(data[6]).to.eq(payee.payeeCategories.join(';'));
      expect(data[7]).to.eq(payee.contactEmail);
      expect(data[8]).to.eq(payee.address);
      expect(data[9]).to.eq(payee.country);
      expect(data[10]).to.eq(payee.vatNo);
      expect(data[11]).to.eq(payee.selfBillingTaxText);
      expect(data[12]).to.eq(payee.selfBillingTaxRate);
      expect(data[13]).to.eq(payee.feesInvoiceTaxRate);
      expect(data[14]).to.eq(payee.withholdingTaxRate);
      expect(data[15]).to.eq(payee.withholdingTaxWording);
      expect(data[16]).to.eq(payee.paymentEmail);
      expect(data[17]).to.eq(payee.paymentCurrency);
      expect(data[18]).to.eq(payee.bankName);
      expect(data[19]).to.eq(payee.bankAddress);
      expect(data[20]).to.eq(payee.accountNo);
      expect(data[21]).to.eq(payee.sortCode);
      expect(data[22]).to.eq(payee.iban);
      expect(data[23]).to.eq(payee.swiftCode);
      expect(data[24]).to.eq(payee.notes);
      done();
    });
  });

  describe('updateCopyToCatalogueClients', function () {
    let clientFindStub;
    let updateCopyToCatalogueByClientStub;

    beforeEach(function (done) {
      clientFindStub = sinon.stub(Client, 'find');
      clientFindStub.resolves([client]);

      updateCopyToCatalogueByClientStub = sinon.stub(payee, 'updateCopyToCatalogueByClient');
      updateCopyToCatalogueByClientStub.yields();

      done();
    });

    afterEach(function (done) {
      clientFindStub.restore();
      updateCopyToCatalogueByClientStub.restore();

      done();
    });

    describe('when payee has a clientId', function () {
      it("should call Client.find on inheritCatalogueFrom with the payee's client ID", function (done) {
        // Act
        payee.updateCopyToCatalogueClients(function () {
          // Assert
          expect(clientFindStub.called).to.be.true;
          expect(clientFindStub.calledWith({ 'inheritCatalogueFrom.clientId': payee.clientId })).to.be.true;
          done();
        });
      });

      describe('when client has inheritCatalogueFrom clients', function () {
        let client3;
        beforeEach((done) => {
          client3 = new Client({ name: testUtils.randomString(), inheritCatalogueFrom: [{ clientId: payee.clientId, transferPayees: true }] });
          done();
        });
        it('should call updateCopyToCatalogueByClient on each client returned', function (done) {
          // Arrange
          clientFindStub.resolves([client3]);
          // Act
          payee.updateCopyToCatalogueClients(function () {
            // Assert
            expect(updateCopyToCatalogueByClientStub.called).to.be.true;
            expect(updateCopyToCatalogueByClientStub.calledWith(client3)).to.be.true;
            done();
          });
        });
      });

      describe('when client has no inheritCatalogueFrom clients', function () {
        it('should not call updateCopyToCatalogueByClient', function (done) {
          // Arrange
          clientFindStub.resolves([]);

          // Assert
          payee.updateCopyToCatalogueClients(function () {
            expect(updateCopyToCatalogueByClientStub.called).to.be.false;
            done();
          });
        });

        it('should not raise an error', function (done) {
          // Arrange
          clientFindStub.resolves([]);

          // Act
          payee.updateCopyToCatalogueClients(function (err) {
            // Assert
            expect(err).to.be.null;
            done();
          });
        });
      });
    });

    describe('when payee has no clientId', function () {
      it('should not raise an error', function (done) {
        // Arrange
        payee.clientId = null;
        clientFindStub.resolves([]);

        // Act
        payee.updateCopyToCatalogueClients(function (err) {
          // Assert
          expect(err).to.be.null;
          done();
        });
      });
    });
  });

  describe('updateCopyToCatalogueByClient', function () {
    let payeeSaveSpy; let payeeFindStub; let otherPayee; let payeeCopyValuesSpy;

    beforeEach(async () => {
      otherPayee = new Payee({ name: `Other Payee ${Math.random().toString(36)}`, clientId: client._id });
      await otherPayee.save();

      payeeSaveSpy = sinon.spy(Payee.prototype, 'save');
      payeeFindStub = sinon.stub(Payee, 'findOne');
      payeeFindStub.resolves(otherPayee);
      payeeCopyValuesSpy = sinon.spy(otherPayee, 'copyValues');

      await Payee.deleteOne({ duplicatedFrom: otherPayee._id });
    });

    afterEach(function (done) {
      payeeSaveSpy.restore();
      payeeFindStub.restore();
      payeeCopyValuesSpy.restore();
      done();
    });

    it("should call findOne using the duplicatedFrom field and the current Payee's ID", function (done) {
      // Act
      payee.updateCopyToCatalogueByClient(client, function () {
        // Assert
        expect(payeeFindStub.called).to.be.true;
        expect(payeeFindStub.calledWith({ clientId: client._id.toString(), duplicatedFrom: payee.id.toString() })).to.be.true;
        done();
      });
    });

    describe('when a payee is found', function () {
      it('the found payee should have copyValues called on it', function (done) {
        // Act
        payee.updateCopyToCatalogueByClient(client, function () {
          // Assert
          expect(payeeCopyValuesSpy.called).to.be.true;
          done();
        });
      });
    });

    describe('when a payee is not found', function () {
      it('new payee should be created', function (done) {
        // Arrange
        otherPayee = new Payee({ name: `One Other Payee ${Math.random().toString(36)}` });
        payeeFindStub.resolves(null);

        // Act
        Payee.countDocuments({})
          .then((initialCount) => {
            otherPayee.updateCopyToCatalogueByClient(client, function () {
              Payee.countDocuments({})
                .then((secondCount) => {
                  // Assert
                  expect(secondCount).to.eq(initialCount + 1);
                  done();
                }).catch(done);
            });
          }).catch(done);
      });
    });
  });

  describe('copyValues', function () {
    describe('when passed a payee to copy', function () {
      it('should set each of the payeeFields from the payee', function (done) {
        // Act
        payee.copyValues(payee, payee.clientId, function (err, newPayee) {
          // Assert
          expect(newPayee.name).to.be.eq(payee.name);
          expect(newPayee.alternateName).to.be.eq(payee.alternateName);
          expect(newPayee.foreignId).to.be.eq(payee.foreignId);
          expect(newPayee.projectId).to.be.eq(payee.projectId);
          expect(newPayee.supplierCode).to.be.eq(payee.supplierCode);
          expect(newPayee.contactEmail).to.be.eq(payee.contactEmail);
          expect(newPayee.address).to.be.eq(payee.address);
          expect(newPayee.country).to.be.eq(payee.country);
          expect(newPayee.vatNo).to.be.eq(payee.vatNo);
          expect(newPayee.bankName).to.be.eq(payee.bankName);
          expect(newPayee.bankAddress).to.be.eq(payee.bankAddress);
          expect(newPayee.accountNo).to.be.eq(payee.accountNo);
          expect(newPayee.sortCode).to.be.eq(payee.sortCode);
          expect(newPayee.iban).to.be.eq(payee.iban);
          expect(newPayee.notes).to.be.eq(payee.notes);
          expect(newPayee.duplicatedFrom).to.be.eq(payee.duplicatedFrom);
          done();
        });
      });

      it('should set the clientId to the passed client ID', function (done) {
        // Act
        payee.copyValues(payee, payee.clientId, function (err, newPayee) {
          // Assert
          expect(newPayee.clientId).to.be.eq(payee.clientId);
          done();
        });
      });
    });

    describe('when not passed a payee to copy', function () {
      it('should raise an error', function (done) {
        // act
        payee.copyValues(null, payee.clientId, function (err) {
          // Assert
          expect(err).to.be.eq('Payee not found');
          done();
        });
      });
    });
  });
});
