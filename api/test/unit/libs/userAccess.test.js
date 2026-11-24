process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const sinon = require('sinon');
const { expect } = require('chai');

let Payee;

describe('User Access', () => {
  logger.info('\n\n**** .test/unit/libs/userAccess.test.js');

  beforeEach((done) => {
    Payee = require('../../../models/payee');
    sinon.restore();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#isUserForbidden', () => {
    describe('When user is internal', () => {
      it('Should return false on all documents', async () => {
        // Arrange
        const clientId = randomId();
        const user = { internal: true, clientId };
        const document = { clientId };

        // Act
        const response = await UserAccess.isUserForbidden({ Payee, user, document });

        // Assert
        expect(response).to.be.false;
      });
      it('Should return true when adminOnly is true ', async () => {
        // Arrange
        const user = { internal: true };
        const adminOnly = true;

        // Act
        const response = await UserAccess.isUserForbidden({ Payee, user, adminOnly });

        // Assert
        expect(response).to.be.true;
      });
      describe('When document does NOT contain a clientId AND adminOnly is false', () => {
        it('Should return false', async () => {
          // Arrange
          const user = { internal: true };
          const adminOnly = false;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, adminOnly });

          // Assert
          expect(response).to.be.false;
        });
      });
    });
    describe('When user is Admin', () => {
      let clientId; let user;
      beforeEach((done) => {
        clientId = randomId();
        user = { clientId, rights: { [clientId]: { admin: true } } };
        done();
      });
      describe('When NO document is provided', () => {
        it('should return true', async () => {
          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When NO type is provided', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When NO user is provided', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, document });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When NO operation is provided', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When requesting document contains a different Client ID', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId: randomString() };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When requesting document contains the SAME Client ID', () => {
        it('should return false', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When user is logged into a different client', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';

          user.clientId = randomId();

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When adminOnly is true AND user has admin access to requesting document', () => {
        it('should return false', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';
          const adminOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, adminOnly });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When adminOnly is true AND user does NOT have admin access to requesting document', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId: randomId() };
          const type = 'catalogue';
          const operation = 'read';
          const adminOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, adminOnly });

          // Assert
          expect(response).to.be.true;
        });
        it('should return true', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';
          const adminOnly = true;

          user.clientId = randomId();

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, adminOnly });

          // Assert
          expect(response).to.be.true;
        });
        describe('When no user is passed', () => {
          it('should return true', async () => {
            // Arrange
            const document = { clientId };
            const type = 'catalogue';
            const operation = 'read';
            const adminOnly = true;

            // Act
            const response = await UserAccess.isUserForbidden({ Payee, document, type, operation, adminOnly });

            // Assert
            expect(response).to.be.true;
          });
        });
      });
    });
    describe('When user is a Payee', () => {
      let payeeId; let user; let clientId;
      beforeEach((done) => {
        payeeId = randomId();
        user = { payeeId };
        done();
      });
      describe('When request is adminOnly', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';
          const adminOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, adminOnly });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When request is parentOnly', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';
          const parentOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, parentOnly });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When request is clientOnly', () => {
        it('should return true', async () => {
          // Arrange
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';
          const clientOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, clientOnly });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When request is payeeOnly and user does NOT have a clientId', () => {
        it('should return false', async () => {
          // Arrange
          const document = { _id: payeeId, clientId };
          const type = 'catalogue';
          const operation = 'read';
          const payeeOnly = true;

          const curveUser = { payeeId };

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user: curveUser, document, type, operation, payeeOnly });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When request is payeeOnly and user DOES have a clientId', () => {
        it('should return true', async () => {
          // Arrange
          const document = { _id: payeeId, clientId };
          const type = 'catalogue';
          const operation = 'read';
          const payeeOnly = true;

          user.clientId = randomId();

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, payeeOnly });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When request is payeeOnly and document ID is different to the users payeeID', () => {
        it('should return true', async () => {
          // Arrange
          const document = { _id: randomId(), clientId };
          const type = 'catalogue';
          const operation = 'read';
          const payeeOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, payeeOnly });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When request is payeeOnly and document ID is the SAME as payeeId AND user does NOT have a clientId', () => {
        it('should return false', async () => {
          // Arrange
          const document = { _id: payeeId };
          const type = 'catalogue';
          const operation = 'read';
          const payeeOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, payeeOnly });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When request is payeeOnly and document ID is the SAME as payeeId AND user does NOT have a clientId', () => {
        it('should return false', async () => {
          // Arrange
          const document = { _id: payeeId };
          const type = 'catalogue';
          const operation = 'read';
          const payeeOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type, operation, payeeOnly });

          // Assert
          expect(response).to.be.false;
        });
      });
    });
    describe('When user is a Parent', () => {
      let user; let parentId; let clientId;
      beforeEach((done) => {
        parentId = randomId();
        user = { parentId, clientId };
        done();
      });
      describe('When parentOnly is set to True AND parentId does not match documentId', () => {
        it('should return true', async () => {
          // Arrange
          const document = { _id: parentId };
          const operation = 'read';
          const parentOnly = true;

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, parentOnly });

          // Assert
          expect(response).to.be.true;
        });
      });
      // TODO - There's an issue with parent users and other documents, currently we're saving null against their user rights
    });
    describe('When user is a Standard', () => {
      let clientId;
      beforeEach((done) => {
        clientId = randomId();
        done();
      });
      // Catalogue
      describe('When user has Edit rights on Catalogue and wants to read a Catalogue document', () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { catalogue: 'Edit' } } };
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When user has Edit rights on Catalogue and wants to write a Catalogue document', () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { catalogue: 'Edit' } } };
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When user has Edit rights on Catalogue and wants to read a Catalogue document from a different client', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { catalogue: 'Edit' } } };
          const document = { clientId: randomId() };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When user has 'View' rights on Catalogue and wants to read a Catalogue document", () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { catalogue: 'View' } } };
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe("When user has 'View' rights on Catalogue and wants to read a Catalogue document from a different client", () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { catalogue: 'View' } } };
          const document = { clientId: randomId() };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When user has 'None' rights on Catalogue and wants to read a Catalogue document", () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { catalogue: 'None' } } };
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When user has NO rights on Catalogue and wants to read a Catalogue document', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: {} } };
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When user has NO rights on Catalogue and wants to write a Catalogue document', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: {} } };
          const document = { clientId };
          const type = 'catalogue';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      // Sales
      describe('When user has Edit rights on Sales and wants to read a Sales document', () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'Edit' } } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When user has Edit rights on sales and wants to write a sales document', () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'Edit' } } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe('When user has Edit rights on sales and wants to read a sales document from a different client', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'Edit' } } };
          const document = { clientId: randomId() };
          const type = 'sales';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When user has 'View' rights on sales and wants to read a sales document", () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'View' } } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe("When user has 'View' rights on sales and wants to read a sales document from a different client", () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'View' } } };
          const document = { clientId: randomId() };
          const type = 'sales';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When user has 'View' rights on sales and wants to read a sales document from a different client", () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'View' } } };
          const document = { clientId: randomId() };
          const type = 'sales';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When user has 'None' rights on sales and wants to read a sales document", () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'None' } } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: {} } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When user has NO rights on sales and wants to read a sales document', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: {} } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'read';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When user has NO rights on sales and wants to write a sales document', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: {} } };
          const document = { clientId };
          const type = 'sales';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When operation is write&approval & user has no rights', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: {} } };
          const document = { clientId };
          const type = 'periods';
          const operation = 'write&approval';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When operation is write&approval & user has 'View' rights", () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { periods: 'View' } } };
          const document = { clientId };
          const type = 'periods';
          const operation = 'write&approval';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe("When operation is write&approval & user has 'Edit' rights", () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { periods: 'Edit' } } };
          const document = { clientId };
          const type = 'periods';
          const operation = 'write&approval';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      describe("When operation is write&approval & user has 'Approval' rights", () => {
        it('should return false', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { periods: 'Approval' } } };
          const document = { clientId };
          const type = 'periods';
          const operation = 'write&approval';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.false;
        });
      });
      // Payee
      describe('When user is payee & payeeOnly is Off', () => {
        let payeeId; let clientId; let user;
        beforeEach((done) => {
          // Vars
          clientId = randomId();
          payeeId = randomId();
          user = { payeeId };
          done();
        });
        it('should call Payee.findById', async () => {
          // Arrange
          // TODO wrapping a stub like this seems to stop issues when running all tests.
          // TODO doing it this way Payee.findById = sinon.stub().resolve(); causes errors when globally running unit tests
          sinon.stub(Payee, 'findById');
          Payee.findById.resolves({ clientId });

          const document = { clientId };
          const type = 'periods';
          const operation = 'write&approval';

          // Act
          await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(Payee.findById.called).to.be.true;
        });
        describe('When Payee.find does not return a payee', () => {
          it('should return true', async () => {
            // Arrange
            sinon.stub(Payee, 'findById').rejects('Could not find Payee');
            const document = { clientId };
            const type = 'periods';
            const operation = 'write&approval';

            // Act
            const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

            // Assert
            expect(response).to.be.true;
            expect(Payee.findById.called).to.be.true;
          });
        });
        describe('When found Payee clientId does NOT match document clientId', () => {
          it('should return true', async () => {
            // Arrange
            sinon.stub(Payee, 'findById').resolves({ clientId: randomId() });
            const document = { clientId };
            const type = 'periods';
            const operation = 'write&approval';

            // Act
            const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

            // Assert
            expect(response).to.be.true;
          });
        });
      });
      // General Standard User Tests
      describe('When a user right cannot be found', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'Edit' } } };
          const document = { clientId };
          const type = 'periods';
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation, type });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When type is missing', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'Edit' } } };
          const document = { clientId };
          const operation = 'write';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, operation });

          // Assert
          expect(response).to.be.true;
        });
      });
      describe('When operation is missing', () => {
        it('should return true', async () => {
          // Arrange
          const user = { clientId, rights: { [clientId]: { sales: 'Edit' } } };
          const document = { clientId };
          const type = 'sales';

          // Act
          const response = await UserAccess.isUserForbidden({ Payee, user, document, type });

          // Assert
          expect(response).to.be.true;
        });
      });
    });
  });
  describe('#allowReadAccessToAll', () => {
    let clientId; let payeeId;
    beforeEach((done) => {
      clientId = randomId();
      payeeId = randomId();
      done();
    });
    describe('When user is not passed or falsy', () => {
      it('should return false', async () => {
        // Arrange
        const user = {};
        const type = 'catalogue';

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When user is internal', () => {
      it('should return true', async () => {
        // Arrange
        const user = { internal: true };
        const type = 'catalogue';

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user });

        // Assert
        expect(response).to.be.true;
      });
    });
    describe('When adminOnly is true but user is NOT an admin', () => {
      it('should return false', async () => {
        // Arrange
        const user = { clientId, rights: { [clientId]: { catalogue: 'Edit' } } };
        const type = 'catalogue';
        const adminOnly = true;

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user, adminOnly });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When adminOnly is true but user IS an admin', () => {
      it('should return true', async () => {
        // Arrange
        const user = { clientId, rights: { [clientId]: { catalogue: 'Edit', admin: true } } };
        const type = 'catalogue';
        const adminOnly = true;

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user, adminOnly });

        // Assert
        expect(response).to.be.true;
      });
    });
    describe('When allowPayee is true and user.payeeId exists', () => {
      it('should return true', async () => {
        // Arrange
        const user = { payeeId };
        const type = 'catalogue';
        const allowPayee = true;

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user, allowPayee });

        // Assert
        expect(response).to.be.true;
      });
    });
    describe('When allowPayee is true and user.payeeId does NOT exists', () => {
      it('should return false', async () => {
        // Arrange
        const user = {};
        const type = 'catalogue';
        const allowPayee = true;

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user, allowPayee });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When allowPayee is false and user.payeeId exists but Client Id does NOT', () => {
      it('should return false', async () => {
        // Arrange
        const user = { payeeId };
        const type = 'catalogue';
        const allowPayee = false;

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user, allowPayee });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When user.clientId does not exist', () => {
      it('should return false', async () => {
        // Arrange
        const user = {};
        const type = 'catalogue';

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When user rights does NOT include View or Edit', () => {
      it('should return false', async () => {
        // Arrange
        const user = { rights: null };
        const type = 'catalogue';

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When user rights includes None', () => {
      it('should return false', async () => {
        // Arrange
        const user = { clientId, rights: { [clientId]: { catalogue: 'None' } } };
        const type = 'catalogue';

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user });

        // Assert
        expect(response).to.be.false;
      });
    });
    describe('When user has Edit or View rights', () => {
      it('should return true', async () => {
        // Arrange
        const options = ['Edit', 'View'];
        const right = options[Math.floor(Math.random() * options.length)];
        const user = { clientId, rights: { [clientId]: { catalogue: right } } };
        const type = 'catalogue';

        // Act
        const response = await UserAccess.allowReadAccessToAll({ type, user });

        // Assert
        expect(response).to.be.true;
      });
    });
  });
});
