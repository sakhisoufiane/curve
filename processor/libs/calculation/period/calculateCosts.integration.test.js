const moment = require('moment');
const fs = require('fs');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomFloat, cleanUp, cleanUpAsync, randomInt, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Cost = require('../../../models/cost');
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Period = require('../../../models/period');

const CalculateCosts = require('./calculateCosts');

const bqTestUtils = new BigQueryTestUtils();

describe('Costs Calculation Integration Tests', () => {
  let client;
  let release;
  let contract;
  let costs;
  let period;
  let db;
  let bigQuery;
  let periodStartDate;
  let periodEndDate;
  let clientId;

  beforeAll(async () => {
    clientId = randomId();
    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();
  });

  beforeEach(async () => {
    periodStartDate = moment().startOf('year').format();
    periodEndDate = moment().startOf('year').add(6, 'months').format();

    ({ db } = mongoose.connection);

    client = new Client({ _id: clientId, name: randomString(), periodCostsDatabaseTable: 'costs' });
    client.bigQueryDataset = bigQuery.datasetName;
    client.bigQuerySalesTable = bigQuery.inputTable;
    client.bigQueryPeriodSales = bigQuery.outputTable;
    client.bigQueryPeriodCosts = bigQuery.costsTable;
    client.createdBigQueryTables = true;
    await client.save();

    contract = new Contract({
      clientId: client._id,
      name: randomString(),
      accountingPeriod: 'Half-Yearly',
      costsTerms: [
        { territory: 'WW', type: 'All', rate: 100, escalations: [] },
      ],
    });
    await contract.save();

    release = new Release({
      clientId: client._id,
      title: randomString(),
      catNo: randomString(),
      costsRights: [
        { contractId: contract._id.toString(), percentage: 100 },
      ],
    });
    await release.save();

    costs = [
      new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Video',
        amount: randomFloat(),
        territory: 'GB',
        releaseIds: [release._id],
        date: periodEndDate,
      }),
      new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Mastering',
        amount: randomFloat(),
        territory: 'WW',
        contractIds: contract._id,
      }),
      new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Marketing',
        amount: randomFloat(),
        territory: 'WW',
        contractIds: contract._id,
      }),
      new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Marketing',
        amount: randomFloat(),
        territory: 'WW',
      }),
    ];
    await Promise.all(costs.map((cost) => cost.save()));

    period = new Period({
      clientId: client._id,
      name: randomString(),
      year: moment().format('YYYY'),
      accountingPeriod: 'H1',
      accountingPeriodType: 'Half-Yearly',
      startDate: periodStartDate,
      endDate: periodEndDate,
      accountingDate: periodEndDate,
      costIds: costs.map((cost) => cost._id),
      recalculation: {},
    });
    await period.save();

    jest.spyOn(bigQuery, 'writeFileToDb').mockImplementation((_table, cb) => cb());
  });

  afterEach((done) => {
    if (bigQuery?.fileLocation && fs.existsSync(bigQuery.fileLocation)) {
      fs.unlinkSync(bigQuery.fileLocation);
    }
    jest.restoreAllMocks();
    cleanUp(clientId, done);
  });

  afterAll(async () => {
    await bqTestUtils.stopTestContainer();
    await cleanUpAsync(clientId);
  });

  describe('when no cost terms are available', () => {
    it('should not calculate any costs', (done) => {
      Contract.findByIdAndUpdate(contract._id, { $unset: { costsTerms: 1 } })
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              expect(data.length).toBe(0);
              done();
            });
          });
        })
        .catch(done);
    });
  });

  describe('when no terms match the cost types', () => {
    it('should not calculate any costs', (done) => {
      Contract.findByIdAndUpdate(contract._id, {
        $set: {
          costsTerms: [{ territory: 'WW', type: randomString(), rate: randomFloat(), escalations: [] }],
        },
      })
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              expect(data.length).toBe(0);
              done();
            });
          });
        })
        .catch(done);
    });
  });

  describe('when no terms match the cost territory', () => {
    it('should not calculate any costs', (done) => {
      Contract.findByIdAndUpdate(contract._id, {
        $set: {
          costsTerms: [{ territory: 'US', type: 'All', rate: randomFloat(), escalations: [] }],
        },
      })
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              expect(data.length).toBe(0);
              done();
            });
          });
        })
        .catch(done);
    });
  });

  describe('when one term of all is supplied', () => {
    it('should calculate all costs', (done) => {
      Contract.findByIdAndUpdate(contract._id, {
        $set: {
          costsTerms: [{ territory: 'WW', type: 'All', rate: randomFloat(), escalations: [] }],
        },
      })
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              data = data.split('\r\n');
              expect(JSON.parse(data[0]).name).toBe(costs[0].name);
              expect(JSON.parse(data[1]).name).toBe(costs[1].name);
              expect(JSON.parse(data[2]).name).toBe(costs[2].name);
              done();
            });
          });
        })
        .catch(done);
    });
  });

  describe("when a specific type is defined, with a default 'All' term supplied", () => {
    it("should calculate one cost against the specific term and one against the 'All' term", (done) => {
      const costsTerms = [
        { territory: 'WW', type: 'Marketing', rate: randomFloat(), escalations: [] },
        { territory: 'WW', type: 'All', rate: randomFloat(), escalations: [] },
      ];
      Contract.findByIdAndUpdate(contract._id, {
        $set: { costsTerms },
      })
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              data = data.split('\r\n');
              expect(JSON.parse(data[0]).rechargeRate).toBe(costsTerms[1].rate);
              expect(JSON.parse(data[1]).rechargeRate).toBe(costsTerms[1].rate);
              expect(JSON.parse(data[2]).rechargeRate).toBe(costsTerms[0].rate);
              done();
            });
          });
        })
        .catch(done);
    });
  });

  describe('when a specific territory is defined', () => {
    it("should calculate one cost against the specific term and one against the 'All' term", (done) => {
      const costsTerms = [
        { territory: 'GB', type: 'All', rate: randomFloat(), escalations: [] },
        { territory: 'WW', type: 'All', rate: randomFloat(), escalations: [] },
      ];
      Contract.findByIdAndUpdate(contract._id, {
        $set: { costsTerms },
      })
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              data = data.split('\r\n');
              expect(JSON.parse(data[0]).rechargeRate).toBe(costsTerms[0].rate);
              expect(JSON.parse(data[1]).rechargeRate).toBe(costsTerms[1].rate);
              expect(JSON.parse(data[2]).rechargeRate).toBe(costsTerms[1].rate);
              done();
            });
          });
        })
        .catch(done);
    });
  });

  describe('Multicurrency', () => {
    describe("when contract currency is 'Home Currency'", () => {
      it('should set contractCurrencyAmount and contractCurrencyCalculationOutput matching the amount and calculationOutput', (done) => {
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            costsTerms: [{ territory: 'GB', type: 'All', rate: randomFloat(), escalations: [] }],
            contractCurrency: 'Home Currency',
          },
        })
          .then(() => {
            CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
              fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                expect(periodError).toBeUndefined();
                data = data.split('\r\n');
                expect(JSON.parse(data[0]).contractCurrencyAmount).toBe(JSON.parse(data[0]).amount);
                expect(JSON.parse(data[0]).contractCurrencyCalculationOutput).toBe(JSON.parse(data[0]).calculationOutput);
                done();
              });
            });
          })
          .catch(done);
      });
    });

    describe('when contract currency is a secondary currency', () => {
      describe('and the currency is NOT supplied', () => {
        it('should set contractCurrencyAmount and contractCurrencyCalculationOutput to 0', (done) => {
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              costsTerms: [{ territory: 'GB', type: 'All', rate: 50, escalations: [] }],
              currency: 'USD',
            },
          })
            .then(() => {
              CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                  expect(periodError).toBeUndefined();
                  data = data.split('\r\n');
                  expect(JSON.parse(data[0]).contractCurrencyAmount).toBe(0);
                  expect(JSON.parse(data[0]).contractCurrencyCalculationOutput).toBe(0);
                  done();
                });
              });
            })
            .catch(done);
        });
      });

      describe('and the currency is supplied', () => {
        it('should set contractCurrencyAmount and contractCurrencyCalculationOutput multiplied by the given exchange rate', (done) => {
          const currencyExchangeRates = [{ from: 'Home Currency', to: 'USD', rate: randomFloat() }];
          Period.findByIdAndUpdate(period._id, {
            $set: { currencyExchangeRates },
          })
            .then(() => {
              Contract.findByIdAndUpdate(contract._id, {
                $set: {
                  costsTerms: [{ territory: 'GB', type: 'All', rate: 50, escalations: [] }],
                  currency: 'USD',
                },
              })
                .then(() => {
                  CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                    fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                      expect(periodError).toBeUndefined();
                      data = data.split('\r\n');
                      expect(JSON.parse(data[0]).contractCurrencyAmount).toBe(JSON.parse(data[0]).amount * currencyExchangeRates[0].rate);
                      expect(JSON.parse(data[0]).contractCurrencyCalculationOutput).toBe(JSON.parse(data[0]).calculationOutput * currencyExchangeRates[0].rate);
                      done();
                    });
                  });
                })
                .catch(done);
            })
            .catch(done);
        });
      });
    });
  });

  describe.skip('Escalations', () => {
    describe('when a contract has escalations defined', () => {
      describe('when escalation trackers are attached to a costs term', () => {
        it('should decrease the escalation tracker', (done) => {
          const escalationTracking = {
            Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
          };
          const threshold = escalationTracking.Digital.net < escalationTracking.Physical.net ? escalationTracking.Digital.net - randomFloat() : escalationTracking.Physical.net - randomFloat();
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking,
              costsTerms: [
                {
                  territory: 'GB',
                  type: 'All',
                  rate: 100,
                  escalationTrackers: ['Digital'],
                  escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Net', when: 'Greater Than', threshold }], rate: 60 }],
                },
              ],
            },
          })
            .then(() => {
              CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                Contract.findById(contract._id)
                  .then((result) => {
                    fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                      expect(periodError).toBeUndefined();
                      data = data.split('\r\n');
                      const gross = JSON.parse(data[0]).contractCurrencyAmount;
                      const net = JSON.parse(data[0]).contractCurrencyCalculationOutput;
                      expect(result.escalationTracking.Digital.gross).toBe(escalationTracking.Digital.gross - gross);
                      expect(result.escalationTracking.Digital.net).toBe(escalationTracking.Digital.net - net);
                      expect(result.escalationTracking.Physical.gross).toBe(escalationTracking.Physical.gross);
                      expect(result.escalationTracking.Physical.net).toBe(escalationTracking.Physical.net);
                      done();
                    });
                  })
                  .catch(done);
              });
            })
            .catch(done);
        });
      });

      describe('when escalation tracks are not attached to a costs term', () => {
        it('should not decrease the escalation tracker', (done) => {
          const escalationTracking = {
            Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
          };
          const threshold = escalationTracking.Digital.net < escalationTracking.Physical.net ? escalationTracking.Digital.net - randomFloat() : escalationTracking.Physical.net - randomFloat();
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking,
              costsTerms: [
                {
                  territory: 'US',
                  type: 'All',
                  rate: 100,
                  escalationTrackers: ['Digital'],
                  escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Net', when: 'Greater Than', threshold }], rate: 60 }],
                },
              ],
            },
          })
            .then(() => {
              CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                Contract.findById(contract._id)
                  .then((result) => {
                    expect(periodError).toBeUndefined();
                    expect(result.escalationTracking.Digital.gross).toBe(escalationTracking.Digital.gross);
                    expect(result.escalationTracking.Digital.net).toBe(escalationTracking.Digital.net);
                    expect(result.escalationTracking.Physical.gross).toBe(escalationTracking.Physical.gross);
                    expect(result.escalationTracking.Physical.net).toBe(escalationTracking.Physical.net);
                    done();
                  })
                  .catch(done);
              });
            })
            .catch(done);
        });
      });
    });

    describe('when a term has an escalation tracker based escalation defined', () => {
      describe('and threshold type is Gross Amount', () => {
        describe('and the when value is greater than', () => {
          it('should use the escalation term when the value is reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.gross < escalationTracking.Physical.gross ? escalationTracking.Digital.gross - randomFloat() : escalationTracking.Physical.gross - randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate: 100,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Gross', when: 'Greater Than', threshold }], rate }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (err) => {
                  expect(err).toBeUndefined();
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(err).toBeNull();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });

          it('should use the original term when the value is not reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.gross > escalationTracking.Physical.gross ? escalationTracking.Digital.gross + randomFloat() : escalationTracking.Physical.gross + randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Gross', when: 'Greater Than', threshold }], rate: randomFloat() }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });

        describe('and the when value is less than', () => {
          it('should use the original term when the value is reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.gross > escalationTracking.Physical.gross ? escalationTracking.Digital.gross + randomFloat() : escalationTracking.Physical.gross + randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate: 100,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Gross', when: 'Less Than', threshold }], rate }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });

          it('should use the escalation term when the value is not reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.gross < escalationTracking.Physical.gross ? escalationTracking.Digital.gross - randomFloat() : escalationTracking.Physical.gross - randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Gross', when: 'Less Than', threshold }], rate: randomFloat() }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });
      });

      describe('and threshold type is Net Amount', () => {
        describe('and the when value is greater than', () => {
          it('should use the escalation term when the value is reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.net < escalationTracking.Physical.net ? escalationTracking.Digital.net - randomFloat() : escalationTracking.Physical.net - randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate: 100,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Net', when: 'Greater Than', threshold }], rate }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });

          it('should use the original term when the value is not reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.net > escalationTracking.Physical.net ? escalationTracking.Digital.net + randomFloat() : escalationTracking.Physical.net + randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Net', when: 'Greater Than', threshold }], rate: 60 }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });

        describe('and the when value is less than', () => {
          it('should use the original term when the value is reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.net > escalationTracking.Physical.net ? escalationTracking.Digital.net + randomFloat() : escalationTracking.Physical.net + randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate: 100,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Net', when: 'Less Than', threshold }], rate }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });

          it('should use the escalation term when the value is not reached', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = escalationTracking.Digital.net < escalationTracking.Physical.net ? escalationTracking.Digital.net - randomFloat() : escalationTracking.Physical.net - randomFloat();
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate,
                    escalationTrackers: ['Digital'],
                    escalations: [{ conditions: [{ escalationTracker: 'Digital', thresholdType: 'Net', when: 'Less Than', threshold }], rate: 60 }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });
      });

      describe("when threshold type is 'Cost Date'", () => {
        describe('and cost date is after the specified date', () => {
          it('should use the escalation term', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = new Date(moment().subtract(1, 'year').format());
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate: 100,
                    escalationTrackers: ['Cost Date'],
                    escalations: [{ conditions: [{ escalationTracker: 'Cost Date', threshold }], rate }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });

        describe('and cost date is before the specified date', () => {
          it('should use the original term', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = new Date(moment().add(1, 'year').format());
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate,
                    escalationTrackers: ['Cost Date'],
                    escalations: [{ conditions: [{ escalationTracker: 'Cost Date', threshold }], rate: 60 }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });
      });

      describe("when threshold type is 'Reporting Date'", () => {
        describe("and Period's End Date is after the specified date", () => {
          it('should use the escalation term', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = new Date(moment().subtract(1, 'year').format());
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate: 100,
                    escalationTrackers: ['Reporting Date'],
                    escalations: [{ conditions: [{ escalationTracker: 'Reporting Date', threshold }], rate }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (err) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      done(new Error('Contract.findById should have errored.'));
                    })
                    .catch(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(err).not.toBeDefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    });
                });
              })
              .catch(done);
          });
        });

        describe("and Period's End Date is before the specified date", () => {
          it('should use the original term', (done) => {
            const escalationTracking = {
              Digital: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
              Physical: { units: randomInt(), net: randomFloat(), gross: randomFloat() },
            };
            const threshold = new Date(moment().add(1, 'year').format());
            const rate = randomFloat();
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking,
                costsTerms: [
                  {
                    territory: 'GB',
                    type: 'All',
                    rate,
                    escalationTrackers: ['Reporting Date'],
                    escalations: [{ conditions: [{ escalationTracker: 'Reporting Date', threshold }], rate: 60 }],
                  },
                ],
              },
            })
              .then(() => {
                CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
                  Contract.findById(contract._id)
                    .then(() => {
                      fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
                        expect(periodError).toBeUndefined();
                        data = data.split('\r\n');
                        expect(JSON.parse(data[0]).rechargeRate).toBe(rate);
                        done();
                      });
                    })
                    .catch(done);
                });
              })
              .catch(done);
          });
        });
      });
    });
  });

  describe('Currency Conversion (SUP-3243)', () => {
    it('should not double-convert when cost currency matches contract currency', (done) => {
      const costAmount = 5000;
      const usdToHomeCurrencyRate = 0.839475;
      const homeCurrencyToUsdRate = 1.191114;

      const currencyExchangeRates = [
        { from: 'USD', to: 'Home Currency', rate: usdToHomeCurrencyRate },
        { from: 'Home Currency', to: 'USD', rate: homeCurrencyToUsdRate },
      ];

      const usdCost = new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Video',
        amount: costAmount,
        currency: 'USD',
        territory: 'GB',
        releaseIds: [release._id],
        date: periodEndDate,
      });

      usdCost.save()
        .then(() => Period.findByIdAndUpdate(period._id, {
          $set: { currencyExchangeRates },
          $push: { costIds: usdCost._id },
        }))
        .then(() => Contract.findByIdAndUpdate(contract._id, {
          $set: {
            costsTerms: [{ territory: 'GB', type: 'All', rate: 100, escalations: [] }],
            currency: 'USD',
          },
        }))
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              const lines = data.split('\r\n').filter((l) => l.length > 0);
              const usdLine = lines.map((l) => JSON.parse(l)).find((l) => l.costId === usdCost._id.toString());

              expect(usdLine).toBeDefined();
              expect(usdLine.contractCurrencyAmount).toBe(costAmount);
              expect(usdLine.contractCurrency).toBe('USD');
              done();
            });
          });
        })
        .catch(done);
    });

    it('should correctly convert through home currency when cost currency differs from contract currency', (done) => {
      const costAmount = 1000;
      const gbpToHomeCurrencyRate = 1.2;
      const homeCurrencyToUsdRate = 1.1;

      const currencyExchangeRates = [
        { from: 'GBP', to: 'Home Currency', rate: gbpToHomeCurrencyRate },
        { from: 'Home Currency', to: 'USD', rate: homeCurrencyToUsdRate },
      ];

      const gbpCost = new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Video',
        amount: costAmount,
        currency: 'GBP',
        territory: 'GB',
        releaseIds: [release._id],
        date: periodEndDate,
      });

      gbpCost.save()
        .then(() => Period.findByIdAndUpdate(period._id, {
          $set: { currencyExchangeRates },
          $push: { costIds: gbpCost._id },
        }))
        .then(() => Contract.findByIdAndUpdate(contract._id, {
          $set: {
            costsTerms: [{ territory: 'GB', type: 'All', rate: 100, escalations: [] }],
            currency: 'USD',
          },
        }))
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              const lines = data.split('\r\n').filter((l) => l.length > 0);
              const gbpLine = lines.map((l) => JSON.parse(l)).find((l) => l.costId === gbpCost._id.toString());

              expect(gbpLine).toBeDefined();
              const expectedAmount = costAmount * gbpToHomeCurrencyRate * homeCurrencyToUsdRate;
              expect(gbpLine.contractCurrencyAmount).toBeCloseTo(expectedAmount, 2);
              expect(gbpLine.contractCurrency).toBe('USD');
              done();
            });
          });
        })
        .catch(done);
    });

    it('should only apply contract exchange rate when cost currency is Home Currency', (done) => {
      const costAmount = 2000;
      const homeCurrencyToUsdRate = 1.15;

      const currencyExchangeRates = [
        { from: 'Home Currency', to: 'USD', rate: homeCurrencyToUsdRate },
      ];

      const homeCurrencyCost = new Cost({
        clientId: client._id,
        name: randomString(),
        type: 'Video',
        amount: costAmount,
        territory: 'GB',
        releaseIds: [release._id],
        date: periodEndDate,
      });

      homeCurrencyCost.save()
        .then(() => Period.findByIdAndUpdate(period._id, {
          $set: { currencyExchangeRates },
          $push: { costIds: homeCurrencyCost._id },
        }))
        .then(() => Contract.findByIdAndUpdate(contract._id, {
          $set: {
            costsTerms: [{ territory: 'GB', type: 'All', rate: 100, escalations: [] }],
            currency: 'USD',
          },
        }))
        .then(() => {
          CalculateCosts.calculate(period, db, bigQuery, client, (periodError) => {
            fs.readFile(bigQuery.fileLocation, 'utf8', (err, data) => {
              expect(periodError).toBeUndefined();
              const lines = data.split('\r\n').filter((l) => l.length > 0);
              const homeLine = lines.map((l) => JSON.parse(l)).find((l) => l.costId === homeCurrencyCost._id.toString());

              expect(homeLine).toBeDefined();
              const expectedAmount = costAmount * homeCurrencyToUsdRate;
              expect(homeLine.contractCurrencyAmount).toBeCloseTo(expectedAmount, 2);
              expect(homeLine.contractCurrency).toBe('USD');
              done();
            });
          });
        })
        .catch(done);
    });
  });
});
