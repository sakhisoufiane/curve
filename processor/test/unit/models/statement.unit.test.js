// process.env.NODE_ENV = 'test';

// const { expect } = require('chai');
// const sinon = require('sinon');
// const mongoose = require('@curveroyaltysystems/models/mongoose');
// const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
// const rewire = require('rewire');

// let Statement;
// const Contract = require('../../../models/contract');

// describe('Statement', () => {
//   logger.info('>>>file>>>> unit/models/statement .....................');
//   let statement;

//   before((done) => {
//     delete mongoose.connection.models.Statement;
//     Statement = rewire('../../../models/statement');
//     sinon.restore();
//     done();
//   });

//   beforeEach((done) => {
//     // Create Statement
//     statement = new Statement({ contractId: testUtils.randomId() });
//     done();
//   });

//   afterEach((done) => {
//     sinon.restore();
//     done();
//   });

//   after((done) => {
//     sinon.restore();
//     done();
//   });

//   describe('profitShareSplitNegative', () => {
//     let contract;
//     const period = { _id: testUtils.randomId() };

//     beforeEach((done) => {
//       // Create contract
//       contract = new Contract({ profitSharePercentage: 50 });
//       // Stub Contract.findById
//       sinon.stub(Contract, 'findById');
//       Contract.findById.yields(null, contract);
//       // Stub statement.profitShareFigures
//       sinon.stub(Statement.prototype, 'profitShareFigures');
//       statement.profitShareFigures.yields();

//       done();
//     });

//     it('should call Contract.findById', (done) => {
//       // Act
//       statement.profitShareSplitNegative(period, () => {
//         // Assert
//         expect(Contract.findById.called).to.be.true;
//         expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
//         done();
//       });
//     });

//     it('should call statement.profitShareFigures', (done) => {
//       // Act
//       statement.profitShareSplitNegative(period, () => {
//         // Assert
//         expect(statement.profitShareFigures.called).to.be.true;
//         expect(statement.profitShareFigures.calledWith(period, contract)).to.be.true;
//         done();
//       });
//     });

//     describe('Test Case 1', () => {
//       it('should return the right result', (done) => {
//         // Arrange
//         // Opening Balance: 0
//         statement.openingBalance = 0;
//         // Advance: 0
//         statement.profitShareUnrecoupedAdvanceStart = 0;
//         // Period Net Amount: 100
//         statement.netAmount = 100;
//         // Other payments
//         statement.payments = 0;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//           // Assert
//           expect(statement.closingBalance).to.eq(50);
//           done();
//         });
//       });
//     });

//     describe('Test Case 2', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: 0
//         statement.openingBalance = 0;
//         // Advance: 100
//         statement.profitShareUnrecoupedAdvanceStart = -100;
//         // Period Net Amount: 50
//         statement.netAmount = 50;
//         // Other payments
//         statement.payments = 0;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.profitShareAdvanceRecouped).to.eq(25);
//           expect(statement.closingBalance).to.eq(0);
//           done();
//         });
//       });
//     });

//     describe('Test Case 3', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: 0
//         statement.openingBalance = 0;
//         // Advance: 45
//         statement.profitShareUnrecoupedAdvanceStart = -45;
//         // Period Net Amount: 50
//         statement.netAmount = 50;
//         // Other payments
//         statement.payments = 0;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.profitShareAdvanceRecouped).to.eq(25);
//           expect(statement.closingBalance).to.eq(0);
//           done();
//         });
//       });
//     });

//     describe('Test Case 4', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: -25
//         statement.openingBalance = -25;
//         // Advance: 0
//         statement.profitShareUnrecoupedAdvanceStart = 0;
//         // Period Net Amount: 100
//         statement.netAmount = 100;
//         // Other payments
//         statement.payments = 0;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.closingBalance).to.eq(25);
//           done();
//         });
//       });
//     });

