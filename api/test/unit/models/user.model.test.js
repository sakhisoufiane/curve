process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const User = require('../../../models/user');
const Payee = require('../../../models/payee');
const Client = require('../../../models/client');
const Parent = require('../../../models/parent');
const SendEmail = require('../../../libs/sendEmail');

logger.debug('\n\n**** .test/unit/libs/user.unit.test');

describe('User', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    sinon.stub(Payee.prototype, 'isPayeePayable').resolves({});
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

  describe('#validateUserPayeeAccess', () => {
    let userDoc;
    beforeEach((done) => {
      // Vars
      userDoc = new User();

      // Async Stubs
      sinon.stub(User, 'findById');
      User.findById.resolves();

      sinon.stub(Payee, 'find');
      Payee.find.resolves();

      done();
    });

    describe('When newUser is assigned to a payee which the requestingUser has access to', () => {
      it('should return an array of accepted payeeIds ignoring any payeeIds the requesting user does not have access to', async () => {
        // Act
        const actingClientId = randomId();
        const validPayeeId = randomId();
        const requestingUser = { id: randomId(), clientIds: [actingClientId] };
        const newUser = { payeeIds: [validPayeeId] };

        User.findById.resolves({ _id: randomId() });
        Payee.find.resolves([{ _id: new ObjectId(validPayeeId) }, { _id: new ObjectId(randomId()) }, { _id: new ObjectId(randomId()) }]);

        // Act
        const payeeIds = await userDoc.validateUserPayeeAccess(requestingUser, actingClientId, newUser).catch(logger.error);
        // Assert
        expect(payeeIds).to.deep.eq([validPayeeId]);
      });
    });

    describe('When newUser is assigned to a payee which the requestingUser does not have access to', () => {
      it('should return undefined', async () => {
        // Act
        const actingClientId = randomId();
        const validPayeeId = randomId();
        const requestingUser = { id: randomId(), clientIds: [actingClientId] };
        const newUser = { payeeIds: [validPayeeId] };

        User.findById.resolves({ _id: randomId() });
        Payee.find.resolves([{ _id: new ObjectId(randomId()) }, { _id: new ObjectId(randomId()) }]);

        // Act
        const payeeIds = await userDoc.validateUserPayeeAccess(requestingUser, actingClientId, newUser).catch(logger.error);
        // Assert
        expect(payeeIds).to.eq(undefined);
      });
    });

    describe('When payee.find returns no payees', () => {
      it('should throw an error', async () => {
        // Act
        const actingClientId = randomId();
        const validPayeeId = randomId();
        const requestingUser = { id: randomId(), clientIds: [actingClientId] };
        const newUser = { payeeIds: [validPayeeId] };
        const errorMessage = new Error(`No Payees found with clientId ${actingClientId}`);

        User.findById.resolves({ _id: randomId() });
        Payee.find.resolves([]);

        // Act
        await userDoc.validateUserPayeeAccess(requestingUser, actingClientId, newUser).catch((err) => {
          // Assert
          expect(err.message).to.deep.eq(errorMessage.message);
        });
      });
      it('acceptedIds should return undefined', async () => {
        // Act
        const actingClientId = randomId();
        const validPayeeId = randomId();
        const requestingUser = { id: randomId(), clientIds: [actingClientId] };
        const newUser = { payeeIds: [validPayeeId] };

        User.findById.resolves({ _id: randomId() });
        Payee.find.resolves([]);

        // Act
        const acceptedIds = await userDoc.validateUserPayeeAccess(requestingUser, actingClientId, newUser).catch(logger.error);
        expect(acceptedIds).to.eq(undefined);
      });
    });

    describe('When payee.find throws an error', () => {
      it('should throw an error', async () => {
        // Act
        const actingClientId = randomId();
        const validPayeeId = randomId();
        const requestingUser = { id: randomId(), clientIds: [actingClientId] };
        const newUser = { payeeIds: [validPayeeId] };
        const errorMessage = new Error(randomString());

        User.findById.resolves({ _id: randomId() });
        Payee.find.rejects(errorMessage);

        // Act
        await userDoc.validateUserPayeeAccess(requestingUser, actingClientId, newUser).catch((err) => {
          // Assert
          expect(err.message).to.deep.eq(errorMessage.message);
        });
      });
      it('acceptedIds should return undefined', async () => {
        // Act
        const actingClientId = randomId();
        const validPayeeId = randomId();
        const requestingUser = { id: randomId(), clientIds: [actingClientId] };
        const newUser = { payeeIds: [validPayeeId] };
        const errorMessage = new Error(randomString());

        User.findById.resolves({ _id: randomId() });
        Payee.find.rejects(errorMessage);

        // Act
        const acceptedIds = await userDoc.validateUserPayeeAccess(requestingUser, actingClientId, newUser).catch(logger.error);
        expect(acceptedIds).to.eq(undefined);
      });
    });

    describe('When requesting user is not found', () => {
      it('should throw an error', async () => {
        // Arrange
        const clientId = randomId();
        const requestingUser = { id: randomId(), clientIds: [clientId] };
        const errorMessage = new Error(`User not found with ID ${requestingUser.id}`);

        User.findById.resolves(null);

        // Act
        await userDoc.validateUserPayeeAccess(requestingUser, clientId, {}).catch((err) => {
          // Assert
          expect(err.message).to.deep.eq(errorMessage.message);
        });
      });
      it('acceptedIds should return undefined', async () => {
        // Arrange
        const clientId = randomId();
        const requestingUser = { id: randomId(), clientIds: [clientId] };

        User.findById.resolves(null);

        // Act
        const payeeIds = await userDoc.validateUserPayeeAccess(requestingUser, clientId, {}).catch(logger.error);
        // Assert
        expect(payeeIds).to.eq(undefined);
      });
    });
    describe('when user.findById throws an error', () => {
      it('acceptedIds should return undefined', async () => {
        // Arrange
        const clientId = randomId();
        const requestingUser = { id: randomId(), clientIds: [clientId] };

        User.findById.rejects(randomString());

        // Act
        const payeeIds = await userDoc.validateUserPayeeAccess(requestingUser, clientId, {}).catch(logger.error);
        // Assert
        expect(payeeIds).to.eq(undefined);
      });
    });
  });

  describe('#checkAssociatedIdUpdates', () => {
    let userToUpdate;
    beforeEach((done) => {
      // Vars
      userToUpdate = new User({ _id: randomString() });

      // Stubs
      sinon.stub(User, 'findById');
      User.findById.resolves();

      sinon.stub(User.prototype, 'getAdminClientIds');
      User.prototype.getAdminClientIds.yields();

      sinon.stub(User.prototype, 'getPossiblePayeeIds');
      User.prototype.getPossiblePayeeIds.yields();

      done();
    });

    describe('When User.findById returns nothing', () => {
      it('should return an error', (done) => {
        // Arrange
        const requestingUser = { id: randomId() };
        User.findById.resolves(undefined);
        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, randomId(), [], [], (err) => {
          // Assert
          expect(err.message).to.deep.eq(`User not found with ID ${requestingUser.id}`);
          done();
        });
      });
    });

    describe('When User.findById returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const requestingUser = { id: randomId() };
        User.findById.resolves(randomString());
        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, randomId(), [], [], (err) => {
          // Assert
          expect(err.message).to.deep.eq(`User not found with ID ${requestingUser.id}`);
          done();
        });
      });
    });

    describe('When there are no new clientIds and payeeIds', () => {
      it('should return the same array of client and payeeIds going into the function', (done) => {
        // Arrange
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [];
        userToUpdate.payeeIds = [];
        const reqClientIds = [];
        const reqPayeeIds = [];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId()]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId()]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, payeeIds, clientIds) => {
          // Assert
          expect(clientIds).to.deep.eq(reqClientIds);
          expect(payeeIds).to.deep.eq(reqPayeeIds);
          done();
        });
      });
    });

    describe('When there are no new clientIds and payeeIds, but the userToUpdate has client and or payeeIds already attached', () => {
      it('should return the same array of client and payeeIds going into the function', (done) => {
        // Arrange
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [randomId()];
        userToUpdate.payeeIds = [randomId()];
        const reqClientIds = [];
        const reqPayeeIds = [];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId()]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId()]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, clientIds, payeeIds) => {
          // Assert
          expect(clientIds).to.deep.eq(userToUpdate.clientIds);
          expect(payeeIds).to.deep.eq(userToUpdate.payeeIds);
          done();
        });
      });
    });

    describe('When a new payeeId is added but the requesting user does not have rights to add', () => {
      it('should not add new id to userToUpdate', (done) => {
        // Arrange
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [randomId()];
        userToUpdate.payeeIds = [randomId()];
        const reqClientIds = [];
        const reqPayeeIds = [randomId()];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId()]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId()]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, clientIds, payeeIds) => {
          // Assert
          expect(clientIds).to.deep.eq(userToUpdate.clientIds);
          expect(payeeIds).to.deep.eq(userToUpdate.payeeIds);
          done();
        });
      });
    });

    describe('When a new clientId is added but the requesting user does not have rights to add', () => {
      it('should not add new id to userToUpdate', (done) => {
        // Arrange
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [randomId()];
        userToUpdate.payeeIds = [randomId()];
        const reqClientIds = [randomId()];
        const reqPayeeIds = [];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId()]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId()]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, clientIds, payeeIds) => {
          // Assert
          expect(clientIds).to.deep.eq(userToUpdate.clientIds);
          expect(payeeIds).to.deep.eq(userToUpdate.payeeIds);
          done();
        });
      });
    });

    describe('When a new clientId and payeeId is added but the requesting user does not have rights to add', () => {
      it('should not add new id to userToUpdate', (done) => {
        // Arrange
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [randomId()];
        userToUpdate.payeeIds = [randomId()];
        const reqClientIds = [randomId()];
        const reqPayeeIds = [randomId()];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId()]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId()]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, clientIds, payeeIds) => {
          // Assert
          expect(clientIds).to.deep.eq(userToUpdate.clientIds);
          expect(payeeIds).to.deep.eq(userToUpdate.payeeIds);
          done();
        });
      });
    });

    describe('When a new payeeId is added and the requesting user has permission to add this to the userToUpdate', () => {
      it('should add new payeeId to userToUpdate', (done) => {
        // Arrange
        const newPayeeId = randomId();
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [randomId()];
        userToUpdate.payeeIds = [randomId()];
        const reqClientIds = [randomId()];
        const reqPayeeIds = [newPayeeId];

        const correctPayeeIds = [userToUpdate.payeeIds[0], newPayeeId];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId()]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId(), newPayeeId]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, clientIds, payeeIds) => {
          // Assert
          expect(clientIds).to.deep.eq(userToUpdate.clientIds);
          expect(payeeIds).to.deep.eq(correctPayeeIds);
          done();
        });
      });
    });

    describe('When a new admin clientId is added and the requesting user has permission to add this to the userToUpdate', () => {
      it('should add new clientId to userToUpdate', (done) => {
        // Arrange
        const newClientId = randomId();
        const actingClientId = randomId();
        const requestingUser = new User({ adminClientIds: [actingClientId] });
        userToUpdate.clientIds = [randomId()];
        userToUpdate.payeeIds = [randomId()];
        const reqClientIds = [newClientId];
        const reqPayeeIds = [randomId()];

        const correctClientIds = [userToUpdate.clientIds[0], newClientId];

        User.findById.resolves(requestingUser);
        User.prototype.getAdminClientIds.yields(null, [randomId(), newClientId]);
        User.prototype.getPossiblePayeeIds.yields(null, [randomId()]);

        // Act
        userToUpdate.checkAssociatedIdUpdates(requestingUser, actingClientId, reqClientIds, reqPayeeIds, (err, clientIds, payeeIds) => {
          // Assert
          expect(clientIds).to.deep.eq(correctClientIds);
          expect(payeeIds).to.deep.eq(userToUpdate.payeeIds);
          done();
        });
      });
    });
  });

  describe('#createMultiFactorTokenAndSendEmail', () => {
    beforeEach((done) => {
      sinon.stub(User.prototype, 'save').resolves();
      sinon.stub(SendEmail, 'multiFactorAuthentication').yields(null);
      done();
    });

    describe('When the user has a stale clientId left over from a previous session, but is a parent-level user', () => {
      it('should clear the stale clientId and send the email using the parent, not the stale client', (done) => {
        // Arrange
        const parentId = randomId();
        const staleClientId = randomId();
        const user = new User({ parentId, clientId: staleClientId, email: randomString() });

        sinon.stub(Client, 'findById');
        sinon.stub(Parent, 'findById');
        Parent.findById.resolves({ _id: parentId });

        // Act
        user.createMultiFactorTokenAndSendEmail((err, token) => {
          // Assert
          expect(err).to.eq(null);
          expect(token).to.be.a('string');
          expect(user.clientId).to.eq(null);
          expect(Client.findById.called).to.eq(false);
          expect(Parent.findById.calledWith(parentId)).to.eq(true);
          const [, parentArg] = SendEmail.multiFactorAuthentication.firstCall.args;
          expect(parentArg._id).to.eq(parentId);
          done();
        });
      });
    });

    describe('When clearing the stale temporary status fails to save', () => {
      it('should stop and return the error, without resolving client/parent branding or sending the email', (done) => {
        // Arrange
        const parentId = randomId();
        const staleClientId = randomId();
        const user = new User({ parentId, clientId: staleClientId, email: randomString() });
        const saveError = new Error('boom');

        User.prototype.save.restore();
        sinon.stub(User.prototype, 'save');
        User.prototype.save.onCall(0).resolves(); // the save of the mfa code, prior to clearing temporary status
        User.prototype.save.onCall(1).rejects(saveError); // the save inside clearTemporaryStatus

        sinon.stub(Client, 'findById');
        sinon.stub(Parent, 'findById');

        // Act
        user.createMultiFactorTokenAndSendEmail((err, token) => {
          // Assert
          expect(err).to.eq(saveError);
          expect(token).to.eq(null);
          expect(Client.findById.called).to.eq(false);
          expect(Parent.findById.called).to.eq(false);
          expect(SendEmail.multiFactorAuthentication.called).to.eq(false);
          done();
        });
      });
    });

    describe('When the user has a clientId that is still valid', () => {
      it('should keep using that client to resolve the email branding', (done) => {
        // Arrange
        const clientId = randomId();
        const user = new User({ clientId, clientIds: [clientId], email: randomString() });
        const fakeParent = { _id: randomId() };

        sinon.stub(Client, 'findById');
        Client.findById.resolves({ getParent: (cb) => cb(null, fakeParent) });

        // Act
        user.createMultiFactorTokenAndSendEmail((err, token) => {
          // Assert
          expect(err).to.eq(null);
          expect(token).to.be.a('string');
          expect(user.clientId.toString()).to.eq(clientId.toString());
          expect(Client.findById.calledWith(clientId)).to.eq(true);
          const [, parentArg] = SendEmail.multiFactorAuthentication.firstCall.args;
          expect(parentArg._id).to.eq(fakeParent._id);
          done();
        });
      });
    });
  });
});
