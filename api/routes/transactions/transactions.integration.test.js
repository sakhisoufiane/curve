const jwt = require('jsonwebtoken');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const supertest = require('supertest');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const config = require('../../config.json');
const User = require('../../models/user');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const Transaction = require('../../models/transaction');

const applicationToken = config.applicationTokens[0];

const server = supertest(require('../../index'));

describe('/transactions', () => {
  let importFromExcel;
  let sendExport;
  let contractFindSpy;
  let client;
  let user;
  let contract;
  let transaction1;
  let payeeId;

  beforeEach(async () => {
    importFromExcel = jest.spyOn(Transaction, 'importFromExcel').mockResolvedValue();
    sendExport = jest.spyOn(Transaction, 'sendExport').mockResolvedValue();
    contractFindSpy = jest.spyOn(Contract, 'find');
    payeeId = randomId();

    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: randomString() });
    await user.save();

    contract = new Contract({ clientId: client._id, payeeId, name: 'Contract 1' });
    await contract.save();

    transaction1 = new Transaction({
      clientId: client._id,
      name: 'Transaction 1',
      userCreated: false,
      amount: 1.00,
      date: '2019-02-02',
      contractId: contract._id,
    });
    await transaction1.save();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      let token;

      beforeEach(() => {
        const clientUser = {
          id: user._id.toString(),
          internal: false,
          parentId: null,
          clientId: client._id.toString(),
          email: user.email,
          rights: {
            [client._id.toString()]: { contracts: 'Edit' },
          },
        };
        token = jwt.sign(clientUser, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return a list of transactions', async () => {
          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.transactions).toBeInstanceOf(Array);
          const count = await Transaction.countDocuments({ clientId: client._id });
          expect(res.body.transactions.length).toBe(count);
        });

        it('should return metadata of transactions index on / GET', async () => {
          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.meta).toBeInstanceOf(Object);
        });

        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return transactions that match the text query in name or description', async () => {
          const matchingTransaction = new Transaction({
            name: 'Special Bonus Payment',
            description: 'Paid for Q4 performance',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            userCreated: true,
          });

          const nonMatchingTransaction = new Transaction({
            name: 'Regular Payment',
            description: 'Monthly base fee',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            userCreated: true,
          });

          await matchingTransaction.save();
          await nonMatchingTransaction.save();

          const res = await server
            .get('/transactions?text=bonus')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          expect(res.status).toBe(200);
          expect(res.body.transactions).toBeInstanceOf(Array);
          expect(res.body.transactions.length).toBeGreaterThan(0);
          expect(res.body.transactions.some((t) => t.name.includes('Bonus') || t.description.includes('bonus'))).toBe(true);
        });

        it('should return only transactions matching the type filter', async () => {
          const royaltyTransaction = new Transaction({
            name: 'Royalty Payment',
            type: 'Royalty',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            userCreated: true,
          });

          const advanceTransaction = new Transaction({
            name: 'Advance Payment',
            type: 'Advance',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            userCreated: true,
          });

          await royaltyTransaction.save();
          await advanceTransaction.save();

          const res = await server
            .get('/transactions?type=Royalty')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          expect(res.status).toBe(200);
          expect(res.body.transactions.every((transaction) => transaction.type === 'Royalty')).toBe(true);
        });

        it('should filter transactions by userCreated=true', async () => {
          // Arrange - transaction1 from beforeEach has userCreated: false
          const userCreatedTransaction = new Transaction({
            name: 'Manual Advance',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            amount: 500,
            userCreated: true,
          });
          await userCreatedTransaction.save();

          // Act
          const res = await server
            .get('/transactions?userCreated=true')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.transactions.length).toBeGreaterThan(0);
          expect(res.body.transactions.every((t) => t.userCreated === true)).toBe(true);
        });

        it('should filter transactions by userCreated=false', async () => {
          // Arrange - transaction1 from beforeEach has userCreated: false
          const userCreatedTransaction = new Transaction({
            name: 'Manual Advance',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            amount: 500,
            userCreated: true,
          });
          await userCreatedTransaction.save();

          // Act
          const res = await server
            .get('/transactions?userCreated=false')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.transactions.length).toBeGreaterThan(0);
          expect(res.body.transactions.every((t) => t.userCreated === false)).toBe(true);
        });

        it('should return all transactions when userCreated filter is not provided', async () => {
          // Arrange
          const userCreatedTransaction = new Transaction({
            name: 'Manual Advance',
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            date: new Date(),
            amount: 500,
            userCreated: true,
          });
          await userCreatedTransaction.save();

          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.transactions.some((t) => t.userCreated === true)).toBe(true);
          expect(res.body.transactions.some((t) => t.userCreated === false)).toBe(true);
        });

        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get('/transactions?page=3')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.body.meta.totalPages).toBe(1);
        });

        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get('/transactions?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.body.transactions.length).toBe(1);
          const count = await Transaction.countDocuments({ clientId: client._id });
          expect(res.body.meta.totalPages).toBe(count);
        });
      });

      describe('/:id GET', () => {
        describe('when a transaction is found', () => {
          it('should return a transaction and 200 status', async () => {
            // Arrange
            const transaction = await Transaction.findOne({ clientId: client._id, name: transaction1.name });

            // Act
            const res = await server
              .get(`/transactions/${transaction._id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send();

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toBeInstanceOf(Object);
            expect(res.body.clientId).toBe(transaction.clientId);
            expect(res.body.contractId).toBe(transaction.contractId);
            expect(res.body.statementId).toBe(transaction.statementId);
            expect(res.body.name).toBe(transaction.name);
            expect(res.body.type).toBe(transaction.type);
            expect(res.body.description).toBe(transaction.description);
            expect(res.body.amount).toBe(transaction.amount);
            expect(res.body.userCreated).toBe(transaction.userCreated);
            expect(res.body.isReserveRelease).toBe(transaction.isReserveRelease);
            expect(res.body.isReserveWithholding).toBe(transaction.isReserveWithholding);
            expect(res.body.isPayment).toBe(transaction.isPayment);
            expect(res.body.createdBy).toBe(transaction.createdBy);
            expect(res.body.lastModifiedBy).toBe(transaction.lastModifiedBy);
          });
        });
      });

      describe('when a transaction is not found', () => {
        it('should return a 404 status', async () => {
          // Arrange
          const id = randomId();

          // Act
          const res = await server
            .get(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send();

          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Transaction with ID ${id}`);
        });
      });

      describe('/:id PUT', () => {
        describe('when a transaction is found', () => {
          it('should update with passed values only', async () => {
            // Arrange
            const transactions = await Transaction.find({ clientId: client._id, name: transaction1.name });
            const id = transactions[0]._id;
            const changedName = `${transactions[0].name}changed`;

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: changedName });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe(changedName);
          });

          it('should not update clientId', async () => {
            // Arrange
            const transactions = await Transaction.find({ clientId: client._id, name: transaction1.name });
            const id = transactions[0]._id;
            const changedTitle = `${transactions[0].title}changed`;

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: changedTitle, clientId: 'changed' });

            // Assert
            expect(res.body.clientId).toBe(transactions[0].clientId);
          });

          it("should not update any fields it isn't passed", async () => {
            // Arrange
            const transactions = await Transaction.find({ clientId: client._id });
            const id = transactions[0]._id;
            const changedTitle = `${transactions[0].title}changed`;

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: changedTitle, clientId: 'changed' });

            // Assert
            expect(res.body.foreignId).toBe(transactions[0].foreignId);
          });
        });

        describe('when a transaction is not found', () => {
          it('should return a 404 status', async () => {
            // Arrange
            const id = randomId();

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ title: 'Changed Transaction Title' });

            // Assert
            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find Transaction with ID ${id}`);
          });
        });

        describe('parameters validation', () => {
          it('should return 400 when amount param is a non-numeric string', async () => {
            // Arrange
            const id = transaction1._id;

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ amount: '100,5' });

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.message).toBeTruthy();
          });

          it('should return 400 when amount param is an empty string', async () => {
            // Arrange
            const id = transaction1._id;

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ amount: '' });

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.message).toBeTruthy();
          });

          it('should return 200 when amount param is a numeric string', async () => {
            // Arrange
            const id = transaction1._id;

            // Act
            const res = await server
              .put(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ amount: '10.5' });

            // Assert
            expect(res.status).toBe(200);
          });
        });
      });

      describe('/:id DELETE', () => {
        describe('when a transaction is found', () => {
          it('should delete the transaction and return a 200 status', async () => {
            // Arrange
            const transactions = await Transaction.find({ clientId: client._id });
            const id = transactions[0]._id;

            // Act
            const res = await server
              .delete(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send();

            // Assert
            expect(res.status).toBe(200);
            const count = await Transaction.countDocuments({ clientId: client._id });
            expect(count).toBe(transactions.length - 1);
          });
        });

        describe('when a transaction is not found', () => {
          it('should return a 404 status', async () => {
            // Arrange
            const id = randomId();

            // Act
            const res = await server
              .delete(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send();

            // Assert
            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find Transaction with ID ${id}`);
          });
        });
      });

      describe('/ POST', () => {
        it('should return a transaction created with the passed parameters', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            statementId: 'statementId',
            name: 'name',
            type: 'type',
            description: 'description',
            date: new Date('2019-02-22'),
            amount: 1.00,
            userCreated: true,
            isReserveRelease: true,
            isReserveWithholding: true,
            isPayment: true,
          };

          // Act
          const res = await server
            .post('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.contractId).toBe(params.contractId);
          expect(res.body.statementId).toBe(params.statementId);
          expect(res.body.name).toBe(params.name);
          expect(res.body.type).toBe(params.type);
          expect(res.body.description).toBe(params.description);
          // expect(new Date(res.body.date)).toBe(new Date(params.date));
          expect(res.body.amount).toBe(params.amount);
          expect(res.body.userCreated).toBe(params.userCreated);
          expect(res.body.isReserveRelease).toBe(params.isReserveRelease);
          expect(res.body.isReserveWithholding).toBe(params.isReserveWithholding);
          expect(res.body.isPayment).toBe(params.isPayment);
        });

        it('should add the transaction to the database', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            statementId: 'statementId',
            name: 'name',
            type: 'type',
            description: 'description',
            date: new Date('2019-02-22'),
            amount: 1.00,
            userCreated: true,
            isReserveRelease: true,
            isReserveWithholding: true,
            isPayment: true,
          };
          const transactionsCount = await Transaction.countDocuments({ clientId: client._id });

          // Act
          await server
            .post('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params);

          // Assert
          const count = await Transaction.countDocuments({ clientId: client._id });
          expect(count - 1).toBe(transactionsCount);
        });

        describe('parameters validation', () => {
          it('should return 400 when amount param is a non-numeric string', async () => {
            // Arrange
            const params = { contractId: contract._id.toString(), amount: '100,5' };

            // Act
            const res = await server
              .post('/transactions')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send(params);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.message).toBeTruthy();
          });

          it('should return 400 when amount param is an empty string', async () => {
            // Arrange
            const params = { contractId: contract._id.toString(), amount: '' };

            // Act
            const res = await server
              .post('/transactions')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send(params);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.message).toBeTruthy();
          });

          it('should return 200 when amount param is a numeric string', async () => {
            // Arrange
            const params = {
              contractId: contract._id.toString(),
              name: 'name',
              type: 'type',
              description: 'description',
              date: new Date('2019-02-22'),
              amount: '10.5',
            };

            // Act
            const res = await server
              .post('/transactions')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send(params);

            // Assert
            expect(res.status).toBe(200);
          });
        });
      });

      describe('/import POST', () => {
        describe('when a file is passed', () => {
          it('should give a 200', async () => {
            // Act
            const res = await server
              .post('/transactions/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .attach('file', 'test/test-data/test_transaction.xlsx');

            // Assert
            expect(res.status).toBe(200);
          });

          it('should call importFromExcel with the uploaded file', async () => {
            // Act
            await server
              .post('/transactions/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .attach('file', 'test/test-data/test_transaction.xlsx');

            // Assert
            expect(importFromExcel).toHaveBeenCalled();
          });
        });

        describe('when no file is uploaded', () => {
          it('should return an error without a file in the request', async () => {
            // Act
            const res = await server
              .post('/transactions/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send();

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
          });
        });
      });

      describe('/export POST', () => {
        describe('when contract ids are specified', () => {
          it('should export only transactions associated with the contracts', async () => {
            // Arrange
            const contractIds = [randomId(), randomId(), randomId()];

            // Act
            const res = await server
              .post('/transactions/export')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ ids: contractIds });

            // Assert
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Your report will be sent to you via email shortly');
            expect(sendExport.mock.calls[0][0]).toEqual({
              clientId: client._id.toString(),
              contractId: {
                $in: contractIds,
              },
            });
          });
        });

        describe('when no contract ids are specified', () => {
          let validContract;

          beforeEach(async () => {
            validContract = new Contract({
              clientId: client._id,
              name: randomString(),
              contractCategories: ['Half-Yearly'],
            });
            await validContract.save();
          });

          it('should export transactions for all contracts based on the filter', async () => {
            // Arrange
            const filter = { contractCategories: ['Half-Yearly'] };

            // Act
            const res = await server
              .post('/transactions/export')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ ids: [], filter });

            // Assert
            expect(res.status).toBe(200);

            // Filter options should be converted to a db query
            expect(contractFindSpy.mock.calls[0][0]).toEqual({
              clientId: client._id.toString(),
              contractCategories: { $in: filter.contractCategories },
              contractType: { $ne: 'Mechanical' },
            });

            // The export should only include the Contract the matches the above filter
            expect(sendExport.mock.calls[0][0]).toEqual({
              clientId: client._id.toString(),
              contractId: {
                $in: [validContract._id],
              },
            });
          });
        });

        describe('when no contract ids or filter is specified', () => {
          let extraContracts;

          beforeEach(async () => {
            extraContracts = [
              new Contract({ clientId: client._id.toString(), payeeId, name: randomString() }),
              new Contract({ clientId: client._id.toString(), payeeId, name: randomString() }),
              new Contract({ clientId: client._id.toString(), payeeId, name: randomString() }),
            ];
            await extraContracts[0].save();
            await extraContracts[1].save();
            await extraContracts[2].save();
          });

          it('should export transactions for all contracts', async () => {
            // Act
            const res = await server
              .post('/transactions/export')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ ids: [], filter: {} });

            // Assert
            expect(res.status).toBe(200);
            expect(contractFindSpy.mock.calls[0][0]).toEqual({
              clientId: client._id.toString(),
              contractType: { $ne: 'Mechanical' },
            });
            // The export should be for all client Contracts (4 in total)
            expect(sendExport.mock.calls[0][0]).toEqual({
              clientId: client._id.toString(),
              contractId: {
                $in: [
                  contract._id,
                  ...extraContracts.map((c) => c._id),
                ],
              },
            });
          });
        });
      });
    });

    describe('as a user with None rights', () => {
      let clientUserNone;

      beforeEach(() => {
        const userNone = {
          id: user._id.toString(),
          internal: false,
          parentId: null,
          clientId: null,
          rights: {
            [client._id.toString()]: {
              sales: 'None',
              contracts: 'None',
              periods: 'None',
              catalogue: 'None',
            },
          },
        };
        clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 403', async () => {
          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/:id GET', () => {
        it('should return 403', async () => {
          // Arrange
          const transactions = await Transaction.find({ clientId: client._id.toString() });
          const id = transactions[0]._id;

          // Act
          const res = await server
            .get(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          // Arrange
          const transactions = await Transaction.find({ clientId: client._id.toString() });
          const id = transactions[0]._id;

          // Act
          const res = await server
            .put(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ name: 'changedName' });

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          // Arrange
          const transactions = await Transaction.find({ clientId: client._id });
          const id = transactions[0]._id;

          // Act
          const res = await server
            .delete(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            payeeId: 'payeeId',
            name: 'name',
            cae: 'cae',
            mainPro: 'mainPro',
            mechanicalPro: 'mechanicalPro',
            performancePro: 'performancePro',
            syncPro: 'syncPro',
            mainProIdentifier: 'mainProIdentifier',
            mechanicalProIdentifier: 'mechanicalProIdentifier',
            performanceProIdentifier: 'performanceProIdentifier',
            syncProIdentifier: 'syncProIdentifier',
            controlled: true,
            notes: 'notes',
            societies: ['S1', 'S2', 'S3'],
            transactionAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          // Act
          const res = await server
            .post('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(params);

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should give a 403', async () => {
          // Act
          const res = await server
            .post('/transactions/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .attach('file', 'test/test-data/test_transaction.xlsx');

          // Assert
          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', () => {
      let clientUserView;

      beforeEach(() => {
        const userView = {
          id: user._id.toString(),
          internal: false,
          parentId: null,
          clientId: client._id.toString(),
          rights: {
            [client._id.toString()]: {
              sales: 'View',
              contracts: 'View',
              periods: 'View',
              catalogue: 'View',
            },
          },
        };
        clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          // Arrange
          await Transaction.find({ clientId: client._id.toString() });

          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          // Assert
          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        it('should return 200', async () => {
          // Arrange
          const transactions = await Transaction.find({ clientId: client._id.toString() });
          const id = transactions[0]._id;

          // Act
          const res = await server
            .get(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          // Assert
          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          // Arrange
          const transactions = await Transaction.find({ clientId: client._id.toString() });
          const id = transactions[0]._id;

          // Act
          const res = await server
            .put(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ name: 'changedName' });

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          // Arrange
          const transactions = await Transaction.find({ clientId: client._id });
          const id = transactions[0]._id;

          // Act
          const res = await server
            .delete(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            payeeId: 'payeeId',
            name: 'name',
            cae: 'cae',
            mainPro: 'mainPro',
            mechanicalPro: 'mechanicalPro',
            performancePro: 'performancePro',
            syncPro: 'syncPro',
            mainProIdentifier: 'mainProIdentifier',
            mechanicalProIdentifier: 'mechanicalProIdentifier',
            performanceProIdentifier: 'performanceProIdentifier',
            syncProIdentifier: 'syncProIdentifier',
            controlled: true,
            notes: 'notes',
            societies: ['S1', 'S2', 'S3'],
            transactionAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          // Act
          const res = await server
            .post('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(params);

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', () => {
        it('should return 403', async () => {
          // Act
          const res = await server
            .post('/transactions/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .attach('file', 'test/test-data/test_transaction.xlsx');

          // Assert
          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', () => {
        it('should return 200', async () => {
          // Act
          const res = await server
            .post('/transactions/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [], filter: {} });

          // Assert
          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          // Act
          await server
            .post('/transactions/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [], filter: {} });

          // Assert
          expect(sendExport).toHaveBeenCalled();
        });
      });
    });

    describe('as a user with Edit rights', function () {
      let clientUserEdit;

      beforeEach(() => {
        const userEdit = {
          id: user._id.toString(),
          internal: false,
          parentId: null,
          clientId: client._id.toString(),
          rights: {
            [client._id.toString()]: {
              sales: 'Edit',
              contracts: 'Edit',
              periods: 'Edit',
              catalogue: 'Edit',
            },
          },
        };
        clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          // Act
          const res = await server
            .get('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          // Assert
          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        describe('when a transaction is found', () => {
          it('should return a transaction and 200 status', async () => {
            // Arrange
            const transaction = await Transaction.findOne({ clientId: client._id, name: transaction1.name });

            // Act
            const res = await server
              .get(`/transactions/${transaction._id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toBeInstanceOf(Object);
            expect(res.body.clientId).toBe(transaction.clientId);
            expect(res.body.contractId).toBe(transaction.contractId);
            expect(res.body.statementId).toBe(transaction.statementId);
            expect(res.body.name).toBe(transaction.name);
            expect(res.body.type).toBe(transaction.type);
            expect(res.body.description).toBe(transaction.description);
            expect(res.body.amount).toBe(transaction.amount);
            expect(res.body.userCreated).toBe(transaction.userCreated);
            expect(res.body.isReserveRelease).toBe(transaction.isReserveRelease);
            expect(res.body.isReserveWithholding).toBe(transaction.isReserveWithholding);
            expect(res.body.isPayment).toBe(transaction.isPayment);
            expect(res.body.createdBy).toBe(transaction.createdBy);
            expect(res.body.lastModifiedBy).toBe(transaction.lastModifiedBy);
          });
        });

        describe('when a transaction is not found', () => {
          it('should return a 404 status', async () => {
            // Arrange
            const id = randomId();

            // Act
            const res = await server
              .get(`/transactions/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            // Assert
            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find Transaction with ID ${id}`);
          });
        });
      });

      describe('/:id PUT', () => {
        it('should return 200', async () => {
          // Arrange
          const transaction = await Transaction.findOne({ clientId: client._id.toString() });
          const id = transaction._id;

          // Act
          const res = await server
            .put(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ name: 'changedName' });

          // Assert
          expect(res.status).toBe(200);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 200', async () => {
          // Arrange
          const transaction = await Transaction.findOne({ clientId: client._id });
          const id = transaction._id;

          // Act
          const res = await server
            .delete(`/transactions/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          // Assert
          expect(res.status).toBe(200);
        });
      });

      describe('/ POST', () => {
        it('should return 200', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            statementId: randomId(),
            name: 'name',
            type: 'type',
            description: 'description',
            date: new Date('2019-02-22'),
            amount: 1.00,
            userCreated: true,
            isReserveRelease: true,
            isReserveWithholding: true,
            isPayment: true,
          };

          // Act
          const res = await server
            .post('/transactions')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(params);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.contractId).toBe(params.contractId);
          expect(res.body.statementId).toBe(params.statementId);
          expect(res.body.name).toBe(params.name);
          expect(res.body.type).toBe(params.type);
          expect(res.body.description).toBe(params.description);
          expect(res.body.amount).toBe(params.amount);
          expect(res.body.userCreated).toBe(params.userCreated);
          expect(res.body.isReserveRelease).toBe(params.isReserveRelease);
          expect(res.body.isReserveWithholding).toBe(params.isReserveWithholding);
          expect(res.body.isPayment).toBe(params.isPayment);
        });
      });
    });
  });

  describe('as a parent user without a client', () => {
    const parent = jwt.sign(
      {
        internal: false,
        parentId: randomId(),
        clientId: null,
        rights: {},
      },
      process.env.jsonSecretToken,
      { expiresIn: 86400 },
    );

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/transactions')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .get(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .put(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        await server
          .put(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        // Assert
        const newPayees = await Transaction.find({ _id: transactions[0]._id });
        expect(newPayees[0].title).toBe(transactions[0].title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .delete(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        await server
          .delete(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        // Assert
        const count = await Transaction.countDocuments({ _id: transactions[0]._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/transactions')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });

        // Act
        await server
          .post('/transactions')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        // Assert
        const count = await Transaction.countDocuments({ clientId: client._id });
        expect(transactions.length).toBe(count);
      });
    });

    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'test/test-data/test_transaction.xlsx');

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('as an internal user', () => {
    const internal = jwt.sign(
      {
        internal: true,
        clientId: null,
        rights: {},
      },
      process.env.jsonSecretToken,
      { expiresIn: 86400 },
    );

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .get(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .put(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        await server
          .put(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const updatedTransaction = await Transaction.findById(id);

        // Assert
        expect(updatedTransaction.title).toBe(transactions[0].title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .delete(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        await server
          .delete(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        const count = await Transaction.countDocuments({ _id: id });

        // Assert
        expect(count).toBe(1);
      });
    });

    describe('/import POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'test/test-data/test_transaction.xlsx');

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });

        // Act
        await server
          .post('/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'test/test-data/test_transaction.xlsx');

        const count = await Transaction.countDocuments({ clientId: client._id });

        // Assert
        expect(transactions.length).toBe(count);
      });
    });
  });

  describe('as a payee user', function () {
    const contractId = randomId();
    const contractIds = [contractId, randomId()];
    let payeeToken;

    beforeEach(async () => {
      const payee = new Payee({ name: randomString(), clientId: client._id });
      await payee.save();
      payeeToken = jwt.sign(
        {
          internal: false,
          parentId: null,
          payeeId: payee._id,
          contractIds,
        },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/transactions')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .put(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        await server
          .put(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        // Assert
        const updatedTransaction = await Transaction.findById(id);
        expect(updatedTransaction.name).toBe(transactions[0].name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        const res = await server
          .delete(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the transaction', async () => {
        // Arrange
        const transactions = await Transaction.find({ clientId: client._id });
        const id = transactions[0]._id;

        // Act
        await server
          .delete(`/transactions/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        // Assert
        const count = await Transaction.countDocuments({ _id: id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/transactions')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/import POST', () => {
      it('should return 403', async () => {
        // Act
        const res = await server
          .post('/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .attach('file', 'test/test-data/test_transaction.xlsx');

        // Assert
        expect(res.status).toBe(403);
      });
    });
  });

  describe('Date filtering', () => {
    let token;
    let oldTransaction;
    let midTransaction;
    let newTransaction;

    beforeEach(async () => {
      const clientUser = {
        id: user._id.toString(),
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: {
          [client._id.toString()]: { contracts: 'Edit' },
        },
      };
      token = jwt.sign(clientUser, process.env.jsonSecretToken, { expiresIn: 86400 });

      // Create transactions with specific dates
      oldTransaction = new Transaction({
        clientId: client._id,
        name: 'Old Transaction',
        userCreated: false,
        amount: 100.00,
        date: '2020-01-01',
        contractId: contract._id,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await oldTransaction.save();

      midTransaction = new Transaction({
        clientId: client._id,
        name: 'Mid Transaction',
        userCreated: false,
        amount: 200.00,
        date: '2022-06-15',
        contractId: contract._id,
        createdAt: new Date('2022-06-15T12:00:00.000Z'),
        updatedAt: new Date('2022-06-15T12:00:00.000Z'),
      });
      await midTransaction.save();

      newTransaction = new Transaction({
        clientId: client._id,
        name: 'New Transaction',
        userCreated: false,
        amount: 300.00,
        date: '2024-01-01',
        contractId: contract._id,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      await newTransaction.save();
    });

    describe('createdAfter filter', () => {
      it('should filter transactions created on or after the specified date', async () => {
        const res = await server
          .get('/transactions?createdAfter=2022-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        expect(res.body.transactions).toBeInstanceOf(Array);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Mid Transaction');
        expect(transactionNames).toContain('New Transaction');
        expect(transactionNames).not.toContain('Old Transaction');
      });

      it('should include transactions created exactly on the specified date', async () => {
        const res = await server
          .get('/transactions?createdAfter=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Mid Transaction');
      });
    });

    describe('createdBefore filter', () => {
      it('should filter transactions created before the specified date', async () => {
        const res = await server
          .get('/transactions?createdBefore=2023-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        expect(res.body.transactions).toBeInstanceOf(Array);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Old Transaction');
        expect(transactionNames).toContain('Mid Transaction');
        expect(transactionNames).not.toContain('New Transaction');
      });

      it('should include transactions created exactly on the specified date', async () => {
        const res = await server
          .get('/transactions?createdBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Mid Transaction');
      });
    });

    describe('updatedAfter filter', () => {
      it('should filter transactions updated on or after the specified date', async () => {
        const res = await server
          .get('/transactions?updatedAfter=2022-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Mid Transaction');
        expect(transactionNames).toContain('New Transaction');
      });
    });

    describe('updatedBefore filter', () => {
      it('should filter transactions updated before the specified date', async () => {
        const res = await server
          .get('/transactions?updatedBefore=2023-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Old Transaction');
        expect(transactionNames).toContain('Mid Transaction');
      });
    });

    describe('date range combinations', () => {
      it('should apply createdAfter and createdBefore together', async () => {
        const res = await server
          .get('/transactions?createdAfter=2020-06-01&createdBefore=2023-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('Mid Transaction');
        expect(transactionNames).not.toContain('Old Transaction');
        expect(transactionNames).not.toContain('New Transaction');
      });

      it('should combine date filters with text search', async () => {
        const res = await server
          .get('/transactions?createdAfter=2022-01-01&text=New')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const transactionNames = res.body.transactions.map((t) => t.name);
        expect(transactionNames).toContain('New Transaction');
        expect(transactionNames).not.toContain('Mid Transaction');
      });
    });
  });

  describe('/raw-export POST', () => {
    let token;

    beforeEach(async () => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
      token = jwt.sign({
        id: user._id.toString(),
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: { [client._id.toString()]: { contracts: 'Edit' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toBe('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ sync: true, filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        sync: true,
      }));
    });

    it('should return 500 when CSVRawExport throws in sync mode', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));

      const res = await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Export failed');
    });

    it('should apply updatedAfter filter to updatedAt.$gte', async () => {
      await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ filter: { updatedAfter: '2025-01-15' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
        }),
      }));
    });

    it('should apply updatedBefore filter to updatedAt.$lte', async () => {
      await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ filter: { updatedBefore: '2025-01-20' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: { $lte: new Date('2025-01-20T23:59:59.999Z') },
        }),
      }));
    });

    it('should apply createdAfter filter to createdAt.$gte', async () => {
      await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ filter: { createdAfter: '2025-01-10' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
        }),
      }));
    });

    it('should apply createdBefore filter to createdAt.$lte', async () => {
      await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ filter: { createdBefore: '2025-01-25' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: { $lte: new Date('2025-01-25T23:59:59.999Z') },
        }),
      }));
    });

    it('should apply combined updatedAfter and updatedBefore as date range', async () => {
      await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ filter: { updatedAfter: '2025-01-10', updatedBefore: '2025-01-20' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: {
            $gte: new Date('2025-01-10T00:00:00.000Z'),
            $lte: new Date('2025-01-20T23:59:59.999Z'),
          },
        }),
      }));
    });

    it('should return 403 when user has None contracts rights', async () => {
      const noneToken = jwt.sign({
        id: user._id.toString(),
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: { [client._id.toString()]: { contracts: 'None' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', noneToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
    });

    it('should allow Edit user to export', async () => {
      const editToken = jwt.sign({
        id: user._id.toString(),
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: { [client._id.toString()]: { contracts: 'Edit' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/transactions/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', editToken)
        .send({ filter: {} });

      expect(res.status).toBe(200);
    });
  });
});