//     describe('Test Case 5', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: -100
//         statement.openingBalance = -100;
//         // Advance: 0
//         statement.profitShareUnrecoupedAdvanceStart = 0;
//         // Period Net Amount: 100
//         statement.netAmount = 100;
//         // Other payments
//         statement.payments = 0;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.closingBalance).to.eq(-50);
//           done();
//         });
//       });
//     });

//     describe('Test Case 6', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: -40
//         statement.openingBalance = -40;
//         // Advance: 40
//         statement.profitShareUnrecoupedAdvanceStart = -40;
//         // Period Net Amount: 100
//         statement.netAmount = 100;
//         // Other payments
//         statement.payments = 0;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.profitShareAdvanceRecouped).to.eq(10);
//           expect(statement.closingBalance).to.eq(0);
//           done();
//         });
//       });
//     });

//     describe('Test Case 7', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: 50
//         statement.openingBalance = 50;
//         // Advance: 0
//         statement.profitShareUnrecoupedAdvanceStart = 0;
//         // Period Net Amount: 50
//         statement.netAmount = 50;
//         // Other payments
//         statement.payments = -25;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.closingBalance).to.eq(50);
//           done();
//         });
//       });
//     });

//     describe('Test Case 8', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: -25
//         statement.openingBalance = -25;
//         // Advance: 0
//         statement.profitShareUnrecoupedAdvanceStart = 0;
//         // Period Net Amount: 100
//         statement.netAmount = 100;
//         // Other payments
//         statement.payments = -10;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.closingBalance).to.eq(15);
//           done();
//         });
//       });
//     });

//     describe('Test Case 9', () => {
//       it('should return the right result', (done) => {
//       // Arrange
//       // Opening Balance: 0
//         statement.openingBalance = 0;
//         // Advance: 0
//         statement.profitShareUnrecoupedAdvanceStart = 0;
//         // Period Net Amount: 100
//         statement.netAmount = 100;
//         // Other payments
//         statement.payments = -20;
//         statement.otherTransactions = 0;
//         statement.reservesReleased = 0;
//         statement.reservesWithheld = 0;

//         // Act
//         statement.profitShareSplitNegative(period, () => {
//         // Assert
//           expect(statement.closingBalance).to.eq(30);
//           done();
//         });
//       });
//     });
//   });

//   describe('getHeadlineData', () => {
//     let contract;
//     beforeEach((done) => {
//       contract = new Contract();
//       // Stub Statement.findById
//       sinon.stub(Statement, 'findById');
//       // Stub Statement.findById
//       sinon.stub(Statement, 'findByIdAndUpdate');
//       Statement.findByIdAndUpdate.returns({ exec: sinon.stub().yields() });
//       // Stub Statement.findById
//       sinon.stub(Contract, 'findById');
//       // Stub singleStatementHeadlineFigures
//       Statement.__set__('headlineFigures', sinon.stub());
//       Statement.__get__('headlineFigures').yields(null, {});
//       done();
//     });

//     describe('When the contract isn\'t linked to a company and client.displaySeparatedDeductions is null', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         statement.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: null, currenciesToPrefix: () => ({}) };
//         const company = {};
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract isn\'t linked to a company and client.displaySeparatedDeductions is false', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         statement.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = {};
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract isn\'t linked to a company and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to true', (done) => {
//         // Arrange
//         statement.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = {};
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.true;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is null and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: null };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is false and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: false };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is true and client.displaySeparatedDeductions is false', () => {
//       it('should set statement.displaySeparatedDeductions to true', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: true };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.true;
//           done();
//         });
//       });
//     });

//     describe('When the contract is Mechanical, is linked to a company and company.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         contract.contractType = 'Mechanical';
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: true };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is Mechanical, is not linked to a company and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = null;
//         contract.contractType = 'Mechanical';
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: null };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is true and company.customDeductionName is set', () => {
//       it('should set statement.customDeductionName to company.customDeductionName', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}), customDeductionName: testUtils.randomString() };
//         const company = { displaySeparatedDeductions: true };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.customDeductionName).to.eq(company.customDeductionName);
//           done();
//         });
//       });
//     });

