const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/contract/setStatementDesign.js.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Client = require('../../../../../models/client');
const Contract = require('../../../../../models/contract');
const Company = require('../../../../../models/company');

describe('SetStatementDesign Unit Tests', () => {
  let SetStatementDesign;
  let contract; let company; let client;
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    SetStatementDesign = rewire('../../../../../libs/calculation/contract/setStatementDesign');

    company = { _id: randomId() };
    client = { _id: randomId() };
    contract = { _id: randomId(), clientId: client._id, companyId: company._id };

    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);
    sinon.stub(Company, 'findById').resolves(company);
    sinon.stub(Contract, 'updateOne').resolves(contract);

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it('should call Client.findById with the args', (done) => {
    // Act
    SetStatementDesign(contract, () => {
      // Assert
      expect(Client.findById.calledWith(contract.clientId)).to.be.true;
      done();
    });
  });

  describe('when contract.companyId', () => {
    it('should call Company.findById with the args', (done) => {
      // Act
      SetStatementDesign(contract, () => {
        // Assert
        expect(Company.findById.calledWith(contract.companyId)).to.be.true;
        done();
      });
    });

    describe('when company.statementDesign', () => {
      it('should set contract.statementDesign to company.statementDesign', (done) => {
        // Arrange
        company.statementDesign = randomString();
        // Act
        SetStatementDesign(contract, () => {
          // Assert
          expect(Contract.updateOne.calledWith(
            { _id: contract._id },
            { $set: { statementDesign: company.statementDesign } },
            { timestamps: false },
          )).to.be.true;
          done();
        });
      });
    });

    describe('when no company.statementDesign', () => {
      it('should set contract.statementDesign to client.statementDesign', (done) => {
        // Arrange
        client.statementDesign = randomString();
        // Act
        SetStatementDesign(contract, () => {
          // Assert
          expect(Contract.updateOne.calledWith(
            { _id: contract._id },
            { $set: { statementDesign: client.statementDesign } },
            { timestamps: false },
          )).to.be.true;
          done();
        });
      });
    });
  });

  describe('when no contract.companyId', () => {
    it('should set contract.statementDesign to client.statementDesign', (done) => {
      // Arrange
      contract.companyId = null;
      client.statementDesign = randomString();
      // Act
      SetStatementDesign(contract, () => {
        // Assert
        expect(Contract.updateOne.calledWith(
          { _id: contract._id },
          { $set: { statementDesign: client.statementDesign } },
          { timestamps: false },
        )).to.be.true;
        done();
      });
    });
  });

  it('should call Contract.updateOne with the right args', (done) => {
    // Act
    SetStatementDesign(contract, () => {
      // Assert
      expect(Contract.updateOne.calledWith(
        { _id: contract._id },
        { $set: { statementDesign: client.statementDesign } },
        { timestamps: false },
      )).to.be.true;
      done();
    });
  });

  describe('when Contract.updateOne returns an error', () => {
    it('should return the error to the callback', () => {
      // Arrange
      const expectedError = randomString();
      Contract.updateOne = sinon.stub().rejects(expectedError);
      // Act
      SetStatementDesign(contract, (err) => {
        // Assert
        expect(err).to.exist;
        expect(err).to.eq(expectedError);
      });
    });
  });
});