//     describe('When the contract is not linked to a company, client.displaySeparatedDeductions is true and client.customDeductionName is set', () => {
//       it('should set statement.customDeductionName to company.customDeductionName', (done) => {
//         // Arrange
//         contract.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}), customDeductionName: testUtils.randomString() };
//         const company = { displaySeparatedDeductions: false };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.customDeductionName).to.eq(client.customDeductionName);
//           done();
//         });
//       });
//     });
//   });

//   describe('getSummaryHeadlineData', () => {
//     let contract;
//     beforeEach((done) => {
//       contract = new Contract();
//       // Stub Statement.findById
//       sinon.stub(Statement, 'findById');
//       // Stub Statement.findById
//       sinon.stub(Statement, 'findByIdAndUpdate');
//       Statement.findByIdAndUpdate.returns({ exec: sinon.stub().yields() });
//       // Stub statement.associatedAddToContractIds
//       sinon.stub(Statement.prototype, 'associatedAddToContractIds');
//       statement.associatedAddToContractIds.yields(null, []);
//       // Stub Contract.findById
//       sinon.stub(Contract, 'findById');
//       // Stub singleStatementHeadlineFigures
//       Statement.__set__('headlineFigures', sinon.stub());
//       Statement.__get__('headlineFigures').yields(null, {});
//       done();
//     });

//     describe('When the contract isn\'t linked to a company and client.displaySeparatedDeductions is null', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         statement.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: null, currenciesToPrefix: () => ({}) };
//         const company = {};
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract isn\'t linked to a company and client.displaySeparatedDeductions is false', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         statement.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = {};
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract isn\'t linked to a company and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to true', (done) => {
//         // Arrange
//         statement.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = {};
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.true;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is null and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: null };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is false and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: false };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is true and client.displaySeparatedDeductions is false', () => {
//       it('should set statement.displaySeparatedDeductions to true', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: true };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.true;
//           done();
//         });
//       });
//     });

//     describe('When the contract is Mechanical, is linked to a company and company.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         contract.contractType = 'Mechanical';
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: true };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is Mechanical, is not linked to a company and client.displaySeparatedDeductions is true', () => {
//       it('should set statement.displaySeparatedDeductions to false', (done) => {
//         // Arrange
//         contract.companyId = null;
//         contract.contractType = 'Mechanical';
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: true, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: null };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.displaySeparatedDeductions).to.be.false;
//           done();
//         });
//       });
//     });

//     describe('When the contract is linked to a company, company.displaySeparatedDeductions is true and company.customDeductionName is set', () => {
//       it('should set statement.customDeductionName to company.customDeductionName', (done) => {
//         // Arrange
//         contract.companyId = testUtils.randomId();
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}) };
//         const company = { displaySeparatedDeductions: true, customDeductionName: testUtils.randomString() };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.customDeductionName).to.eq(company.customDeductionName);
//           done();
//         });
//       });
//     });

//     describe('When the contract is not linked to a company, client.displaySeparatedDeductions is true and client.customDeductionName is set', () => {
//       it('should set statement.customDeductionName to company.customDeductionName', (done) => {
//         // Arrange
//         contract.companyId = null;
//         const db = {};
//         const bigQuery = {};
//         const client = { displaySeparatedDeductions: false, currenciesToPrefix: () => ({}), customDeductionName: testUtils.randomString() };
//         const company = { displaySeparatedDeductions: false };
//         // Return statement
//         Statement.findById.yields(null, statement);
//         // Return statement
//         Contract.findById.yields(null, contract);
//         // Act
//         statement.getSummaryHeadlineData(db, bigQuery, client, company, () => {
//           // Assert
//           expect(Statement.findByIdAndUpdate.args?.[0]?.[1]?.$set?.customDeductionName).to.eq(client.customDeductionName);
//           done();
//         });
//       });
//     });
//   });
// });
