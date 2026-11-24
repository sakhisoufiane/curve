process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, fileManager, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect, fail, assert } = require('chai');
const { ObjectId } = require('mongodb');
const async = require('async');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const moment = require('moment');
const sinon = require('sinon');
const rewire = require('rewire');
const Client = require('../../../models/client');
const Company = require('../../../models/company');
// const Statement = require('../../../models/statement');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const Transaction = require('../../../models/transaction');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');
const Notification = require('../../../models/notification');
const ImportXlsx = require('../../../libs/importXlsx');
const config = require('../../../config.json');
const ContractCsv = require('../../../libs/contractCsv');

// To avoid gettig an 'OverwriteModelError' error.
delete mongoose.connection.models.ContractPatches;
delete mongoose.connection.models.Contract;
delete mongoose.connection.models.StatementPatches;
delete mongoose.connection.models.Statement;

let Contract = rewire('../../../models/contract.js');
let Statement = rewire('../../../models/statement.js');
let ContractsImporter;

const contractClientId = testUtils.randomId();
const contractAccountingPeriod = testUtils.randomString();
const contractTypeVar = testUtils.randomString();

const crossContract = {
  _id: testUtils.randomId(),
  clientId: contractClientId,
  name: testUtils.randomString(),
  contractType: contractTypeVar,
  accountingPeriod: contractAccountingPeriod,
};

const contractFields = {
  clientId: contractClientId,
  contractType: contractTypeVar,
  partitionNo: testUtils.randomInt(),
  contractCategories: [testUtils.randomString(), testUtils.randomString()],
  payeeId: testUtils.randomId(),
  companyId: testUtils.randomId(),
  name: testUtils.randomString(),
  active: testUtils.randomBoolean(),
  primaryContract: testUtils.randomBoolean(),
  foreignId: testUtils.randomId(),
  projectId: testUtils.randomId(),
  licenseNo: testUtils.randomString(),
  currency: testUtils.randomString(),
  type: testUtils.randomString(),
  profitSharePercentage: testUtils.randomInt(),
  accountingPeriod: contractAccountingPeriod,
  minPayout: testUtils.randomInt(),
  openingBalance: testUtils.randomInt(),
  currentBalance: testUtils.randomInt(),
  labels: [testUtils.randomString(), testUtils.randomString()],
  salesTerms: [{
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
    type: testUtils.randomString(),
    rate: testUtils.randomInt(),
    multiplier: testUtils.randomInt(),
    reductionRate: testUtils.randomInt(),
    unitRate: testUtils.randomInt(),
    reserve: testUtils.randomInt(),
    escalations: [{
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      unitRate: testUtils.randomInt(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }, {
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      unitRate: testUtils.randomInt(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }],
  }, {
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
    type: testUtils.randomString(),
    rate: testUtils.randomInt(),
    multiplier: testUtils.randomInt(),
    reductionRate: testUtils.randomInt(),
    unitRate: testUtils.randomInt(),
    reserve: testUtils.randomInt(),
    escalations: [{
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      unitRate: testUtils.randomInt(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }, {
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      unitRate: testUtils.randomInt(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }],
  }],
  deductionsTerms: [{
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
    deductionBasis: testUtils.randomString(),
    type: testUtils.randomString(),
    unitRate: testUtils.randomInt(),
    rate: testUtils.randomInt(),
    escalations: [{
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }, {
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }],
  }],
  costsTerms: [{
    contractName: testUtils.randomString(),
    territory: testUtils.randomString(),
    escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
    type: testUtils.randomString(),
    rate: testUtils.randomInt(),
    escalations: [{
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
    }, {
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
    }],
  }, {
    contractName: testUtils.randomString(),
    territory: testUtils.randomString(),
    escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
    type: testUtils.randomString(),
    rate: testUtils.randomInt(),
    escalations: [{
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
    }, {
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
    }],
  }],
  mechanicalTerms: [{
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    deductionType: testUtils.randomString(),
    type: testUtils.randomString(),
    rateBasis: testUtils.randomString(),
    rate: testUtils.randomInt(),
    unitRate: testUtils.randomInt(),
    reserve: testUtils.randomInt(),
    currency: testUtils.randomString(),
  }, {
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    deductionType: testUtils.randomString(),
    type: testUtils.randomString(),
    rateBasis: testUtils.randomString(),
    rate: testUtils.randomInt(),
    unitRate: testUtils.randomInt(),
    reserve: testUtils.randomInt(),
    currency: testUtils.randomString(),
  }],
  withholdingTaxTerms: [{
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
    deductionBasis: testUtils.randomString(),
    type: testUtils.randomString(),
    unitRate: testUtils.randomInt(),
    rate: testUtils.randomInt(),
    escalations: [{
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }, {
      conditions: [{
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }, {
        escalationTracker: testUtils.randomString(),
        thresholdType: testUtils.randomString(),
        when: testUtils.randomString(),
        threshold: testUtils.randomString(),
      }],
      rate: testUtils.randomInt(),
      type: testUtils.randomString(),
      multiplier: testUtils.randomInt(),
      reductionRate: testUtils.randomInt(),
      reserve: testUtils.randomInt(),
    }],
  }],
  mechanicalContractTerms: [{
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    type: testUtils.randomString(),
    rateBasis: testUtils.randomString(),
    rate: testUtils.randomInt(),
    unitRate: testUtils.randomInt(),
    reserve: testUtils.randomInt(),
  }, {
    contractName: testUtils.randomString(),
    catType: testUtils.randomString(),
    catalogueGroup: testUtils.randomString(),
    territory: testUtils.randomString(),
    channel: testUtils.randomString(),
    configuration: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    source: testUtils.randomString(),
    type: testUtils.randomString(),
    rateBasis: testUtils.randomString(),
    rate: testUtils.randomInt(),
    unitRate: testUtils.randomInt(),
    reserve: testUtils.randomInt(),
  }],
  reserves: [{
    contractName: testUtils.randomString(),
    rate: testUtils.randomInt(),
  }, {
    contractName: testUtils.randomString(),
    rate: testUtils.randomInt(),
  }],
  reserveBasis: testUtils.randomString(),
  escalationTracking: { tracker: testUtils.randomString() },
  complete: testUtils.randomBoolean(),
  crossContracts: [{
    condition: testUtils.randomString(),
    process: testUtils.randomString(),
    contractId: crossContract._id,
    percentage: testUtils.randomInt(),
  }],
  escalationTrackers: [testUtils.randomString(), testUtils.randomString()],
  escalationEquivalents: [testUtils.randomString(), testUtils.randomString()],
  notes: testUtils.randomString(),
  autoPayment: testUtils.randomBoolean(),
  selfBilling: testUtils.randomBoolean(),
  feesInvoice: testUtils.randomBoolean(),
  deductWithholding: testUtils.randomBoolean(),
  files: [{ key: testUtils.randomString() }],
  startDate: testUtils.randomJsDate(),
  endDate: testUtils.randomJsDate(),
  collectionEndDate: testUtils.randomJsDate(),
  retentionPeriodEndDate: testUtils.randomJsDate(),
  aliases: [testUtils.randomString(), testUtils.randomString()],
  summaryContractTotals: testUtils.randomBoolean(),
  createdBy: testUtils.randomId(),
  lastModifiedBy: testUtils.randomId(),
};

describe('Contract', () => {
  logger.info('>>>file>>>> unit/models/contract .....................');
  const returnedS3PublicLink = testUtils.randomString();
  const returnedS3UploadLink = testUtils.randomString();
  const returnedS324PublicLink = testUtils.randomString();
  let Payee;
  let contract;
  let contract2;
  let publicS3LinkStub;
  let uploadToS3Stub;
  let publicLink24HoursStub;
  // let contractFindOneStub;

  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach((done) => {
    ContractsImporter = rewire('../../../libs/imports/contracts');
    Statement = require('../../../models/statement');
    Payee = require('../../../models/payee');
    async.waterfall([
      // Rewire Contract
      (cb) => {
        delete mongoose.connection.models.ContractPatches;
        delete mongoose.connection.models.Contract;
        delete mongoose.connection.models.Statement;
        delete mongoose.connection.models.StatementPatches;

        Contract = rewire('../../../models/contract.js');
        cb();
      },
      // Stub fileManager methods
      (cb) => {
        publicS3LinkStub = sinon.stub(fileManager, 'publicS3Link');
        publicS3LinkStub.yields(null, returnedS3PublicLink);

        uploadToS3Stub = sinon.stub(fileManager, 'uploadToS3');
        uploadToS3Stub.yields(null, returnedS3UploadLink);

        publicLink24HoursStub = sinon.stub(fileManager, 'publicLink24Hours');
        publicLink24HoursStub.yields(null, returnedS324PublicLink);

        sinon.stub(Payee.prototype, 'isPayeePayable').resolves({});
        cb();
      },
      (cb) => {
        contract2 = new Contract(crossContract);
        contract2.save()
          .then(() => {
            cb();
          })
          .catch((err) => {
            cb(err);
          });
      },
      // Create Contract
      (cb) => {
        contract = new Contract(contractFields);

        contract.save()
          .then(() => {
            cb();
          })
          .catch((err) => {
            cb(err);
          });
      },
    ], done);
  });

  afterEach((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  after((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  describe('fields', () => {
    it('should have a clientId parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.clientId).to.eq(contractFields.clientId.toString());
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a contractType parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.contractType).to.eq(contractFields.contractType);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a contractCategories parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.contractCategories).to.deep.eq(contractFields.contractCategories);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a payees parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.payees).to.deep.eq([]);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a companyId parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.companyId).to.eq(contractFields.companyId);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a name parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.name).to.eq(contractFields.name);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a active parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.active).to.eq(contractFields.active);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a foreignId parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.foreignId).to.eq(contractFields.foreignId);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a projectId parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.projectId).to.eq(contractFields.projectId);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a licenseNo parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.licenseNo).to.eq(contractFields.licenseNo);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a currency parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.currency).to.eq(contractFields.currency);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a type parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.type).to.eq(contractFields.type);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a profitSharePercentage parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.profitSharePercentage).to.eq(contractFields.profitSharePercentage);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a accountingPeriod parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.accountingPeriod).to.eq(contractFields.accountingPeriod);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a minPayout parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.minPayout).to.eq(contractFields.minPayout);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a openingBalance parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.openingBalance).to.eq(contractFields.openingBalance);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a currentBalance parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.currentBalance).to.eq(contractFields.currentBalance);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a labels parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.labels).to.deep.eq(contractFields.labels);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a salesTerms parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.salesTerms, foundContract.salesTerms)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a deductionsTerms parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.deductionsTerms, foundContract.deductionsTerms)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a costsTerms parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.costsTerms, foundContract.costsTerms)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a mechanicalTerms parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.mechanicalTerms, foundContract.mechanicalTerms)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a withholdingTaxTerms parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.withholdingTaxTerms, foundContract.withholdingTaxTerms)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a mechanicalContractTerms parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.mechanicalContractTerms, foundContract.mechanicalContractTerms)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a reserves parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.reserves, foundContract.reserves)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a reserveBasis parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.reserveBasis).to.deep.eq(contractFields.reserveBasis);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a escalationTracking parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.escalationTracking).to.deep.eq(contractFields.escalationTracking);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a complete parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.complete).to.eq(contractFields.complete);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a crossContracts parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(testUtils.areArraysOfObjectsEqual(contractFields.crossContracts, foundContract.crossContracts)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a escalationTrackers parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.escalationTrackers).to.deep.eq(contractFields.escalationTrackers);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a escalationEquivalents parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.escalationEquivalents).to.deep.eq(contractFields.escalationEquivalents);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a notes parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.notes).to.eq(contractFields.notes);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a autoPayment parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.autoPayment).to.eq(contractFields.autoPayment);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a selfBilling parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.selfBilling).to.eq(contractFields.selfBilling);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a feesInvoice parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.feesInvoice).to.eq(contractFields.feesInvoice);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a deductWithholding parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.deductWithholding).to.eq(contractFields.deductWithholding);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a files parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.files[0].key).to.deep.eq(contractFields.files[0].key);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a startDate parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.startDate.getTime()).to.eq(contractFields.startDate.getTime());
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a endDate parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.endDate.getTime()).to.eq(contractFields.endDate.getTime());
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a aliases parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.aliases).to.deep.eq(contractFields.aliases);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a summaryContractTotals parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.summaryContractTotals).to.eq(contractFields.summaryContractTotals);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a createdBy parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.createdBy.toString()).to.deep.eq(contractFields.createdBy);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should have a lastModifiedBy parameter', () => {
      // Arrange
      Contract.findById(contract._id)
        .then((foundContract) => {
          // Assert
          expect(foundContract.lastModifiedBy.toString()).to.deep.eq(contractFields.lastModifiedBy);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });
  });

  describe('validation', () => {
    describe('when the contract name is blank', () => {
      it('should return an error', () => {
        // Arrange
        const newContract = new Contract({
          clientId: testUtils.randomId(),
        });
        const expectedErrorMessage = 'A Name is required';
        // Act
        newContract.save()
          .then(() => {
            assert.fail('Should not have saved');
          })
          .catch((err) => {
            // Assert
            expect(err).to.exist;
            expect(err.message).to.eq(expectedErrorMessage);
          });
      });
    });

    describe('when the contract name is not unique', () => {
      it('should return an error', () => {
        // Arrange
        const newContract = new Contract({
          name: contract.name,
          clientId: contract.clientId,
          contractType: contract.contractType,
        });
        const expectedErrorMessage = 'Name is required to be unique';
        // Act
        newContract.save()
          .then(() => {

          })
          .catch((err) => {
          // Assert
            expect(err).to.exist;
            expect(err.message).to.eq(expectedErrorMessage);
          });
      });
    });

    describe("when the contract type is 'Royalty'", () => {
      it('should set profitSharePercentage to 0', () => {
        // Arrange
        const newContract = new Contract({
          name: testUtils.randomString(),
          contractType: 'Royalty',
        });
        // Act
        newContract.save()
          .then((returnedContract) => {
            // Assert
            expect(returnedContract.profitSharePercentage).to.eq(0);
          })
          .catch((err) => {
            assert.fail(err);
          });
      });
    });

    describe('when the contract aliases are not unique', () => {
      it('should return an error', () => {
        // Arrange
        const expectedErrorMessage = 'Aliases are required to be unique';
        const duplicateAlias = contract.aliases[0];
        const newContract = new Contract({
          name: testUtils.randomString(),
          clientId: contract.clientId,
          aliases: [duplicateAlias, testUtils.randomString()],
        });
        // Act
        newContract.save()
          .then(() => {
            assert.fail('Should not have saved');
          })
          .catch((err) => {
          // Assert
            expect(err).to.exist;
            expect(err.message).to.eq(expectedErrorMessage);
          });
      });
    });

    describe('when all the checks pass', () => {
      it('should not return an error', () => {
        // Arrange
        const newContract = new Contract({
          name: testUtils.randomString(),
          clientId: contract.clientId,
          aliases: [testUtils.randomString(), testUtils.randomString()],
        });
        // Act
        newContract.save()
          .then((returnedContract) => {
            expect(returnedContract).to.exist;
          })
          .catch((err) => {
            expect.fail(err);
          });
      });
    });
  });

  // Skipping remove tests as middleware has itself been removed and functionality now resides in libs/salesItemHelpers
  // Preserving the tests as they will need to be reinstated against libs/salesItemHelpers
  describe.skip('deleteOne', () => {
    describe('when the contract has a statement associated to it', () => {
      it('should return an error', (done) => {
        // Arrange
        const statement = new Statement({
          clientId: contract.clientId,
          contractId: contract._id,
          name: testUtils.randomString(),
        });
        const expectedErrorMessage = [{ name: statement.name, link: `statements/${statement._id}` }];

        statement.save((err) => {
          // Act
          contract.deleteOne(contract._id, (err) => {
            // Assert
            expect(err).to.exist;
            expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
            done();
          });
        });
      });

      it('should not delete the contract', (done) => {
        // Arrange
        const statement = new Statement({
          clientId: contract.clientId,
          contractId: contract._id,
          name: testUtils.randomString(),
        });
        // Act
        statement.save()
          .then(() => {
            contract.deleteOne(contract._id)
              .then(() => {
                Contract.findById(contract._id)
                  .then((returnedContract) => {
                    // Assert
                    expect(returnedContract).to.exist;
                    done();
                  });
              });
          });
      });
    });

    describe('when the contract has a contract associated to it', () => {
      it('should return an error', (done) => {
        // Arrange
        const newContract = new Contract({
          name: testUtils.randomString(),
          clientId: contract.clientId,
          crossContracts: [{ contractId: contract._id.toString() }],
        });
        const expectedErrorMessage = [{ name: newContract.name, link: `contracts/${newContract._id}/edit` }];
        // Act
        newContract.save(() => {
          contract.deleteOne(contract._id, (err) => {
            // Assert
            expect(err).to.exist;
            expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
            done();
          });
        });
      });

      it('should not delete the contract', (done) => {
        // Arrange
        const newContract = new Contract({
          name: testUtils.randomString(),
          clientId: contract.clientId,
          crossContracts: [{ contractId: contract._id.toString() }],
        });
        // Act
        newContract.save()
          .then(() => {
            contract.deleteOne(contract._id)
              .then(() => {
                Contract.findById(contract._id)
                  .then((returnedContract) => {
                    // Assert
                    expect(returnedContract).to.exist;
                    done();
                  });
              });
          });
      });
    });

    describe('when the contract has a release associated to it', () => {
      describe('when the contract is associated to salesReturnsRights', () => {
        it('should return an error', (done) => {
          // Arrange
          const newRelease = new Release({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            salesReturnsRights: [{ contractId: contract._id.toString() }],
          });
          const expectedErrorMessage = [{ name: newRelease.title, link: `releases/${newRelease._id}/edit` }];
          // Act
          newRelease.save(() => {
            contract.deleteOne(contract._id, (err) => {
              // Assert
              expect(err).to.exist;
              expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
              done();
            });
          });
        });

        it('should not delete the contract', (done) => {
          // Arrange
          const newRelease = new Release({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            salesReturnsRights: [{ contractId: contract._id.toString() }],
          });
          // Act
          newRelease.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .then(() => {
                  Contract.findById(contract._id)
                    .then((returnedContract) => {
                    // Assert
                      expect(returnedContract).to.exist;
                      done();
                    });
                });
            });
        });
      });

      describe('when the contract is associated to costsRights', () => {
        it('should return an error', (done) => {
          // Arrange
          const newRelease = new Release({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            costsRights: [{ contractId: contract._id.toString() }],
          });
          const expectedErrorMessage = [{ name: newRelease.title, link: `releases/${newRelease._id}/edit` }];
          // Act
          newRelease.save(() => {
            contract.deleteOne(contract._id, (err) => {
              // Assert
              expect(err).to.exist;
              expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
              done();
            });
          });
        });

        it('should not delete the contract', (done) => {
          // Arrange
          const newRelease = new Release({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            costsRights: [{ contractId: contract._id.toString() }],
          });
          // Act
          newRelease.save()
            .then(() => {
              contract.remove(contract._id)
                .then(() => {
                  Contract.findById(contract._id)
                    .then((returnedContract) => {
                      // Assert
                      expect(returnedContract).to.exist;
                      done();
                    });
                });
            });
        });
      });
    });

    describe('when the contract has a track associated to it', () => {
      let clientFindByIdStub;
      const client = {
        _id: testUtils.randomId(),
      };
      beforeEach((done) => {
        clientFindByIdStub = sinon.stub(Client, 'findById');
        clientFindByIdStub.resolves(client);
        done();
      });
      describe('when the contract is associated to salesReturnsRights', () => {
        it('should return an error', (done) => {
          // Arrange
          const newTrack = new Track({
            title: testUtils.randomString(),
            isrc: testUtils.randomString(),
            clientId: contract.clientId,
            salesReturnsRights: [{ contractId: contract._id.toString() }],
          });
          const expectedErrorMessage = [{ name: newTrack.title, link: `tracks/${newTrack._id}/edit` }];
          // Act
          newTrack.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .catch((err) => {
                  // Assert
                  expect(err).to.exist;
                  expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
                  done();
                });
            });
        });

        it('should not delete the contract', (done) => {
          // Arrange
          const newTrack = new Track({
            title: testUtils.randomString(),
            isrc: testUtils.randomString(),
            clientId: contract.clientId,
            salesReturnsRights: [{ contractId: contract._id.toString() }],
          });
          // Act
          newTrack.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .then(() => {
                  Contract.findById(contract._id)
                    .then((returnedContract) => {
                      // Assert
                      expect(returnedContract).to.exist;
                      done();
                    });
                });
            });
        });
      });

      describe('when the contract is associated to costsRights', () => {
        it('should return an error', (done) => {
          // Arrange
          const newTrack = new Track({
            title: testUtils.randomString(),
            isrc: testUtils.randomString(),
            clientId: contract.clientId,
            costsRights: [{ contractId: contract._id.toString() }],
          });
          const expectedErrorMessage = [{ name: newTrack.title, link: `tracks/${newTrack._id}/edit` }];
          // Act
          newTrack.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .catch((err) => {
                  // Assert
                  expect(err).to.exist;
                  expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
                  done();
                });
            });
        });

        it('should not delete the contract', (done) => {
          // Arrange
          const newTrack = new Track({
            title: testUtils.randomString(),
            isrc: testUtils.randomString(),
            clientId: contract.clientId,
            costsRights: [{ contractId: contract._id.toString() }],
          });
          // Act
          newTrack.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .then(() => {
                  Contract.findById(contract._id)
                    .then((returnedContract) => {
                      // Assert
                      expect(returnedContract).to.exist;
                      done();
                    });
                });
            });
        });
      });
    });

    describe('when the contract has a work associated to it', () => {
      describe('when the contract is associated to salesReturnsRights', () => {
        it('should return an error', (done) => {
          // Arrange
          const newWork = new Work({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            salesReturnsRights: [{ contractId: contract._id.toString() }],
          });
          const expectedErrorMessage = [{ name: newWork.title, link: `works/${newWork._id}/edit` }];
          // Act
          newWork.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .catch((err) => {
                  // Assert
                  expect(err).to.exist;
                  expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
                  done();
                });
            });
        });

        it('should not delete the contract', (done) => {
          // Arrange
          const newWork = new Work({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            salesReturnsRights: [{ contractId: contract._id.toString() }],
          });
          // Act
          newWork.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .then(() => {
                  Contract.findById(contract._id)
                    .then((returnedContract) => {
                      // Assert
                      expect(returnedContract).to.exist;
                      done();
                    });
                });
            });
        });
      });

      describe('when the contract is associated to costsRights', () => {
        it('should return an error', (done) => {
          // Arrange
          const newWork = new Work({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            costsRights: [{ contractId: contract._id.toString() }],
          });
          const expectedErrorMessage = [{ name: newWork.title, link: `works/${newWork._id}/edit` }];
          // Act
          newWork.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .catch((err) => {
                  // Assert
                  expect(err).to.exist;
                  expect(JSON.parse(err.message)).to.deep.eq(expectedErrorMessage);
                  done();
                });
            });
        });

        it('should not delete the contract', (done) => {
          // Arrange
          const newWork = new Work({
            title: testUtils.randomString(),
            clientId: contract.clientId,
            costsRights: [{ contractId: contract._id.toString() }],
          });
          // Act
          newWork.save()
            .then(() => {
              contract.deleteOne(contract._id)
                .then(() => {
                  Contract.findById(contract._id)
                    .then((returnedContract) => {
                      // Assert
                      expect(returnedContract).to.exist;
                      done();
                    });
                });
            });
        });
      });
    });

    describe('when the contract has no catalogue associated to it', () => {
      it('should delete the contract', (done) => {
        // Act
        contract.deleteOne(contract._id)
          .then(() => {
            Contract.findById(contract._id)
              .then((returnedContract) => {
                // Assert
                expect(returnedContract).to.not.exist;
                done();
              });
          })
          .catch((deleteOneError) => {
            expect(deleteOneError).to.not.exist;
          });
      });
    });
  });

  describe('init', () => {
    it('should get the public S3 link for each of the contract files', () => {
      // Act
      Contract.findById(contract._id)
        .then((returnedContract) => {
          // Assert
          expect(publicS3LinkStub.called).to.be.true;
          expect(publicS3LinkStub.calledWith(contract.files[0].key)).to.be.true;
        })
        .catch((err) => {
          assert.fail(err);
        });
    });

    it('should return the public S3 link for each of the contract files', () => {
      // Act
      Contract.findById(contract._id)
        .then((returnedContract) => {
          // Assert
          expect(returnedContract.files[0].publicLink).to.exist;
          expect(returnedContract.files[0].publicLink).to.eq(returnedS3PublicLink);
        })
        .catch((err) => {
          assert.fail(err);
        });
    });
  });

  describe('getAssociatedCatalogueItems', () => {
    let releaseFindStub;
    let trackFindStub;
    let workFindStub;
    let releaseLimitStub;
    let trackLimitStub;
    let workLimitStub;

    const releaseFindResult = [
      { title: testUtils.randomString() },
      { title: testUtils.randomString() },
      { title: testUtils.randomString() },
    ];

    const trackFindResult = [
      { title: testUtils.randomString() },
      { title: testUtils.randomString() },
      { title: testUtils.randomString() },
    ];

    const workFindResult = [
      { title: testUtils.randomString() },
      { title: testUtils.randomString() },
      { title: testUtils.randomString() },
    ];

    beforeEach((done) => {
      releaseLimitStub = sinon.stub().resolves(releaseFindResult);
      releaseFindStub = sinon.stub(Release, 'find');
      releaseFindStub.returns({
        limit: releaseLimitStub,
      });

      trackLimitStub = sinon.stub().resolves(trackFindResult);
      trackFindStub = sinon.stub(Track, 'find');
      trackFindStub.returns({
        limit: trackLimitStub,
      });

      workLimitStub = sinon.stub().resolves(workFindResult);
      workFindStub = sinon.stub(Work, 'find');
      workFindStub.returns({
        limit: workLimitStub,
      });
      done();
    });

    it('should exist', () => {
      // Assert
      expect(contract.getAssociatedCatalogueItems).to.exist;
    });

    describe('when getting the associated releases', () => {
      it('should call Release.find', () => {
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(releaseFindStub.called).to.be.true;
        });
      });

      it('should call Release.find with the right filter', (done) => {
        // Arrange
        const filter = { clientId: contract.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] };
        const options = { title: 1, artist: 1, catNo: 1, barcode: 1, format: 1, createdAt: 1 };
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(releaseFindStub.calledWith(filter, options)).to.be.true;
          done();
        });
      });

      it('should return the releases matching the filter', (done) => {
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(contract.releases).to.deep.eq(releaseFindResult);
          done();
        });
      });
    });

    describe('when getting the associated tracks', () => {
      it('should call Track.find', (done) => {
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(trackFindStub.called).to.be.true;
          done();
        });
      });

      it('should call Track.find with the right filter', (done) => {
        // Arrange
        const filter = { clientId: contract.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] };
        const options = { title: 1, artist: 1, isrc: 1, createdAt: 1 };
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(trackFindStub.calledWith(filter, options)).to.be.true;
          done();
        });
      });

      it('should return the tracks matching the filter', (done) => {
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(contract.tracks).to.deep.eq(trackFindResult);
          done();
        });
      });
    });

    describe('when getting the associated works', () => {
      it('should call Work.find', (done) => {
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(workFindStub.called).to.be.true;
          done();
        });
      });

      it('should call Work.find with the right filter', (done) => {
        // Arrange
        const filter = { clientId: contract.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] };
        const options = { title: 1, composets: 1, identifier: 1, iswc: 1, createdAt: 1 };
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(workFindStub.calledWith(filter, options)).to.be.true;
          done();
        });
      });

      it('should return the works matching the filter', (done) => {
        // Act
        contract.getAssociatedCatalogueItems(() => {
          // Assert
          expect(contract.works).to.deep.eq(workFindResult);
          done();
        });
      });
    });
  });

  describe('getAssociatedCostsTrackIds', () => {
    let trackFindStub;
    let trackLimitStub;

    const trackFindResult = [
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() },
    ];

    beforeEach((done) => {
      trackLimitStub = sinon.stub().resolves(trackFindResult);
      trackFindStub = sinon.stub(Track, 'find');
      trackFindStub.returns({
        limit: trackLimitStub,
      });
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.getAssociatedCostsTrackIds).to.exist;
      done();
    });

    it('should call Track.find with the right filter', (done) => {
      // Arrange
      const filter = { clientId: contract.clientId, costsRights: { $elemMatch: { contractId: contract._id.toString() } } };
      const options = { _id: 1 };
      // Act
      contract.getAssociatedCostsTrackIds(() => {
        // Assert
        expect(trackFindStub.calledWith(filter, options)).to.be.true;
        done();
      });
    });

    it('should return the costs track IDs matching the filter', (done) => {
      // Act
      contract.getAssociatedCostsTrackIds((err, tracks) => {
        // Assert
        expect(err).to.not.exist;
        expect(tracks).to.deep.eq(trackFindResult);
        done();
      });
    });

    describe('when Track.find returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const errorMessage = testUtils.randomString();
        trackLimitStub = sinon.stub().rejects(new Error(errorMessage));
        trackFindStub.returns({
          limit: trackLimitStub,
        });
        // Act
        contract.getAssociatedCostsTrackIds((err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(errorMessage);
          done();
        });
      });
    });
  });

  describe('getAssociatedCostsReleaseIds', () => {
    let releaseFindStub;
    let releaseLimitStub;

    const releaseFindResult = [
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() },
      { _id: testUtils.randomId() },
    ];

    beforeEach((done) => {
      releaseLimitStub = sinon.stub().resolves(releaseFindResult);
      releaseFindStub = sinon.stub(Release, 'find');
      releaseFindStub.returns({
        limit: releaseLimitStub,
      });
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.getAssociatedCostsReleaseIds).to.exist;
      done();
    });

    it('should call Release.find with the right filter', (done) => {
      // Arrange
      const filter = { clientId: contract.clientId, costsRights: { $elemMatch: { contractId: contract._id.toString() } } };
      const options = { _id: 1 };
      // Act
      contract.getAssociatedCostsReleaseIds(() => {
        // Assert
        expect(releaseFindStub.calledWith(filter, options)).to.be.true;
        done();
      });
    });
    it('should return the costs release IDs matching the filter', (done) => {
      // Act
      contract.getAssociatedCostsReleaseIds((err, tracks) => {
        // Assert
        expect(err).to.not.exist;
        expect(tracks).to.deep.eq(releaseFindResult);
        done();
      });
    });

    describe('when Release.find returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const errorMessage = testUtils.randomString();
        // releaseExecSpy = sinon.spy((callback) => callback(new Error(errorMessage)));
        releaseLimitStub = sinon.stub().rejects(new Error(errorMessage));
        releaseFindStub.returns({
          limit: releaseLimitStub,
        });
        // Act
        contract.getAssociatedCostsReleaseIds((err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(errorMessage);
          done();
        });
      });
    });
  });

  describe('getAssociatedTransactions', () => {
    let transactionFindStub;
    let transactionLeanStub;

    const transactionFindResult = [
      { _id: testUtils.randomId(), balance: testUtils.randomInt(), amount: testUtils.randomInt() },
      { _id: testUtils.randomId(), balance: testUtils.randomInt(), amount: testUtils.randomInt() },
      { _id: testUtils.randomId(), balance: testUtils.randomInt(), amount: testUtils.randomInt() },
    ];

    beforeEach((done) => {
      transactionLeanStub = sinon.stub().resolves(transactionFindResult);
      transactionFindStub = sinon.stub(Transaction, 'find');
      transactionFindStub.returns({
        lean: transactionLeanStub,
      });
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.getAssociatedTransactions).to.exist;
      done();
    });

    describe("when contract type is 'Profit Share'", () => {
      it('should update the filter to exclude reserve transactions', (done) => {
        // Arrange
        const isReserveRelease = { $ne: true };
        const isReserveWithholding = { $ne: true };
        const date = testUtils.randomJsDate();
        contract.type = 'Profit Share';
        // Act
        contract.getAssociatedTransactions(date, () => {
          // Assert
          const transactionFilter = transactionFindStub.args[0][0];
          expect(transactionFilter.isReserveRelease).to.deep.eq(isReserveRelease);
          expect(transactionFilter.isReserveWithholding).to.deep.eq(isReserveWithholding);
          done();
        });
      });
    });

    it('should call Transaction.find with the right filter', (done) => {
      // Arrange
      const date = testUtils.randomJsDate();
      const expectedFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: date } };
      const options = { sort: { date: 1 } };
      // Act
      contract.getAssociatedTransactions(date, () => {
        // Assert
        expect(transactionFindStub.calledWith(expectedFilter, null, options)).to.be.true;
        done();
      });
    });

    it('should return the transactions matching the filter', (done) => {
      // Arrange
      const date = testUtils.randomJsDate();
      // Act
      contract.getAssociatedTransactions(date, () => {
        // Assert
        expect(contract.transactions.length).to.deep.eq(transactionFindResult.length);
        done();
      });
    });

    it('should update the transactions balance based on the contract opening balance', (done) => {
      // Arrange
      const date = testUtils.randomJsDate();
      const expectedTransactions = [];
      let balance = contract.openingBalance;
      transactionFindResult.map((transaction) => {
        transaction.balance = balance + transaction.amount;
        expectedTransactions.push(transaction);
        balance += transaction.amount;
      });
      // Act
      contract.getAssociatedTransactions(date, () => {
        // Assert
        expect(contract.transactions).to.deep.eq(expectedTransactions);
        done();
      });
    });
  });

  describe('getFutureTransactions', () => {
    let transactionFindStub;
    let transactionLeanStub;

    const transactionFindResult = [
      { _id: testUtils.randomId(), balance: testUtils.randomInt(), amount: testUtils.randomInt(), date: testUtils.randomJsDate() },
      { _id: testUtils.randomId(), balance: testUtils.randomInt(), amount: testUtils.randomInt(), date: testUtils.randomJsDate() },
      { _id: testUtils.randomId(), balance: testUtils.randomInt(), amount: testUtils.randomInt(), date: testUtils.randomJsDate() },
    ];

    beforeEach((done) => {
      transactionLeanStub = sinon.stub().resolves(transactionFindResult);
      transactionFindStub = sinon.stub(Transaction, 'find');
      transactionFindStub.returns({
        lean: transactionLeanStub,
      });
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.getFutureTransactions).to.exist;
      done();
    });

    it('should call Transaction.find with the right filter', (done) => {
      // Arrange
      const date = testUtils.randomJsDate();
      const expectedFilter = { clientId: contract.clientId, contractId: contract._id };
      const options = { sort: { date: 1 } };
      // Act
      contract.getFutureTransactions(date, () => {
        // Assert
        expect(transactionFindStub.calledWith(expectedFilter, null, options)).to.be.true;
        done();
      });
    });

    it('should return the transactions matching the filter', (done) => {
      // Arrange
      const date = testUtils.randomJsDate();
      let totalFutureTransactions = 0;
      transactionFindResult.map((transaction) => {
        if (transaction.date > date) {
          totalFutureTransactions += 1;
        }
      });
      // Act
      contract.getFutureTransactions(date, () => {
        // Assert
        expect(contract.transactions.length).to.deep.eq(totalFutureTransactions);
        done();
      });
    });

    it('should update the transactions balance based on the contract opening balance', (done) => {
      // Arrange
      const date = testUtils.randomJsDate();
      const expectedTransactions = [];
      let balance = contract.openingBalance;
      transactionFindResult.map((transaction) => {
        transaction.balance = balance + transaction.amount;
        if (transaction.date > date) {
          expectedTransactions.push(transaction);
        }
        balance += transaction.amount;
      });
      // Act
      contract.getFutureTransactions(date, () => {
        // Assert
        expect(contract.transactions).to.deep.eq(expectedTransactions);
        done();
      });
    });

    describe('when the contract type is Profit Share', () => {
      beforeEach((done) => {
        contract.type = 'Profit Share';
        contract.save()
          .then(() => {
            done();
          })
          .catch((err) => {
            assert.fail(err);
          });
      });
      it('should exclude reserve transactions when the contract type is Profit Share', (done) => {
        // Arrange
        const date = testUtils.randomJsDate();
        const expectedFilter = { clientId: contract.clientId, contractId: contract._id, isReserveRelease: { $ne: true }, isReserveWithholding: { $ne: true } };
        const options = { sort: { date: 1 } };
        // Act
        contract.getFutureTransactions(date, () => {
          // Assert
          expect(transactionFindStub.calledWith(expectedFilter, null, options)).to.be.true;
          done();
        });
      });
      after((done) => {
        contract.type = testUtils.randomString();
        contract.save()
          .then(() => {
            done();
          })
          .catch((err) => {
            console.log(err);
            done();
          });
      });
    });
  });

  describe('balanceAtDate', () => {
    let transactionFindStub;
    let transactionLeanStub;

    const statementId = testUtils.randomId();
    const transactionFindResult = [
      {
        _id: testUtils.randomId(),
        name: `${testUtils.randomString()}Payment`,
        balance: testUtils.randomInt(),
        amount: testUtils.randomInt(),
        date: testUtils.randomJsDate(),
        statementId: statementId.toString(),
        type: 'Payment',
      },
      {
        _id: testUtils.randomId(),
        name: `${testUtils.randomString()}Payment`,
        balance: testUtils.randomInt(),
        amount: testUtils.randomInt(),
        date: testUtils.randomJsDate(),
        statementId: statementId.toString(),
        type: 'Payment',
      },
      {
        _id: testUtils.randomId(),
        name: `${testUtils.randomString()}Payment`,
        balance: testUtils.randomInt(),
        amount: testUtils.randomInt(),
        date: testUtils.randomJsDate(),
        statementId: statementId.toString(),
        type: 'Payment',
      },
    ];

    beforeEach((done) => {
      transactionLeanStub = sinon.stub().resolves(transactionFindResult);
      transactionFindStub = sinon.stub(Transaction, 'find');
      transactionFindStub.returns({
        lean: transactionLeanStub,
      });
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.balanceAtDate).to.exist;
      done();
    });

    describe('when excludeAdvance is true', () => {
      it('should exclude the advance transactions', (done) => {
        // Arrange
        const date = testUtils.randomJsDate();
        const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
        const expectedFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment'] } };
        const expectedFilterOptions = { sort: { date: 1 } };
        const options = {};
        options.excludeAdvance = true;
        // Act
        contract.balanceAtDate(date, options, () => {
          // Assert
          expect(transactionFindStub.calledWith(expectedFilter, null, expectedFilterOptions)).to.eq(true);
          done();
        });
      });
    });

    describe('when excludeReserves is true', () => {
      it('should exclude the reserve transactions', (done) => {
        // Arrange
        const date = testUtils.randomJsDate();
        const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
        const expectedFilter = {
          clientId: contract.clientId,
          contractId: contract._id,
          date: { $lte: endOfDate },
          isReserveWithholding: { $ne: true },
          isReserveRelease: { $ne: true },
        };
        const expectedFilterOptions = { sort: { date: 1 } };
        const options = {};
        options.excludeReserves = true;
        // Act
        contract.balanceAtDate(date, options, () => {
          // Assert
          expect(transactionFindStub.calledWith(expectedFilter, null, expectedFilterOptions)).to.eq(true);
          done();
        });
      });
    });

    describe("when excludeStatementPayments and the transaction.statementId = excludeStatementPayments and transaction.type is 'Payment'", () => {
      it('should exclude transaction', (done) => {
        // Arrange
        const date = testUtils.randomJsDate();
        const options = {};
        options.excludeStatementPayments = statementId.toString();
        // Act
        contract.balanceAtDate(date, options, (err, balance) => {
          // Assert
          expect(balance).to.eq(contract.openingBalance);
          done();
        });
      });
    });

    describe('when !excludeStatementPayments', () => {
      it('should not exclude transactions', (done) => {
        // Arrange
        const date = testUtils.randomJsDate();
        const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
        const options = {};
        let expectedBalance = contract.openingBalance;
        transactionFindResult.map((transaction) => {
          if (moment.utc(transaction.date).format() <= endOfDate) {
            expectedBalance += transaction.amount;
          }
        });
        // Act
        contract.balanceAtDate(date, options, (err, balance) => {
          // Assert
          expect(balance).to.eq(expectedBalance);
          done();
        });
      });
    });

    describe('when options.excludeStatementPayments !== transaction.statementId', () => {
      it('should exclude transactions', (done) => {
        // Arrange
        transactionFindResult[0].statementId = testUtils.randomString();
        transactionLeanStub = sinon.stub().resolves(transactionFindResult);
        transactionFindStub.returns({
          lean: transactionLeanStub,
        });

        const date = testUtils.randomJsDate();
        const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();

        const options = {};
        options.excludeStatementPayments = statementId.toString();
        let expectedBalance = contract.openingBalance;
        transactionFindResult.map((transaction) => {
          if (moment.utc(transaction.date).format() <= endOfDate
            && (!options.excludeStatementPayments
              || !(options.excludeStatementPayments === transaction.statementId
                && transaction.name.includes('Payment')))) {
            expectedBalance += transaction.amount;
          }
        });
        // Act
        contract.balanceAtDate(date, options, (err, balance) => {
          // Assert
          expect(balance).to.eq(expectedBalance);
          done();
        });
      });
    });

    describe('when !transaction.name.includes(\'Payment\')', () => {
      it('should exclude transactions', (done) => {
        // Arrange
        const date = testUtils.randomJsDate();
        const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
        const options = {};

        transactionFindResult[0].name = testUtils.randomString();
        transactionLeanStub = sinon.stub().resolves(transactionFindResult);
        transactionFindStub.returns({
          lean: transactionLeanStub,
        });

        options.excludeStatementPayments = statementId.toString();

        let expectedBalance = contract.openingBalance;
        transactionFindResult.map((transaction) => {
          if (moment.utc(transaction.date).format() <= endOfDate
            && (!options.excludeStatementPayments
              || !(options.excludeStatementPayments === transaction.statementId
                && transaction.name.includes('Payment')))) {
            expectedBalance += transaction.amount;
          }
        });
        // Act
        contract.balanceAtDate(date, options, (err, balance) => {
          // Assert
          expect(balance).to.eq(expectedBalance);
          done();
        });
      });
    });
  });

  describe('importAliases', () => {
    let contractFindOneStub;
    let contractSaveStub;

    beforeEach(() => {
      contractFindOneStub = sinon.stub(Contract, 'findOne');
      contractFindOneStub.resolves(contract);

      contractSaveStub = sinon.stub(contract, 'save');
      contractSaveStub.resolves(contract);
    });

    it('should exist', () => {
      // Assert
      expect(Contract.importAliases).to.exist;
    });

    it('should call Contract.findOne with the right args', (done) => {
      // Arrange
      const data = [
        { identifier: testUtils.randomString() },
      ];
      const curveUser = {
        clientId: testUtils.randomString(),
      };
      // Act
      Contract.importAliases(data, curveUser, () => {
        const { clientId } = curveUser;
        // Assert
        expect(contractFindOneStub.called).to.be.true;
        expect(contractFindOneStub.calledWith({ clientId, name: data[0].identifier })).to.be.true;
        done();
      });
    });

    it('should add aliases to the contracts', (done) => {
      // Arrange
      const data = [
        { identifier: testUtils.randomString(), alias: testUtils.randomString() },
        { identifier: testUtils.randomString(), alias: testUtils.randomString() },
      ];
      const clientId = testUtils.randomString();
      const expectedAliases = contract.aliases.concat([data[0].alias, data[1].alias]);
      // Act
      Contract.importAliases(data, clientId, () => {
        // Assert
        expect(expectedAliases).to.deep.eq(contract.aliases);
        done();
      });
    });

    it('should clean up the aliases before adding them to the contract', (done) => {
      // Arrange
      const data = [
        { identifier: testUtils.randomString(), alias: `${testUtils.randomString()} ,` },
        { identifier: testUtils.randomString(), alias: `${testUtils.randomString()} )` },
        { identifier: testUtils.randomString(), alias: `${testUtils.randomString()}#` },
      ];
      const clientId = testUtils.randomString();
      const expectedAliases = contract.aliases.concat([
        String(data[0].alias).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''),
        String(data[1].alias).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''),
        String(data[2].alias).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''),
      ]);
      // Act
      Contract.importAliases(data, clientId, () => {
        // Assert
        expect(expectedAliases).to.deep.eq(contract.aliases);
        done();
      });
    });

    it('should only have unique aliases added to the contract', (done) => {
      // Arrange
      const alias = testUtils.randomString();
      const data = [
        { identifier: testUtils.randomString(), alias },
        { identifier: testUtils.randomString(), alias },
      ];
      const clientId = testUtils.randomString();
      const expectedAliases = contract.aliases.concat([alias]);
      // Act
      Contract.importAliases(data, clientId, () => {
        // Assert
        expect(expectedAliases).to.deep.eq(contract.aliases);
        done();
      });
    });

    describe('when done', () => {
      it('should return the count of aliases added', (done) => {
        // Arrange
        const data = [
          { identifier: testUtils.randomString(), alias: testUtils.randomString() },
          { identifier: testUtils.randomString(), alias: testUtils.randomString() },
        ];
        const clientId = testUtils.randomString();
        // Act
        Contract.importAliases(data, clientId, (errors, count) => {
          // Assert
          expect(count).to.eq(data.length);
          done();
        });
      });
    });

    describe("when a contract isn't found", () => {
      it('should return an error', (done) => {
        // Arrange
        const data = [
          { identifier: testUtils.randomString(), alias: testUtils.randomString() },
        ];
        const clientId = testUtils.randomString();
        const expectedErrors = [
          `Line 3: Could not find contract with name ${data[0].identifier}`,
        ];

        contractFindOneStub.resolves();
        // Act
        Contract.importAliases(data, clientId, (errors) => {
          // Assert
          expect(errors).to.deep.eq(expectedErrors);
          done();
        });
      });
    });

    describe('when contract.save returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const data = [
          { identifier: testUtils.randomString(), alias: testUtils.randomString() },
        ];
        const clientId = testUtils.randomString();
        const error = testUtils.randomString();
        const expectedErrors = [
          `Line 3: ${error}`,
        ];

        contractSaveStub.rejects(new Error(error));
        // Act
        Contract.importAliases(data, clientId, (errors) => {
          // Assert
          expect(errors).to.deep.eq(expectedErrors);
          done();
        });
      });
    });
  });

  // Skipping import tests as the process has been refactored and new tests will be added
  describe.skip('importFromExcel', () => {
    let clientFindByIdStub;
    let getDataByTemplateStub;
    let cleanUpNumbersInArrayStub;
    let importContractsStub;
    let notificationGenerateStub;

    const data = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];
    const client = {
      _id: testUtils.randomId(),
      dateFormat: testUtils.randomString(),
      clientType: testUtils.randomString(),
      features: {},
    };
    const file = {
      path: testUtils.randomString(),
      originalname: testUtils.randomString(),
    };
    const curveUser = {
      id: testUtils.randomId(),
      clientId: testUtils.randomId(),
    };
    const overwriteBlanks = testUtils.randomBoolean();
    let importedContracts;

    beforeEach((done) => {
      sinon.stub(Contract.prototype, 'save').yields();

      importedContracts = [
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
      ];

      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      getDataByTemplateStub = sinon.stub(ImportXlsx, 'getDataByTemplate');
      getDataByTemplateStub.yields(null, data);

      cleanUpNumbersInArrayStub = sinon.stub(Contract, 'cleanUpNumbersInArray');
      cleanUpNumbersInArrayStub.returnsArg(0);

      importContractsStub = sinon.stub(Contract, 'importContracts');
      importContractsStub.yields(null, null, importedContracts);

      notificationGenerateStub = sinon.stub(Notification, 'generate');
      notificationGenerateStub.yields();

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Contract.importFromExcel).to.exist;
      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(clientFindByIdStub.called).to.be.true;
        expect(clientFindByIdStub.calledWith(curveUser.clientId)).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the contracts tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.contract,
          0,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the sales tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.sale,
          1,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the deductions tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.deduction,
          2,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the mechanicals tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.mechanicalDeduction,
          3,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the withholdingTax tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.withholdingTaxDeduction,
          4,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the costs tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.contractCost,
          5,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the reserves tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.reserve,
          6,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the crossContracts tab', (done) => {
      // Act
      Contract.importFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.crossContracts,
          7,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    describe('when getDataByTemplate returns the data', () => {
      it('should call importContracts with the right args', (done) => {
        // Act
        Contract.importFromExcel(file, curveUser, overwriteBlanks, (err) => {
          // Assert
          expect(importContractsStub.calledWith(
            data,
            {
              payees: [],
              sales: data,
              deductions: data,
              mechanicals: data,
              withholdingTax: data,
              costs: data,
              reserves: data,
              crossContracts: data,
              autoPaymentConditions: data,
            },
            curveUser.clientId,
            overwriteBlanks,
            'Standard',
            client.features,
            client.clientType,
          )).to.be.true;
          done();
        });
      });

      describe("when importContracts doesn't error", () => {
        it('should save the imported contracts', (done) => {
          // Act
          Contract.importFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(importedContracts[0].save.called).to.be.true;
            expect(importedContracts[1].save.called).to.be.true;
            expect(importedContracts[2].save.called).to.be.true;
            done();
          });
        });

        it('should generate a success notification', (done) => {
          // Arrange
          const generateOptions = {
            identifier: 'importComplete',
            curveUser,
            client,
            subject: 'Your Contract Import Has Completed',
            file: file.originalname,
            count: data.length,
          };
          // Act
          Contract.importFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Contract Import Has Completed',
              `${data.length} Contract imported in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });

      describe('when importContracts returns an error', () => {
        it('should generate an error notification', (done) => {
          // Arrange
          const errors = [new Error(testUtils.randomString()), new Error(testUtils.randomString())];
          const generateOptions = {
            identifier: 'importError',
            curveUser,
            client,
            subject: 'Your Contract Import Has Errored',
            file: file.originalname,
            error: errors,
          };
          importContractsStub.yields(errors);
          // Act
          Contract.importFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Contract Import Has Errored',
              `${errors.length} errors in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });
    });

    describe('when getDataByTemplate returns an error', () => {
      it('should generate an error notification', (done) => {
        // Arrange
        const error = testUtils.randomString();
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Contract Import Has Errored',
          file: file.originalname,
          error: [error],
        };
        getDataByTemplateStub.yields(error);
        // Act
        Contract.importFromExcel(file, curveUser, overwriteBlanks, (err) => {
          // Assert
          expect(notificationGenerateStub.calledWith(
            'Your Contract Import Has Errored',
            `${error} in file ${file.originalname}`,
            null,
            curveUser,
            generateOptions,
          )).to.be.true;
          done();
        });
      });

      describe("when the error is 'Template does not match'", () => {
        it("should change it to 'It appears the template does not match'", (done) => {
          // Arrange
          const error = 'Template does not match';
          const generateOptions = {
            identifier: 'importError',
            curveUser,
            client,
            subject: 'Your Contract Import Has Errored',
            file: file.originalname,
            error: ['It appears the template does not match'],
          };
          getDataByTemplateStub.yields(error);
          // Act
          Contract.importFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Contract Import Has Errored',
              `It appears the template does not match in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });
    });

    describe('when not passed a curveUser', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = 'A user must be passed';
        // Act
        Contract.importFromExcel(file, null, overwriteBlanks, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
  });

  // Skipping import tests as the process has been refactored and new tests will be added
  describe.skip('importMechanicalFromExcel', () => {
    let clientFindByIdStub;
    let getDataByTemplateStub;
    let cleanUpNumbersInArrayStub;
    let importContractsStub;
    let notificationGenerateStub;

    const data = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];
    const client = {
      _id: testUtils.randomId(),
      dateFormat: testUtils.randomString(),
      clientType: testUtils.randomString(),
      features: {},
    };
    const file = {
      path: testUtils.randomString(),
      originalname: testUtils.randomString(),
    };
    const curveUser = {
      id: testUtils.randomId(),
      clientId: testUtils.randomId(),
    };
    const overwriteBlanks = testUtils.randomBoolean();
    let importedContracts;

    beforeEach((done) => {
      sinon.stub(Contract.prototype, 'save').yields();

      importedContracts = [
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
      ];

      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      getDataByTemplateStub = sinon.stub(ImportXlsx, 'getDataByTemplate');
      getDataByTemplateStub.yields(null, data);

      cleanUpNumbersInArrayStub = sinon.stub(Contract, 'cleanUpNumbersInArray');
      cleanUpNumbersInArrayStub.returnsArg(0);

      importContractsStub = sinon.stub(Contract, 'importContracts');
      importContractsStub.yields(null, null, importedContracts);

      notificationGenerateStub = sinon.stub(Notification, 'generate');
      notificationGenerateStub.yields();

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Contract.importMechanicalFromExcel).to.exist;
      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(clientFindByIdStub.called).to.be.true;
        expect(clientFindByIdStub.calledWith(curveUser.clientId)).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the mechanical contracts tab', (done) => {
      // Act
      Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.mechanicalContract,
          0,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the mechanical terms tab', (done) => {
      // Act
      Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.mechanicalTerms,
          1,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the reserves tab', (done) => {
      // Act
      Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.reserve,
          2,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the cross contracts tab', (done) => {
      // Act
      Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.crossContracts,
          3,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    describe('when getDataByTemplate returns the data', () => {
      it('should call importContracts with the right args', (done) => {
        // Act
        Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, (err) => {
          // Assert
          expect(importContractsStub.calledWith(
            data,
            {
              payees: [],
              mechanicalTerms: data,
              reserves: data,
              crossContracts: data,
            },
            curveUser.clientId,
            overwriteBlanks,
            'Mechanical',
            client.features,
            client.clientType,
          )).to.be.true;
          done();
        });
      });

      describe("when importContracts doesn't error", () => {
        it('should save the imported contracts', (done) => {
          // Act
          Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(importedContracts[0].save.called).to.be.true;
            expect(importedContracts[1].save.called).to.be.true;
            expect(importedContracts[2].save.called).to.be.true;
            done();
          });
        });

        it('should generate a success notification', (done) => {
          // Arrange
          const generateOptions = {
            identifier: 'importComplete',
            curveUser,
            client,
            subject: 'Your Mechanical Contract Import Has Completed',
            file: file.originalname,
            count: data.length,
          };
          // Act
          Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Mechanical Contract Import Has Completed',
              `${data.length} Mechanical Contracts imported in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });

      describe('when importContracts returns an error', () => {
        it('should generate an error notification', (done) => {
          // Arrange
          const errors = [new Error(testUtils.randomString()), new Error(testUtils.randomString())];
          const generateOptions = {
            identifier: 'importError',
            curveUser,
            client,
            subject: 'Your Mechanical Contract Import Has Errored',
            file: file.originalname,
            error: errors,
          };
          importContractsStub.yields(errors);
          // Act
          Contract.importMechanicalFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Mechanical Contract Import Has Errored',
              `${errors.length} errors in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });
    });
  });

  // Skipping import tests as the process has been refactored and new tests will be added
  describe.skip('importPublisherFromExcel', () => {
    let clientFindByIdStub;
    let getDataByTemplateStub;
    let cleanUpNumbersInArrayStub;
    let importContractsStub;
    let notificationGenerateStub;

    const data = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];
    const client = {
      _id: testUtils.randomId(),
      dateFormat: testUtils.randomString(),
      features: {},
    };
    const file = {
      path: testUtils.randomString(),
      originalname: testUtils.randomString(),
    };
    const curveUser = {
      id: testUtils.randomId(),
      clientId: testUtils.randomId(),
    };
    const overwriteBlanks = testUtils.randomBoolean();
    let importedContracts;

    beforeEach((done) => {
      sinon.stub(Contract.prototype, 'save').yields();

      importedContracts = [
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
        new Contract({
          _id: testUtils.randomId(),
          name: testUtils.randomString(),
        }),
      ];
      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      getDataByTemplateStub = sinon.stub(ImportXlsx, 'getDataByTemplate');
      getDataByTemplateStub.yields(null, data);

      cleanUpNumbersInArrayStub = sinon.stub(Contract, 'cleanUpNumbersInArray');
      cleanUpNumbersInArrayStub.returnsArg(0);

      importContractsStub = sinon.stub(Contract, 'importContracts');
      importContractsStub.yields(null, null, importedContracts);

      notificationGenerateStub = sinon.stub(Notification, 'generate');
      notificationGenerateStub.yields();

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Contract.importPublisherFromExcel).to.exist;
      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(clientFindByIdStub.called).to.be.true;
        expect(clientFindByIdStub.calledWith(curveUser.clientId)).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the publisher contracts tab', (done) => {
      // Act
      Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.publisherContract,
          0,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the publisher sales tab', (done) => {
      // Act
      Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.publisherSales,
          1,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the publisher deduction tab', (done) => {
      // Act
      Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.publisherDeduction,
          2,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the publisher withholding tax tab', (done) => {
      // Act
      Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.withholdingTaxDeduction,
          3,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    it('should call getDataByTemplate to get the cross contracts tab', (done) => {
      // Act
      Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, () => {
        // Assert
        expect(getDataByTemplateStub.calledWith(
          file.path,
          config.importTemplates.crossContracts,
          4,
          2,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        done();
      });
    });

    describe('when getDataByTemplate returns the data', () => {
      it('should call importContracts', (done) => {
        // Act
        Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, (err) => {
          // Assert
          expect(importContractsStub.calledWith(
            data,
            {
              payees: [],
              sales: data,
              deductions: data,
              withholdingTax: data,
              crossContracts: data,
              autoPaymentConditions: data,
            },
            curveUser.clientId,
            overwriteBlanks,
            'Publisher',
          )).to.be.true;
          done();
        });
      });

      describe("when importContracts doesn't error", () => {
        it('should save the imported contracts', (done) => {
          // Act
          Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(importedContracts[0].save.called).to.be.true;
            expect(importedContracts[1].save.called).to.be.true;
            expect(importedContracts[2].save.called).to.be.true;
            done();
          });
        });

        it('should generate a success notification', (done) => {
          // Arrange
          const generateOptions = {
            identifier: 'importComplete',
            curveUser,
            client,
            subject: 'Your Publisher Contract Import Has Completed',
            file: file.originalname,
            count: data.length,
          };
          // Act
          Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Publisher Contract Import Has Completed',
              `${data.length} Publisher Contracts imported in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });

      describe('when importContracts returns an error', () => {
        it('should generate an error notification', (done) => {
          // Arrange
          const errors = [new Error(testUtils.randomString()), new Error(testUtils.randomString())];
          const generateOptions = {
            identifier: 'importError',
            curveUser,
            client,
            subject: 'Your Publisher Contract Import Has Errored',
            file: file.originalname,
            error: errors,
          };
          importContractsStub.yields(errors);
          // Act
          Contract.importPublisherFromExcel(file, curveUser, overwriteBlanks, (err) => {
            // Assert
            expect(notificationGenerateStub.calledWith(
              'Your Publisher Contract Import Has Errored',
              `${errors.length} errors in file ${file.originalname}`,
              null,
              curveUser,
              generateOptions,
            )).to.be.true;
            done();
          });
        });
      });
    });
  });

  // Skipping import tests as the process has been refactored and new tests will be added
  describe.skip('importContract', () => {
    let data;
    let index;
    let otherMapData;
    let clientId;
    let client;
    let features;
    let clientType;
    let overwriteBlanks;
    let contractTemplateType;
    let contractFindOneStub;
    let contractValidateStub;
    let processCategoriesSpy;
    let processTermsSpy;
    let processPayeeSpy;
    let processCompanySpy;
    let processContractTermGroupsSpy;
    let processCrossContractsSpy;
    let processReservesSpy;

    beforeEach((done) => {
      data = {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
        foreignId: testUtils.randomId(),
        projectId: testUtils.randomId(),
        active: testUtils.randomBoolean(),
        startDate: testUtils.randomJsDate(),
        endDate: testUtils.randomJsDate(),
        minPayout: testUtils.randomInt().toString(),
        openingBalance: contract.openingBalance,
        autoPayment: testUtils.randomBoolean(),
        selfBilling: testUtils.randomBoolean(),
        deductWithholding: testUtils.randomBoolean(),
        summaryContractTotals: testUtils.randomBoolean(),
        labels: [testUtils.randomString(), testUtils.randomString()],
        notes: testUtils.randomString(),
      };
      index = testUtils.randomInt();
      otherMapData = {
        sales: [testUtils.randomString()],
        deductions: [testUtils.randomString()],
        mechanicals: [testUtils.randomString()],
        mechanicalTerms: [testUtils.randomString()],
        withholdingTax: [testUtils.randomString()],
        costs: [testUtils.randomString()],
        crossContracts: [testUtils.randomString()],
      };
      clientId = testUtils.randomId();
      client = {
        accountingPeriodTypes: testUtils.randomString(),
        currency2: testUtils.randomString(),
        currency3: testUtils.randomString(),
        currency4: testUtils.randomString(),
        features: {},
        clientType: testUtils.randomString(),
      };
      features = client.features;
      clientType = client.clientType;
      overwriteBlanks = testUtils.randomBoolean();
      contractTemplateType = testUtils.randomString();

      contractValidateStub = sinon.stub(contract, 'validate');
      contractValidateStub.yields();

      contractFindOneStub = sinon.stub(Contract, 'findOne');
      contractFindOneStub.resolves(contract);

      sinon.stub(Statement, 'count');
      Statement.count.resolves(0);

      processCategoriesSpy = sinon.spy((data, contract, client, index, overwriteBlanks, errors, cb) => { cb(null, []); });
      Contract.__set__('processCategories', processCategoriesSpy);

      processTermsSpy = sinon.spy((contract, client, clientId, tabData, tabName, fieldName, overwriteBlanks, contractTermMappings, contractTemplateType, errors, cb) => { cb(null, []); });
      Contract.__set__('processTerms', processTermsSpy);

      processPayeeSpy = sinon.spy((data, contract, client, index, overwriteBlanks, Payee, errors, cb) => { cb(null, []); });
      Contract.__set__('processPayee', processPayeeSpy);

      processCompanySpy = sinon.spy((data, contract, client, index, overwriteBlanks, Company, errors, cb) => { cb(null, []); });
      Contract.__set__('processCompany', processCompanySpy);

      processContractTermGroupsSpy = sinon.spy((contractTermMappings, clientId, cb) => { cb(); });
      Contract.__set__('processContractTermGroups', processContractTermGroupsSpy);

      // processCrossContractsSpy = sinon.spy((contract, otherMapData, overwriteBlanks, errors, features, clientType,  cb) => { cb(null, []); });
      // Contract.__set__('processCrossContracts', processCrossContractsSpy);

      processReservesSpy = sinon.spy((contract, otherMapData, overwriteBlanks, cb) => { cb(); });
      Contract.__set__('processReserves', processReservesSpy);

      done();
    });

    it('should exist', (done) => {
      expect(Contract.importContract).to.exist;
      done();
    });

    describe('when not passed any data', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = 'Data doesn\'t match template';
        // Act
        Contract.importContract(null, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when passed data', () => {
      describe("when data doesn't have a name, type and foreignId", () => {
        it('should return an empty callback', (done) => {
          // Arrange
          delete data.name;
          delete data.type;
          delete data.foreignId;
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err, contract, errors) => {
            // Assert
            expect(err).to.not.exist;
            expect(contract).to.not.exist;
            expect(errors).to.not.exist;
            done();
          });
        });
      });

      describe('when data._id is a valid ObjectId', () => {
        it('should add the _id to the filter', (done) => {
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, () => {
            // Assert
            const query = contractFindOneStub.args[0][0];
            const expectedQuery = { _id: new ObjectId(data._id), clientId };

            expect(query).to.deep.eq(expectedQuery);
            done();
          });
        });
      });

      describe('when data._id is not a valid ObjectId', () => {
        describe('when data has a name', () => {
          it('should add the name to the filter', (done) => {
            // Arrange
            data._id = testUtils.randomString();
            // Act
            Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, () => {
              // Assert
              const query = contractFindOneStub.args[0][0];
              const expectedQuery = { clientId, name: data.name, contractType: contractTemplateType === 'Mechanical' ? 'Mechanical' : 'Artist' };
              expect(query).to.deep.eq(expectedQuery);
              done();
            });
          });
        });

        describe("when data doesn't have a name", () => {
          it('should return an error', (done) => {
            // Arrange
            data._id = testUtils.randomString();
            delete data.name;
            const expectedError = 'Name must be passed';
            // Act
            Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });

      describe('when assigning fields to the contract', () => {
        describe('when a contract is found', () => {
          it('should use the returned contract', (done) => {
            // Act
            Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
              const expectedContract = processCategoriesSpy.args[0][1];
              expect(expectedContract._id).to.eq(contract._id);
              done();
            });
          });
        });

        describe('when no contract is found', () => {
          it('should create a new contract', (done) => {
            // Arrange
            contractFindOneStub.resolves(null);
            // Act
            Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
              const expectedContract = processCategoriesSpy.args[0][1];
              expect(expectedContract._id).to.not.eq(contract._id);
              done();
            });
          });
        });

        it('should assign the clientId to the contract', (done) => {
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            const expectedContract = processCategoriesSpy.args[0][1];
            expect(expectedContract.clientId).to.eq(clientId.toString());
            done();
          });
        });

        describe('when contractTemplateType is Mechanical', () => {
          it('should set contract.contractType to Mechanical', (done) => {
            // Arrange
            contractTemplateType = 'Mechanical';
            const expectedContractType = 'Mechanical';
            // Act
            Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
              // Assert
              const expectedContract = processCategoriesSpy.args[0][1];
              expect(expectedContract.contractType).to.eq(expectedContractType);
              done();
            });
          });
        });

        describe('when contractTemplateType is not \'Mechanical\'', () => {
          it('should set contract.contractType to \'Artist\'', (done) => {
            // Arrange
            contractTemplateType = testUtils.randomString();
            const expectedContractType = 'Artist';
            // Act
            Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
              // Assert
              const expectedContract = processCategoriesSpy.args[0][1];
              expect(expectedContract.contractType).to.eq(expectedContractType);
              done();
            });
          });
        });

        it('should assign data.name to the contract.name', (done) => {
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            const expectedContract = processCategoriesSpy.args[0][1];
            expect(expectedContract.name).to.eq(data.name);
            done();
          });
        });

        describe('contract.foreignId', () => {
          describe('when data.foreignId', () => {
            it('should assign data.foreignId to the contract.foreignId', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.foreignId).to.eq(data.foreignId.toString());
                done();
              });
            });
          });

          describe('when no data.foreignId and overwriteBlanks is false', () => {
            it('should keep contract.foreignId', (done) => {
              // Arrange
              delete data.foreignId;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.foreignId).to.eq(contract.foreignId);
                done();
              });
            });
          });

          describe('when no data.foreignId and overwriteBlanks is true', () => {
            it('should set contract.foreignId to the default value', (done) => {
              // Arrange
              delete data.foreignId;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.foreignId).to.be.null;
                done();
              });
            });
          });
        });

        describe('contract.projectId', () => {
          describe('when data.projectId', () => {
            it('should assign data.projectId to the contract.projectId', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.projectId).to.eq(data.projectId.toString());
                done();
              });
            });
          });

          describe('when no data.projectId and overwriteBlanks is false', () => {
            it('should keep contract.projectId', (done) => {
              // Arrange
              delete data.projectId;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.projectId).to.eq(contract.projectId);
                done();
              });
            });
          });

          describe('when no data.projectId and overwriteBlanks is true', () => {
            it('should set contract.projectId to the default value', (done) => {
              // Arrange
              delete data.projectId;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.projectId).to.be.null;
                done();
              });
            });
          });
        });

        describe('contract.active', () => {
          describe('when data.active', () => {
            it('should assign data.active to the contract.active', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.active).to.eq(data.active);
                done();
              });
            });
          });

          describe('when no data.active and overwriteBlanks is false', () => {
            it('should keep contract.active', (done) => {
              // Arrange
              delete data.active;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.active).to.eq(contract.active);
                done();
              });
            });
          });

          describe('when no data.active and overwriteBlanks is true', () => {
            it('should set contract.active to the default value', (done) => {
              // Arrange
              delete data.active;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.active).to.be.false;
                done();
              });
            });
          });
        });

        describe('contract.startDate', () => {
          describe('when data.startDate', () => {
            it('should assign data.startDate to the contract.startDate', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.startDate).to.eq(data.startDate);
                done();
              });
            });
          });

          describe('when no data.startDate and overwriteBlanks is false', () => {
            it('should keep contract.startDate', (done) => {
              // Arrange
              delete data.startDate;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.startDate).to.eq(contract.startDate);
                done();
              });
            });
          });

          describe('when no data.startDate and overwriteBlanks is true', () => {
            it('should set contract.startDate to the default value', (done) => {
              // Arrange
              delete data.startDate;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.startDate).to.be.null;
                done();
              });
            });
          });
        });

        describe('contract.endDate', () => {
          describe('when data.endDate', () => {
            it('should assign data.endDate to the contract.endDate', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.endDate).to.eq(data.endDate);
                done();
              });
            });
          });

          describe('when no data.endDate and overwriteBlanks is false', () => {
            it('should keep contract.endDate', (done) => {
              // Arrange
              delete data.endDate;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.endDate).to.eq(contract.endDate);
                done();
              });
            });
          });

          describe('when no data.endDate and overwriteBlanks is true', () => {
            it('should set contract.endDate to the default value', (done) => {
              // Arrange
              delete data.endDate;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.endDate).to.be.null;
                done();
              });
            });
          });
        });

        describe('contract.minPayout', () => {
          describe('when data.minPayout', () => {
            it('should assign data.minPayout to the contract.minPayout', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.minPayout).to.eq(Number(data.minPayout));
                done();
              });
            });
          });

          describe('when no data.minPayout and overwriteBlanks is false', () => {
            it('should keep contract.minPayout', (done) => {
              // Arrange
              delete data.minPayout;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.minPayout).to.eq(contract.minPayout);
                done();
              });
            });
          });

          describe('when no data.minPayout and overwriteBlanks is true', () => {
            it('should set contract.minPayout to the default value', (done) => {
              // Arrange
              delete data.minPayout;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.minPayout).to.eq(0);
                done();
              });
            });
          });
        });

        describe('contract.openingBalance', () => {
          describe('when data.openingBalance', () => {
            it('should assign data.openingBalance to the contract.openingBalance', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.openingBalance).to.eq(Number(data.openingBalance));
                done();
              });
            });
          });

          describe('when no data.openingBalance and overwriteBlanks is false', () => {
            it('should keep contract.openingBalance', (done) => {
              // Arrange
              delete data.openingBalance;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.openingBalance).to.eq(contract.openingBalance);
                done();
              });
            });
          });

          describe('when no data.openingBalance and overwriteBlanks is true', () => {
            describe('when contract has an opening balance', () => {
              it('should not update the openingBalance value', (done) => {
                // Arrange
                delete data.openingBalance;
                // Act
                Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                  // Assert
                  const expectedContract = processCategoriesSpy.args[0][1];
                  expect(expectedContract.openingBalance).to.eq(contract.openingBalance);
                  done();
                });
              });
            });

            describe('when contract has no opening balance', () => {
              it('should set contract.openingBalance to the default value', (done) => {
                // Arrange
                delete data.openingBalance;
                contract.openingBalance = null;
                contractFindOneStub.resolves(contract);
                // Act
                Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                  // Assert
                  const expectedContract = processCategoriesSpy.args[0][1];
                  expect(expectedContract.openingBalance).to.eq(0);
                  done();
                });
              });
            });
          });
        });

        describe('contract.autoPayment', () => {
          describe('when data.autoPayment', () => {
            it('should assign data.autoPayment to the contract.autoPayment', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.autoPayment).to.eq(data.autoPayment);
                done();
              });
            });
          });

          describe('when no data.autoPayment and overwriteBlanks is false', () => {
            it('should keep contract.autoPayment', (done) => {
              // Arrange
              delete data.autoPayment;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.autoPayment).to.eq(contract.autoPayment);
                done();
              });
            });
          });

          describe('when no data.autoPayment and overwriteBlanks is true', () => {
            it('should set contract.autoPayment to the default value', (done) => {
              // Arrange
              delete data.autoPayment;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.autoPayment).to.be.false;
                done();
              });
            });
          });
        });

        describe('contract.selfBilling', () => {
          describe('when data.selfBilling', () => {
            it('should assign data.selfBilling to the contract.selfBilling', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.selfBilling).to.eq(data.selfBilling);
                done();
              });
            });
          });

          describe('when no data.selfBilling and overwriteBlanks is false', () => {
            it('should keep contract.selfBilling', (done) => {
              // Arrange
              delete data.selfBilling;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.selfBilling).to.eq(contract.selfBilling);
                done();
              });
            });
          });

          describe('when no data.selfBilling and overwriteBlanks is true', () => {
            it('should set contract.selfBilling to the default value', (done) => {
              // Arrange
              delete data.selfBilling;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.selfBilling).to.be.false;
                done();
              });
            });
          });
        });

        describe('contract.deductWithholding', () => {
          describe('when data.deductWithholding', () => {
            it('should assign data.deductWithholding to the contract.deductWithholding', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.deductWithholding).to.eq(data.deductWithholding);
                done();
              });
            });
          });

          describe('when no data.deductWithholding and overwriteBlanks is false', () => {
            it('should keep contract.deductWithholding', (done) => {
              // Arrange
              delete data.deductWithholding;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.deductWithholding).to.eq(contract.deductWithholding);
                done();
              });
            });
          });

          describe('when no data.deductWithholding and overwriteBlanks is true', () => {
            it('should set contract.deductWithholding to the default value', (done) => {
              // Arrange
              delete data.deductWithholding;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.deductWithholding).to.be.false;
                done();
              });
            });
          });
        });

        describe('contract.summaryContractTotals', () => {
          describe('when data.summaryContractTotals', () => {
            it('should assign data.summaryContractTotals to the contract.summaryContractTotals', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.summaryContractTotals).to.eq(data.summaryContractTotals);
                done();
              });
            });
          });

          describe('when no data.summaryContractTotals and overwriteBlanks is false', () => {
            it('should keep contract.summaryContractTotals', (done) => {
              // Arrange
              delete data.summaryContractTotals;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.summaryContractTotals).to.eq(contract.summaryContractTotals);
                done();
              });
            });
          });

          describe('when no data.summaryContractTotals and overwriteBlanks is true', () => {
            it('should set contract.summaryContractTotals to the default value', (done) => {
              // Arrange
              delete data.summaryContractTotals;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.summaryContractTotals).to.be.false;
                done();
              });
            });
          });
        });

        describe('contract.notes', () => {
          describe('when data.notes', () => {
            it('should assign data.notes to the contract.notes', (done) => {
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.notes).to.eq(data.notes);
                done();
              });
            });
          });

          describe('when no data.notes and overwriteBlanks is false', () => {
            it('should keep contract.notes', (done) => {
              // Arrange
              delete data.notes;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.notes).to.eq(contract.notes);
                done();
              });
            });
          });

          describe('when no data.notes and overwriteBlanks is true', () => {
            it('should set contract.notes to the default value', (done) => {
              // Arrange
              delete data.notes;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.notes).to.be.null;
                done();
              });
            });
          });
        });

        describe('contract.accountingPeriod', () => {
          describe('when data.accountingPeriod and overwriteBlanks is false', () => {
            describe('when client.accountingPeriodTypes.includes(data.accountingPeriod)', () => {
              it('should assign data.accountingPeriod to the contract.accountingPeriod', (done) => {
                // Arrange
                client.accountingPeriodTypes = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];
                data.accountingPeriod = client.accountingPeriodTypes[0];
                // Act
                Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                  // Assert
                  const expectedContract = processCategoriesSpy.args[0][1];
                  expect(expectedContract.accountingPeriod).to.eq(data.accountingPeriod);
                  done();
                });
              });
            });

            describe('when [\'Monthly\', \'Quarterly\', \'Half-Yearly\', \'Yearly\'].includes(data.accountingPeriod)', () => {
              it('should assign data.accountingPeriod to the contract.accountingPeriod', (done) => {
                // Arrange
                data.accountingPeriod = 'Quarterly';
                // Act
                Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                  // Assert
                  const expectedContract = processCategoriesSpy.args[0][1];
                  expect(expectedContract.accountingPeriod).to.eq(data.accountingPeriod);
                  done();
                });
              });
            });
          });

          describe('when no data.accountingPeriod and overwriteBlanks is true', () => {
            it('should assign data.accountingPeriod to the contract.accountingPeriod', (done) => {
              // Arrange
              delete data.accountingPeriod;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.accountingPeriod).to.eq(contract.accountingPeriod);
                done();
              });
            });
          });

          describe('when no data.accountingPeriod and overwriteBlanks is false', () => {
            it('should assign data.accountingPeriod to the contract.accountingPeriod', (done) => {
              // Arrange
              delete data.accountingPeriod;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.accountingPeriod).to.eq(contract.accountingPeriod);
                done();
              });
            });
          });
        });

        describe('contract.currency', () => {
          describe('when data.currency and overwriteBlanks is false', () => {
            describe('when [\'Home Currency\', client.currency2, client.currency3, client.currency4].filter(Boolean).includes(data.currency)', () => {
              it('should assign data.Currency to the contract.Currency', (done) => {
                // Arrange
                data.currency = client.currency2;
                // Act
                Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                  // Assert
                  const expectedContract = processCategoriesSpy.args[0][1];
                  expect(expectedContract.currency).to.eq(data.currency);
                  done();
                });
              });
            });

            describe('when ![\'Home Currency\', client.currency2, client.currency3, client.currency4].filter(Boolean).includes(data.currency)', () => {
              it('should assign data.Currency to the contract.Currency', (done) => {
                // Arrange
                data.currency = testUtils.randomString();
                // Act
                Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                  // Assert
                  const expectedContract = processCategoriesSpy.args[0][1];
                  expect(expectedContract.currency).to.eq(contract.currency);
                  done();
                });
              });
            });
          });

          describe('when no data.currency and overwriteBlanks is true', () => {
            it('should assign data.currency to the contract.currency', (done) => {
              // Arrange
              delete data.currency;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, true, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.currency).to.eq(contract.currency);
                done();
              });
            });
          });

          describe('when no data.currency and overwriteBlanks is false', () => {
            it('should assign data.currency to the contract.currency', (done) => {
              // Arrange
              delete data.currency;
              // Act
              Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
                // Assert
                const expectedContract = processCategoriesSpy.args[0][1];
                expect(expectedContract.currency).to.eq(contract.currency);
                done();
              });
            });
          });
        });
      });

      it('should call processCategories with the right args', (done) => {
        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(processCategoriesSpy.calledWith(
            data,
            contract,
            client,
            index,
            false,
            [],
          )).to.be.true;
          done();
        });
      });

      it('should call processPayee with the right args', (done) => {
        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(processPayeeSpy.calledWith(
            data,
            contract,
            client,
            index,
            false,
            Payee,
            [],
          )).to.be.true;
          done();
        });
      });

      it('should call processCompany with the right args', (done) => {
        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(processCompanySpy.calledWith(
            data,
            contract,
            client,
            index,
            false,
            Company,
            [],
          )).to.be.true;
          done();
        });
      });

      it('should call processContractTermGroups with the right args', (done) => {
        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(processContractTermGroupsSpy.calledWith(
            {},
            clientId,
          )).to.be.true;
          done();
        });
      });

      describe("when contractTemplateType is 'Standard'", () => {
        it("should call processTerms with 'Sales Terms' and 'salesTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Standard';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.sales,
              'Sales Terms',
              'salesTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it("should call processTerms with 'Deductions' and 'deductionsTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Standard';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.deductions,
              'Deductions',
              'deductionsTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it("should call processTerms with 'Mechanicals' and 'mechanicalTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Standard';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.mechanicals,
              'Mechanicals',
              'mechanicalTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it("should call processTerms with 'Withholding Tax' and 'withholdingTaxTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Standard';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.withholdingTax,
              'Withholding Tax',
              'withholdingTaxTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it("should call processTerms with 'Costs' and 'costsTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Standard';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.costs,
              'Costs',
              'costsTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it('should call processReserves with the right args', (done) => {
          // Arrange
          contractTemplateType = 'Standard';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processReservesSpy.calledWith(
              contract,
              otherMapData,
              false,
            )).to.be.true;
            done();
          });
        });
      });

      describe("when contractTemplateType is 'Publisher'", () => {
        it("should call processTerms with 'Income' and 'salesTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Publisher';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.sales,
              'Income',
              'salesTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it("should call processTerms with 'Deductions' and 'deductionsTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Publisher';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.deductions,
              'Deductions',
              'deductionsTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });
      });

      describe("when contractTemplateType is 'Mechanical'", () => {
        it("should call processTerms with 'Terms' and 'mechanicalContractTerms'", (done) => {
          // Arrange
          contractTemplateType = 'Mechanical';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processTermsSpy.calledWith(
              contract,
              client,
              clientId,
              otherMapData.mechanicalTerms,
              'Terms',
              'mechanicalContractTerms',
              false,
              {},
              contractTemplateType,
            )).to.be.true;
            done();
          });
        });

        it('should call processReserves', (done) => {
          // Arrange
          contractTemplateType = 'Mechanical';
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
            // Assert
            expect(processReservesSpy.calledWith(
              contract,
              otherMapData,
              false,
            )).to.be.true;
            done();
          });
        });
      });

      it('should call processCrossContracts', (done) => {
        // Arrange
        processCrossContractsSpy = sinon.spy((contract, otherMapData, overwriteBlanks, errors, features, clientType, cb) => { cb(null, []); });
        Contract.__set__('processCrossContracts', processCrossContractsSpy);

        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(processCrossContractsSpy.calledWith(
            contract,
            otherMapData,
            false,
          )).to.be.true;
          done();
        });
      });

      describe('when processCrossContracts', () => {
        let processCrossContracts;
        let allowedValues;
        let allowedValuesPlusNonPublisher;
        let allowedValuesPlusComplex;
        let allowedValuesPlusComplexPublisher;
        let errors;

        beforeEach((done) => {
          processCrossContracts = Contract.__get__('processCrossContracts');
          allowedValues = ['Always transfer Income', 'Balance is Positive', 'Balance is Greater Than Minimum Payout', 'Always transfer Balance'];
          allowedValuesPlusNonPublisher = ['Always transfer Income and Costs', 'Always transfer Income, Costs and Reserves'];
          allowedValuesPlusComplex = ['Income is Positive', 'Income is Negative',
            'Income and Costs are Positive', 'Income and Costs are Negative',
            'Income, Costs and Reserves are Positive', 'Income, Costs and Reserves are Negative',
            'Balance is Negative',
            'Balance Minus Opening is Positive', 'Balance Minus Opening is Negative', 'Always transfer Balance Minus Opening'];
          allowedValuesPlusComplexPublisher = ['Always transfer Income and Costs'];
          errors = [];
          done();
        });
        it('should return error for When and Process', (done) => {
          // Arrange
          const crossContracts = [testUtils.randomString()];
          otherMapData.crossContracts = crossContracts.map((str, index) => ({ condition: str, process: testUtils.randomString(), contractId: crossContract._id, percentage: 1, contractName: contract.name }));
          const whenError = 'When value is incorrect';
          const processError = 'Process value is incorrect';
          const expectedErrors = [
            `Cross Contracts - Line ${0 + 3}: ${whenError}`,
            `Cross Contracts - Line ${0 + 3}: ${processError}`,
          ];
          // Act
          processCrossContracts(contract, otherMapData, overwriteBlanks, errors, client.features, client.clientType, (err, returnedErrors) => {
            // Assert
            expect(returnedErrors).to.deep.eq(expectedErrors);
            done();
          });
        });
        it('should NOT return error for When if complexCrossContracts feature not set', (done) => {
          // Arrange
          const crossContracts = allowedValues.concat(allowedValuesPlusNonPublisher);
          otherMapData.crossContracts = crossContracts.map((str, index) => ({ condition: str, process: 'Add To', contractId: crossContract._id, percentage: 1, contractName: contract.name }));
          const expectedErrors = [];
          // Act
          processCrossContracts(contract, otherMapData, overwriteBlanks, errors, client.features, client.clientType, (err, returnedErrors) => {
            // Assert
            expect(returnedErrors).to.deep.eq(expectedErrors);
            done();
          });
        });
        it('should NOT return error for When if complexCrossContracts feature set for publisher', (done) => {
          // Arrange
          const crossContracts = allowedValues.concat(allowedValuesPlusComplex, allowedValuesPlusComplexPublisher);
          client.clientType = 'Publisher';
          client.features = { complexCrossContracts: true };
          otherMapData.crossContracts = crossContracts.map((str, index) => ({ condition: str, process: 'Add To', contractId: crossContract._id, percentage: 1, contractName: contract.name }));
          const expectedErrors = [];
          // Act
          processCrossContracts(contract, otherMapData, overwriteBlanks, errors, client.features, client.clientType, (err, returnedErrors) => {
            // Assert
            expect(returnedErrors).to.deep.eq(expectedErrors);
            done();
          });
        });
        it('should return error for When if complexCrossContracts feature set for publisher', (done) => {
          // Arrange
          const crossContracts = ['Always transfer Income, Costs and Reserves'];
          client.clientType = 'Publisher';
          client.features = { complexCrossContracts: true };
          otherMapData.crossContracts = crossContracts.map((str, index) => ({ condition: str, process: 'Add To', contractId: crossContract._id, percentage: 1, contractName: contract.name }));
          const whenError = 'When value is incorrect';
          const expectedErrors = [
            `Cross Contracts - Line ${0 + 3}: ${whenError}`,
          ];
          // Act
          processCrossContracts(contract, otherMapData, overwriteBlanks, errors, client.features, client.clientType, (err, returnedErrors) => {
            // Assert
            expect(returnedErrors).to.deep.eq(expectedErrors);
            done();
          });
        });
        it('should return error for When is Always transfer Balance or Balance is Positive and process is Subtract From', (done) => {
          // Arrange
          const crossContracts = ['Always transfer Balance'];
          client.features = { complexCrossContracts: true };
          otherMapData.crossContracts = crossContracts.map((str, index) => ({ condition: str, process: 'Subtract From', contractId: crossContract._id, percentage: 1, contractName: contract.name }));
          const expectedErrors = [
            `Cross Contracts - Line ${0 + 3}: You should not cross contract when '${crossContracts[0]}' with 'Subtract From' `,
          ];
          // Act
          processCrossContracts(contract, otherMapData, overwriteBlanks, errors, client.features, client.clientType, (err, returnedErrors) => {
            // Assert
            expect(returnedErrors).to.deep.eq(expectedErrors);
            done();
          });
        });
        it('should return error for When if complexCrossContracts feature set for publisher', (done) => {
          // Arrange
          const crossContracts = ['Always transfer Balance'];
          client.features = { complexCrossContracts: true };
          contract.type = 'Profit Share';
          otherMapData.crossContracts = crossContracts.map((str, index) => ({ condition: str, process: 'Add To', contractId: crossContract._id, percentage: 1, contractName: contract.name }));
          const expectedErrors = [
            `Cross Contracts - Line ${0 + 3}: You should not cross contract 'Always transfer Balance' from a 'Profit Share Classic' contract `,
          ];
          // Act
          processCrossContracts(contract, otherMapData, overwriteBlanks, errors, client.features, client.clientType, (err, returnedErrors) => {
            // Assert
            expect(returnedErrors).to.deep.eq(expectedErrors);
            done();
          });
        });
      });

      it('should call contract.validate', (done) => {
        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(contractValidateStub.called).to.be.true;
          done();
        });
      });

      it('should return a contract', (done) => {
        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err, returnedContract, errors) => {
          // Assert
          expect(returnedContract).to.exist;
          done();
        });
      });

      it('should return an array of errors', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        processCrossContractsSpy = sinon.spy((contract, otherMapData, overwriteBlanks, errors, features, clientType, cb) => {
          errors.push(expectedError);
          cb(null, errors);
        });
        Contract.__set__('processCrossContracts', processCrossContractsSpy);

        // Act
        Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err, returnedContract, errors) => {
          // Assert
          expect(errors).to.deep.eq([expectedError]);
          done();
        });
      });

      describe('when contract.validate returns an error', () => {
        it('should return an error', (done) => {
          // Arrange
          const expectedError = testUtils.randomString();
          contractValidateStub.yields(expectedError);
          // Act
          Contract.importContract(data, index, otherMapData, clientId, client, false, contractTemplateType, client.features, client.clientType, (err, returnedContract, errors) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });

  // Skipping import tests as the process has been refactored and new tests will be added
  describe.skip('importContracts', () => {
    const contracts = [
      {
        _id: testUtils.randomId(),
      },
      {
        _id: testUtils.randomId(),
      },
    ];
    const otherMapData = {
      sales: [testUtils.randomString()],
    };
    const clientId = testUtils.randomId();
    const overwriteBlanks = testUtils.randomBoolean();
    const contractTemplateType = testUtils.randomString();
    const client = new Client({
      name: testUtils.randomString(),
      features: {},
      clientType: testUtils.randomString(),
    });

    let clientFindByIdStub;
    let importContractStub;

    beforeEach((done) => {
      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      importContractStub = sinon.stub(Contract, 'importContract');
      importContractStub.yields(null, contract);
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Contract.importContracts).to.exist;
      done();
    });

    describe('when contracts is not an array', () => {
      it('should return an error', (done) => {
        // Arrange
        const contractsObj = { _id: testUtils.randomId() };
        const expectedError = ['It appears your template doesn\'t match the expected template'];
        // Act
        Contract.importContracts(contractsObj, otherMapData, clientId, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(err).to.deep.eq(expectedError);
          done();
        });
      });
    });

    describe('when no clientId is passed', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = ['A Client ID must be passed'];
        // Act
        Contract.importContracts(contracts, otherMapData, null, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
          // Assert
          expect(err).to.deep.eq(expectedError);
          done();
        });
      });
    });

    it('should call Client.findById with the clientId', (done) => {
      // Act
      Contract.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
        // Assert
        expect(clientFindByIdStub.called).to.be.true;
        expect(clientFindByIdStub.calledWith(clientId)).to.be.true;
        done();
      });
    });

    it('should call importContract for each of the contracts', (done) => {
      // Act
      Contract.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
        // Assert
        expect(importContractStub.called).to.be.true;
        expect(importContractStub.calledWith(contracts[0], 0, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType)).to.be.true;
        expect(importContractStub.calledWith(contracts[1], 1, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, client.features, client.clientType)).to.be.true;
        done();
      });
    });

    it('should not call importContract if a contract object is not populated', (done) => {
      // Arrange
      const emptyContracts = [{}, {}];
      // Act
      Contract.importContracts(emptyContracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, client.features, client.clientType, (err) => {
        // Assert
        expect(importContractStub.called).to.be.false;
        done();
      });
    });

    it('should return a count and array of imported contracts', (done) => {
      // Arrange
      const expectedImportedContracts = [contract, contract];
      // Act
      Contract.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, client.features, client.clientType, (errors, count, importedContracts) => {
        // Assert
        expect(count).to.eq(2);
        expect(importedContracts).to.deep.eq(expectedImportedContracts);
        done();
      });
    });

    describe('when importContract returns an error', () => {
      it('should return an array of errors', (done) => {
        // Arrange
        const error = testUtils.randomString();
        importContractStub.yields(error);
        const expectedErrors = [
          `Overview Line ${0 + 3}: ${error}`,
          `Overview Line ${1 + 3}: ${error}`,
        ];
        // Act
        Contract.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, client.features, client.clientType, (errors, count, importedContracts) => {
          // Assert
          expect(errors).to.deep.eq(expectedErrors);
          expect(count).to.eq(0);
          expect(importedContracts).to.deep.eq([]);
          done();
        });
      });
    });
  });

  describe.skip('sendExport', () => {
    const filter = {
      filed1: testUtils.randomString(),
      filed2: testUtils.randomString(),
    };
    const contractType = testUtils.randomString();
    const clientType = testUtils.randomString();
    const paymentTier = testUtils.randomString();
    const curveUser = {
      clientId: testUtils.randomId(),
    };
    const filePath = `${testUtils.randomString()}.${testUtils.randomString()}`;
    const client = {
      _id: testUtils.randomId(),
      name: testUtils.randomString(),
      paymentTier,
    };
    const momentTimestamp = testUtils.randomInt();

    beforeEach((done) => {
      sinon.stub(Contract, 'countDocuments');
      Contract.countDocuments.resolves(testUtils.randomInt());

      sinon.stub(Client, 'findById');
      Client.findById.resolves(client);

      sinon.stub(Contract, 'createXlsxExport');
      Contract.createXlsxExport.yields(null, filePath);

      sinon.stub(Contract, 'createCsvExport');
      Contract.createCsvExport.yields(null, filePath);

      sinon.stub(Notification, 'generate');
      Notification.generate.yields();

      moment.format = sinon.stub().returns(momentTimestamp);
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Contract.sendExport).to.exist;
      done();
    });

    it('should call contract.countDocuments', (done) => {
      Contract.sendExport(filter, contractType, clientType, curveUser);
      setTimeout(() => {
        // Assert
        expect(Contract.countDocuments.called).to.be.true;
        done();
      }, 3000);
    });

    it('should call Client.findById', (done) => {
      Contract.sendExport(filter, contractType, clientType, curveUser);
      setTimeout(() => {
        // Assert
        expect(Client.findById.called).to.be.true;
        done();
      }, 3000);
    });

    describe('When contract count is less than 1000', () => {
      beforeEach((done) => {
        Contract.countDocuments.resolves(500);
        done();
      });
      it('should call createCsvExport', (done) => {
        Contract.sendExport(filter, contractType, clientType, curveUser);
        setTimeout(() => {
          // Assert
          expect(Contract.createXlsxExport.called).to.be.true;
          expect(Contract.createXlsxExport.calledWith(filter, curveUser.clientId, paymentTier, clientType, contractType)).to.be.true;
          done();
        }, 3000);
      });
    });

    describe('When contract count is greater than 1000', () => {
      beforeEach((done) => {
        Contract.countDocuments.resolves(2000);
        done();
      });
      it('should call createCsvExport', (done) => {
        Contract.sendExport(filter, contractType, clientType, curveUser);
        setTimeout(() => {
          // Assert
          expect(Contract.createCsvExport.called).to.be.true;
          expect(Contract.createCsvExport.calledWith(filter, curveUser.clientId, paymentTier, clientType, contractType)).to.be.true;
          done();
        }, 3000);
      });
    });

    describe('when the file is created.', () => {
      it('should call Client.findById', (done) => {
        // Act
        Contract.sendExport(filter, contractType, clientType, curveUser);
        // Assert
        expect(Client.findById.called).to.be.true;
        expect(Client.findById.calledWith(curveUser.clientId)).to.be.true;
        done();
      });

      it('should call fileManager.uploadToS3', (done) => {
        // Arrange
        const expectedFilename = `exports/${client.name} Contract Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`;

        // Act
        Contract.sendExport(filter, contractType, clientType, curveUser);
        // Assert
        expect(uploadToS3Stub.called).to.be.true;
        expect(uploadToS3Stub.calledWith(expectedFilename, filePath)).to.be.true;
        done();
      });
    });

    describe('when the file is uploaded to S3.', () => {
      it('should call fileManager.publicLink24Hours', (done) => {
        // Act
        Contract.sendExport(filter, contractType, clientType, curveUser);
        // Assert
        expect(publicLink24HoursStub.called).to.be.true;
        expect(publicLink24HoursStub.calledWith(returnedS3UploadLink)).to.be.true;
        done();
      });
    });

    describe('when the public link is generated.', () => {
      it('should generate a notification', (done) => {
        // Arrange
        const generateOptions = {
          identifier: 'exportDownload',
          curveUser,
          client,
          subject: `Your Contracts Export for ${client.name} is Ready to Download`,
          link: returnedS324PublicLink,
        };
        // Act
        Contract.sendExport(filter, contractType, clientType, curveUser);
        // Assert
        expect(Notification.generate.called).to.be.true;
        expect(Notification.generate.calledWith(
          'Contracts Export Ready',
          `Your Contracts Export for ${client.name} is Ready to Download`,
          returnedS324PublicLink,
          curveUser,
          generateOptions,
        )).to.be.true;
        done();
      });
    });

    describe('when an error is returned.', () => {
      it('should generate a notification', (done) => {
        // Arrange
        const expectedError = { message: testUtils.randomString() };
        const generateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: 'Your Contract Export Has Errored',
          error: expectedError.message,
        };
        publicLink24HoursStub.yields(expectedError);
        Notification.generate.reset();
        Notification.generate.returns();
        // Act
        Contract.sendExport(filter, contractType, clientType, curveUser);
        // Assert
        expect(Notification.generate.called).to.be.true;
        expect(Notification.generate.calledWith(
          'Your Contract Export Has Errored',
          expectedError.message,
          null,
          curveUser,
          generateOptions,
        )).to.be.true;
        done();
      });
    });
  });

  describe('multipleContractsForXlsx', () => {
    let contracts;
    const clientId = testUtils.randomId();
    const paymentTier = testUtils.randomString();
    const client = {
      dateFormat: testUtils.randomString(),
      paymentTier,
      features: {},
    };
    const exportData = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];

    let clientFindByIdStub;
    let contract1ExportDataStub;

    let territoryGroupFindStub;
    const territoryGroupFindResult = [
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
      },
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
      },
    ];

    let contractTermGroupFindStub;
    const contractTermGroupFindResult = [
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
      },
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
      },
    ];

    beforeEach((done) => {
      contracts = [
        new Contract(contractFields),
      ];

      territoryGroupFindStub = sinon.stub(TerritoryGroup, 'find');
      territoryGroupFindStub.resolves(territoryGroupFindResult);

      contractTermGroupFindStub = sinon.stub(ContractTermGroup, 'find');
      contractTermGroupFindStub.resolves(contractTermGroupFindResult);

      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      contract1ExportDataStub = sinon.stub(contracts[0], 'exportData');
      contract1ExportDataStub.yields(null, exportData);

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Contract.multipleContractsForXlsx).to.exist;
      done();
    });

    describe('when not passed an array of contracts', () => {
      it('should return an error', (done) => {
        // Arrange
        const contractsObj = {
          field1: testUtils.randomString(),
        };
        const expctedError = 'Must be passed an Array of Contracts';
        // Act
        Contract.multipleContractsForXlsx(contractsObj, clientId, paymentTier, (err) => {
          // Assert
          expect(err.message).to.eq(expctedError);
          done();
        });
      });
    });

    it('should call TerritoryGroup.find with the clientId', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, () => {
        // Assert
        expect(territoryGroupFindStub.called).to.be.true;
        expect(territoryGroupFindStub.calledWith({ clientId }, { name: 1 })).to.be.true;
        done();
      });
    });

    it('should call ContractTermGroup.find with the clientId', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(contractTermGroupFindStub.called).to.be.true;
        expect(contractTermGroupFindStub.calledWith({ clientId }, { name: 1, type: 1 })).to.be.true;
        done();
      });
    });

    it('should call Client.findById', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(clientFindByIdStub.called).to.be.true;
        expect(clientFindByIdStub.calledWith(clientId)).to.be.true;
        done();
      });
    });

    it('should call contract.exportData with the date format from the client', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(contract1ExportDataStub.called).to.be.true;
        expect(contract1ExportDataStub.calledWith('Standard', client.dateFormat.toUpperCase()), paymentTier).to.be.true;
        done();
      });
    });

    it('should return the sorted converted contracts', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedContracts = result[0];
        const expectedConvertedContracts = [exportData];
        expect(convertedContracts).to.deep.eq(expectedConvertedContracts);
        done();
      });
    });

    it('should return the sorted converted sales', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedSales = result[1];
        const expectedConvertedSales = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};
        contract.salesTerms.map((sale) => {
          if (sale) {
            sale.territory = territoryGroupMappings[sale.territory]
              ? territoryGroupMappings[sale.territory] : sale.territory;

            sale.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][sale.channel]
              ? contractTermMappings['Distribution Channel'][sale.channel] : sale.channel;

            sale.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[sale.configuration]
              ? contractTermMappings.Configuration[sale.configuration] : sale.configuration;

            sale.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][sale.priceCategory]
              ? contractTermMappings['Price Category'][sale.priceCategory] : sale.priceCategory;

            sale.source = contractTermMappings.Source && contractTermMappings.Source[sale.source]
              ? contractTermMappings.Source[sale.source] : sale.source;

            const escalationTrackersJoined = sale.escalationTrackers && sale.escalationTrackers.length > 0 ? sale.escalationTrackers.join(';') : null;

            const exportData = [
              contract.name, sale.catType, sale.catalogueGroup,
              sale.territory, sale.channel, sale.configuration,
              sale.priceCategory, sale.source, escalationTrackersJoined,
              sale.type, sale.rate, sale.multiplier, sale.reductionRate,
              sale.unitRate, sale.reserve,
            ];

            // Add escalations to sales terms
            for (const escalation of sale.escalations) {
              const condition = escalation.conditions?.[0] || {};
              exportData.push(condition.escalationTracker || '');
              exportData.push(condition.thresholdType || '');
              exportData.push(condition.when || '');
              exportData.push(['Sale Date', 'Reporting Date'].includes(condition.escalationTracker) ? moment(condition.threshold).format('DD/MM/YYYY') : condition.threshold);
              exportData.push(escalation.type || '');
              exportData.push(escalation.unitRate || '');
              exportData.push(escalation.rate || '');
              exportData.push(escalation.multiplier || '');
              exportData.push(escalation.reductionRate || '');
              exportData.push(escalation.reserve || '');
            }

            expectedConvertedSales.push(exportData);
          }
        });

        expect(convertedSales).to.deep.eq(expectedConvertedSales.sort());
        done();
      });
    });

    it('should return the sorted converted deductions', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedDeductions = result[2];
        const expectedConvertedDeductions = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.deductionsTerms.map((deduction) => {
          if (deduction) {
            deduction.territory = territoryGroupMappings[deduction.territory]
              ? territoryGroupMappings[deduction.territory] : deduction.territory;
            deduction.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][deduction.channel]
              ? contractTermMappings['Distribution Channel'][deduction.channel] : deduction.channel;
            deduction.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[deduction.configuration]
              ? contractTermMappings.Configuration[deduction.configuration] : deduction.configuration;
            deduction.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][deduction.priceCategory]
              ? contractTermMappings['Price Category'][deduction.priceCategory] : deduction.priceCategory;
            deduction.source = contractTermMappings.Source && contractTermMappings.Source[deduction.source]
              ? contractTermMappings.Source[deduction.source] : deduction.source;

            const escalationTrackersJoined = deduction.escalationTrackers && deduction.escalationTrackers.length > 0
              ? deduction.escalationTrackers.join(';') : null;

            expectedConvertedDeductions.push([
              contract.name, deduction.catType, deduction.catalogueGroup,
              deduction.territory, deduction.channel, deduction.configuration,
              deduction.priceCategory, deduction.source, deduction.deductionBasis,
              deduction.type, deduction.rate, deduction.unitRate, escalationTrackersJoined]);
          }
        });

        expect(convertedDeductions).to.deep.eq(expectedConvertedDeductions.sort());
        done();
      });
    });

    it('should return the sorted converted mechanicals', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedMechanicals = result[3];
        const expectedConvertedMechanicals = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.mechanicalTerms.map((mechanical) => {
          if (mechanical) {
            mechanical.territory = territoryGroupMappings[mechanical.territory]
              ? territoryGroupMappings[mechanical.territory] : mechanical.territory;
            mechanical.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][mechanical.channel]
              ? contractTermMappings['Distribution Channel'][mechanical.channel] : mechanical.channel;
            mechanical.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[mechanical.configuration]
              ? contractTermMappings.Configuration[mechanical.configuration] : mechanical.configuration;
            mechanical.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][mechanical.priceCategory]
              ? contractTermMappings['Price Category'][mechanical.priceCategory] : mechanical.priceCategory;
            mechanical.source = contractTermMappings.Source && contractTermMappings.Source[mechanical.source]
              ? contractTermMappings.Source[mechanical.source] : mechanical.source;

            expectedConvertedMechanicals.push([
              contract.name, mechanical.catType, mechanical.catalogueGroup,
              mechanical.territory, mechanical.channel, mechanical.configuration,
              mechanical.priceCategory, mechanical.source, mechanical.deductionType,
              mechanical.type, mechanical.rateBasis, mechanical.rate,
              mechanical.unitRate, mechanical.reserve, mechanical.currency]);
          }
        });

        expect(convertedMechanicals).to.deep.eq(expectedConvertedMechanicals.sort());
        done();
      });
    });

    it('should return the sorted converted withholdingTax', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedWithholdingTax = result[4];
        const expectedConvertedWithholdingTax = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.withholdingTaxTerms.map((withholdingTax) => {
          if (withholdingTax) {
            withholdingTax.territory = territoryGroupMappings[withholdingTax.territory]
              ? territoryGroupMappings[withholdingTax.territory] : withholdingTax.territory;
            withholdingTax.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][withholdingTax.channel]
              ? contractTermMappings['Distribution Channel'][withholdingTax.channel] : withholdingTax.channel;
            withholdingTax.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[withholdingTax.configuration]
              ? contractTermMappings.Configuration[withholdingTax.configuration] : withholdingTax.configuration;
            withholdingTax.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][withholdingTax.priceCategory]
              ? contractTermMappings['Price Category'][withholdingTax.priceCategory] : withholdingTax.priceCategory;
            withholdingTax.source = contractTermMappings.Source && contractTermMappings.Source[withholdingTax.source]
              ? contractTermMappings.Source[withholdingTax.source] : withholdingTax.source;

            const escalationTrackersJoined = withholdingTax.escalationTrackers && withholdingTax.escalationTrackers.length > 0 ? withholdingTax.escalationTrackers.join(';') : null;

            expectedConvertedWithholdingTax.push([
              contract.name, withholdingTax.catType, withholdingTax.catalogueGroup,
              withholdingTax.territory, withholdingTax.channel, withholdingTax.configuration,
              withholdingTax.priceCategory, withholdingTax.source, withholdingTax.deductionBasis,
              withholdingTax.type, withholdingTax.rate, withholdingTax.unitRate, escalationTrackersJoined]);
          }
        });

        expect(convertedWithholdingTax).to.deep.eq(expectedConvertedWithholdingTax.sort());
        done();
      });
    });

    it('should return the sorted converted costs', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedCosts = result[5];
        const expectedConvertedCosts = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.costsTerms.map((cost) => {
          if (cost) {
            cost.territory = territoryGroupMappings[cost.territory]
              ? territoryGroupMappings[cost.territory] : cost.territory;
            cost.type = contractTermMappings['Cost Type'] && contractTermMappings['Cost Type'][cost.type]
              ? contractTermMappings['Cost Type'][cost.type] : cost.type;

            const escalationTrackersJoined = cost.escalationTrackers && cost.escalationTrackers.length > 0
              ? cost.escalationTrackers.join(';') : null;

            const exportData = [
              contract.name, cost.territory,
              cost.type, cost.rate,
              escalationTrackersJoined,
            ];

            // Add escalations to costs terms
            for (const escalation of cost.escalations) {
              const condition = escalation.conditions?.[0] || {};
              exportData.push(condition.escalationTracker || '');
              exportData.push(condition.thresholdType || '');
              exportData.push(condition.when || '');
              exportData.push(['Cost Date', 'Reporting Date'].includes(condition.escalationTracker) ? moment(condition.threshold).format('DD/MM/YYYY') : condition.threshold);
              exportData.push(escalation.rate || '');
            }

            expectedConvertedCosts.push(exportData);
          }
        });

        expect(convertedCosts).to.deep.eq(expectedConvertedCosts.sort());
        done();
      });
    });

    it('should return the sorted converted reserves', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedReserves = result[6];
        const expectedConvertedReserves = [];

        contract.reserves.forEach((reserve) => {
          if (reserve) { expectedConvertedReserves.push([contract.name, reserve.rate]); }
        });

        expect(convertedReserves).to.deep.eq(expectedConvertedReserves.sort());
        done();
      });
    });

    it('should return the sorted converted cross contracts', (done) => {
      // Act
      Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedCrossContracts = result[7];
        const expectedConvertedCrossContracts = [];

        contract.crossContracts.map((crossContract) => {
          if (crossContract) {
            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(crossContract.contractId) })
              .then((linkToContract) => {
                if (linkToContract) {
                  expectedConvertedCrossContracts.push([
                    contract.name,
                    Contract.mapCrossContractCondition(crossContract.condition),
                    crossContract.process,
                    linkToContract.name,
                    crossContract.whenAutoPaymentTriggered,
                    crossContract.percentage]);
                }
                expect(convertedCrossContracts).to.deep.eq(expectedConvertedCrossContracts.sort());
                done();
              })
              .catch((err) => {
                assert.fail(err);
              });
          }
        });
      });
    });
  });

  describe('multipleMechanicalContractsForXlsx', () => {
    let contracts;
    const clientId = testUtils.randomId();
    const client = {
      dateFormat: testUtils.randomString(),
      features: {},
    };
    const exportData = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];

    let clientFindByIdStub;
    let contract1ExportDataStub;

    let territoryGroupFindStub;
    const territoryGroupFindResult = [
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
      },
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
      },
    ];

    let contractTermGroupFindStub;
    const contractTermGroupFindResult = [
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
      },
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
      },
    ];

    beforeEach((done) => {
      contracts = [
        new Contract(contractFields),
      ];

      territoryGroupFindStub = sinon.stub(TerritoryGroup, 'find');
      territoryGroupFindStub.resolves(territoryGroupFindResult);

      contractTermGroupFindStub = sinon.stub(ContractTermGroup, 'find');
      contractTermGroupFindStub.resolves(contractTermGroupFindResult);

      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      contract1ExportDataStub = sinon.stub(contracts[0], 'exportData');
      contract1ExportDataStub.yields(null, exportData);

      done();
    });

    it('should exist', (done) => {
      expect(Contract.multipleMechanicalContractsForXlsx).to.exist;
      done();
    });

    describe('when not passed an array of contracts', () => {
      it('should return an error', (done) => {
        // Arrange
        const contractsObj = {
          field1: testUtils.randomString(),
        };
        const expctedError = 'Must be passed an Array of Contracts';
        // Act
        Contract.multipleMechanicalContractsForXlsx(contractsObj, clientId, (err) => {
          // Assert
          expect(err.message).to.eq(expctedError);
          done();
        });
      });
    });

    it('should call TerritoryGroup.find with the clientId', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, () => {
        // Assert
        expect(territoryGroupFindStub.called).to.be.true;
        expect(territoryGroupFindStub.calledWith({ clientId }, { name: 1 })).to.be.true;
        done();
      });
    });

    it('should call ContractTermGroup.find with the clientId', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, () => {
        // Assert
        expect(contractTermGroupFindStub.called).to.be.true;
        expect(contractTermGroupFindStub.calledWith({ clientId }, { name: 1, type: 1 })).to.be.true;
        done();
      });
    });

    it('should call Client.findById', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, () => {
        // Assert
        expect(contractTermGroupFindStub.called).to.be.true;
        expect(contractTermGroupFindStub.calledWith({ clientId }, { name: 1, type: 1 })).to.be.true;
        done();
      });
    });

    it('should call contract.exportData with the date format from the client', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, () => {
        // Assert
        expect(contract1ExportDataStub.called).to.be.true;
        expect(contract1ExportDataStub.calledWith('Mechanical', client.dateFormat.toUpperCase())).to.be.true;
        done();
      });
    });

    it('should return the sorted converted contracts', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, (err, result) => {
        // Assert
        const convertedContracts = result[0];
        const expectedConvertedContracts = [exportData];

        expect(convertedContracts).to.deep.eq(expectedConvertedContracts.sort());
        done();
      });
    });

    it('should return the sorted converted mechanical terms', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, (err, result) => {
        // Assert
        const convertedMechanicalTerms = result[1];
        const expectedConvertedMechanicalTerms = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.mechanicalContractTerms.map((mechanical) => {
          mechanical.territory = territoryGroupMappings[mechanical.territory]
            ? territoryGroupMappings[mechanical.territory] : mechanical.territory;
          mechanical.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][mechanical.channel]
            ? contractTermMappings['Distribution Channel'][mechanical.channel] : mechanical.channel;
          mechanical.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[mechanical.configuration]
            ? contractTermMappings.Configuration[mechanical.configuration] : mechanical.configuration;
          mechanical.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][mechanical.priceCategory]
            ? contractTermMappings['Price Category'][mechanical.priceCategory] : mechanical.priceCategory;
          mechanical.source = contractTermMappings.Source && contractTermMappings.Source[mechanical.source]
            ? contractTermMappings.Source[mechanical.source] : mechanical.source;
          if (mechanical) {
            expectedConvertedMechanicalTerms.push([
              contract.name, mechanical.catType, mechanical.catalogueGroup,
              mechanical.territory, mechanical.channel, mechanical.configuration,
              mechanical.priceCategory, mechanical.source, mechanical.type,
              mechanical.rateBasis, mechanical.rate, mechanical.unitRate, mechanical.reserve]);
          }
        });

        expect(convertedMechanicalTerms).to.deep.eq(expectedConvertedMechanicalTerms.sort());
        done();
      });
    });

    it('should return the sorted converted reserves', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, (err, result) => {
        // Assert
        const convertedReserves = result[2];
        const expectedConvertedReserves = [];

        contract.reserves.map((reserve) => {
          if (reserve) { expectedConvertedReserves.push([contract.name, reserve.rate]); }
        });

        expect(convertedReserves).to.deep.eq(expectedConvertedReserves.sort());
        done();
      });
    });

    it('should return the sorted converted cross contracts', (done) => {
      // Act
      Contract.multipleMechanicalContractsForXlsx(contracts, clientId, (err, result) => {
        // Assert
        const convertedCrossContracts = result[3];
        const expectedConvertedCrossContracts = [];

        contract.crossContracts.map((crossContract) => {
          if (crossContract) {
            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(crossContract.contractId) })
              .then((linkToContract) => {
                if (linkToContract) {
                  expectedConvertedCrossContracts.push([
                    contract.name, Contract.mapCrossContractCondition(crossContract.condition),
                    crossContract.process, linkToContract.name, crossContract.whenAutoPaymentTriggered, crossContract.percentage]);
                }
                expect(convertedCrossContracts).to.deep.eq(expectedConvertedCrossContracts.sort());
                done();
              })
              .catch((err) => {
                assert.fail(err);
              });
          }
        });
      });
    });
  });

  describe('multiplePublisherContractsForXlsx', () => {
    let contracts;
    const clientId = testUtils.randomId();
    const paymentTier = testUtils.randomString();
    const client = {
      dateFormat: testUtils.randomString(),
      paymentTier,
      features: {},
    };
    const exportData = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];

    let clientFindByIdStub;
    let contract1ExportDataStub;

    let territoryGroupFindStub;
    const territoryGroupFindResult = [
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
      },
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
      },
    ];

    let contractTermGroupFindStub;
    const contractTermGroupFindResult = [
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
      },
      {
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        type: testUtils.randomString(),
      },
    ];

    beforeEach((done) => {
      contracts = [
        new Contract(contractFields),
      ];

      territoryGroupFindStub = sinon.stub(TerritoryGroup, 'find');
      territoryGroupFindStub.resolves(territoryGroupFindResult);

      contractTermGroupFindStub = sinon.stub(ContractTermGroup, 'find');
      contractTermGroupFindStub.resolves(contractTermGroupFindResult);

      clientFindByIdStub = sinon.stub(Client, 'findById');
      clientFindByIdStub.resolves(client);

      contract1ExportDataStub = sinon.stub(contracts[0], 'exportData');
      contract1ExportDataStub.yields(null, exportData);

      done();
    });

    it('should exist', (done) => {
      expect(Contract.multiplePublisherContractsForXlsx).to.exist;
      done();
    });

    describe('when not passed an array of contracts', () => {
      it('should return an error', (done) => {
        // Arrange
        const contractsObj = {
          field1: testUtils.randomString(),
        };
        const expctedError = 'Must be passed an Array of Contracts';
        // Act
        Contract.multiplePublisherContractsForXlsx(contractsObj, clientId, paymentTier, (err) => {
          // Assert
          expect(err.message).to.eq(expctedError);
          done();
        });
      });
    });

    it('should call TerritoryGroup.find with the clientId', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(territoryGroupFindStub.called).to.be.true;
        expect(territoryGroupFindStub.calledWith({ clientId }, { name: 1 })).to.be.true;
        done();
      });
    });

    it('should call ContractTermGroup.find with the clientId', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(contractTermGroupFindStub.called).to.be.true;
        expect(contractTermGroupFindStub.calledWith({ clientId }, { name: 1, type: 1 })).to.be.true;
        done();
      });
    });

    it('should call Client.findById', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(contractTermGroupFindStub.called).to.be.true;
        expect(contractTermGroupFindStub.calledWith({ clientId }, { name: 1, type: 1 })).to.be.true;
        done();
      });
    });

    it('should call contract.exportData with the date format from the client', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, () => {
        // Assert
        expect(contract1ExportDataStub.called).to.be.true;
        expect(contract1ExportDataStub.calledWith('Publisher', client.dateFormat.toUpperCase())).to.be.true;
        done();
      });
    });

    it('should return the sorted converted contracts', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedContracts = result[0];
        const expectedConvertedContracts = [exportData];

        expect(convertedContracts).to.deep.eq(expectedConvertedContracts.sort());
        done();
      });
    });

    it('should return the sorted converted sales', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedSales = result[1];
        const expectedConvertedSales = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.salesTerms.map((sale) => {
          if (sale) {
            sale.territory = territoryGroupMappings[sale.territory]
              ? territoryGroupMappings[sale.territory] : sale.territory;
            sale.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][sale.channel]
              ? contractTermMappings['Distribution Channel'][sale.channel] : sale.channel;
            sale.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[sale.configuration]
              ? contractTermMappings.Configuration[sale.configuration] : sale.configuration;
            sale.source = contractTermMappings.Source && contractTermMappings.Source[sale.source]
              ? contractTermMappings.Source[sale.source] : sale.source;

            const escalationTrackersJoined = sale.escalationTrackers && sale.escalationTrackers.length > 0
              ? sale.escalationTrackers.join(';') : null;

            const exportData = [
              contract.name, sale.catType, sale.catalogueGroup,
              sale.territory, sale.channel, sale.configuration, sale.source,
              escalationTrackersJoined, sale.type, sale.rate, sale.reductionRate];

            // Add escalations to sales terms
            for (const escalation of sale.escalations) {
              const condition = escalation.conditions?.[0] || {};
              exportData.push(condition.escalationTracker || '');
              exportData.push(condition.thresholdType || '');
              exportData.push(condition.when || '');
              exportData.push(['Sale Date', 'Reporting Date'].includes(condition.escalationTracker) ? moment(condition.threshold).format('DD/MM/YYYY') : condition.threshold);
              exportData.push(escalation.type || '');
              exportData.push(escalation.rate || '');
              exportData.push(escalation.reductionRate || '');
            }

            expectedConvertedSales.push(exportData);
          }
        });

        expect(convertedSales).to.deep.eq(expectedConvertedSales.sort());
        done();
      });
    });

    it('should return the sorted converted deductions', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedDeductions = result[2];
        const expectedConvertedDeductions = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};

        contract.deductionsTerms.map((deduction) => {
          if (deduction) {
            deduction.territory = territoryGroupMappings[deduction.territory]
              ? territoryGroupMappings[deduction.territory] : deduction.territory;
            deduction.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][deduction.channel]
              ? contractTermMappings['Distribution Channel'][deduction.channel] : deduction.channel;
            deduction.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[deduction.configuration]
              ? contractTermMappings.Configuration[deduction.configuration] : deduction.configuration;
            deduction.source = contractTermMappings.Source && contractTermMappings.Source[deduction.source]
              ? contractTermMappings.Source[deduction.source] : deduction.source;
            const escalationTrackersJoined = deduction.escalationTrackers && deduction.escalationTrackers.length > 0
              ? deduction.escalationTrackers.join(';') : null;

            expectedConvertedDeductions.push([
              contract.name, deduction.catType, deduction.catalogueGroup,
              deduction.territory, deduction.channel, deduction.configuration,
              deduction.source, deduction.deductionBasis, deduction.type,
              deduction.rate, deduction.unitRate, escalationTrackersJoined]);
          }
        });

        expect(convertedDeductions).to.deep.eq(expectedConvertedDeductions.sort());
        done();
      });
    });

    it('should return the sorted converted withholding terms', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedWithholdingTax = result[3];
        const expectedConvertedWithholdingTax = [];
        const territoryGroupMappings = {};
        const contractTermMappings = {};
        contract.withholdingTaxTerms.map((withholdingTax) => {
          if (withholdingTax) {
            withholdingTax.territory = territoryGroupMappings[withholdingTax.territory] ? territoryGroupMappings[withholdingTax.territory] : withholdingTax.territory;
            withholdingTax.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][withholdingTax.channel] ? contractTermMappings['Distribution Channel'][withholdingTax.channel] : withholdingTax.channel;
            withholdingTax.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[withholdingTax.configuration] ? contractTermMappings.Configuration[withholdingTax.configuration] : withholdingTax.configuration;
            withholdingTax.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][withholdingTax.priceCategory] ? contractTermMappings['Price Category'][withholdingTax.priceCategory] : withholdingTax.priceCategory;
            withholdingTax.source = contractTermMappings.Source && contractTermMappings.Source[withholdingTax.source] ? contractTermMappings.Source[withholdingTax.source] : withholdingTax.source;
            const escalationTrackersJoined = withholdingTax.escalationTrackers && withholdingTax.escalationTrackers.length > 0 ? withholdingTax.escalationTrackers.join(';') : null;
            expectedConvertedWithholdingTax.push([
              contract.name, withholdingTax.catType, withholdingTax.catalogueGroup, withholdingTax.territory, withholdingTax.channel, withholdingTax.configuration,
              withholdingTax.priceCategory, withholdingTax.source, withholdingTax.deductionBasis, withholdingTax.type, withholdingTax.rate, withholdingTax.unitRate,
              escalationTrackersJoined,
            ]);
          }
        });

        expect(convertedWithholdingTax).to.deep.eq(expectedConvertedWithholdingTax.sort());
        done();
      });
    });

    it('should return the sorted converted cross contracts', (done) => {
      // Act
      Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, (err, result) => {
        // Assert
        const convertedCrossContracts = result[4];
        const expectedConvertedCrossContracts = [];

        contract.crossContracts.map((crossContract) => {
          if (crossContract) {
            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(crossContract.contractId) })
              .then((linkToContract) => {
                if (linkToContract) {
                  expectedConvertedCrossContracts.push([
                    contract.name,
                    Contract.mapCrossContractCondition(crossContract.condition),
                    crossContract.process,
                    linkToContract.name,
                    crossContract.whenAutoPaymentTriggered,
                    crossContract.percentage]);
                }
                expect(convertedCrossContracts).to.deep.eq(expectedConvertedCrossContracts.sort());
                done();
              })
              .catch((err) => {
                assert.fail(err);
              });
          }
        });
      });
    });
  });

  // @TODO: do witch imports/exports
  describe('exportData', () => {
    const payee = {
      name: testUtils.randomString(),
    };
    const company = {
      name: testUtils.randomString(),
    };
    const type = testUtils.randomString();
    const dateFormat = testUtils.randomString();
    const paymentTier = testUtils.randomString();
    const balance = testUtils.randomInt();
    const advanceRemaining = testUtils.randomInt();

    let payeeFindByIdStub;
    let companyFindByIdStub;

    beforeEach((done) => {
      payeeFindByIdStub = sinon.stub(Payee, 'findById');
      payeeFindByIdStub.resolves(payee);

      companyFindByIdStub = sinon.stub(Company, 'findById');
      companyFindByIdStub.resolves(company);

      sinon.stub(Contract.prototype, 'getCurrentBalance').yields(null, advanceRemaining, balance);
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.exportData).to.exist;
      done();
    });

    it('should call Payee.findById with the contract clientId', (done) => {
      // Act
      contract.exportData(type, dateFormat, paymentTier, () => {
        // Assert
        expect(payeeFindByIdStub.called).to.be.true;
        expect(payeeFindByIdStub.calledWith(contract.payeeId)).to.be.true;
        done();
      });
    });

    it('should call Company.findById with the contract companyId', (done) => {
      // Act
      contract.exportData(type, dateFormat, paymentTier, () => {
        // Assert
        expect(companyFindByIdStub.called).to.be.true;
        expect(companyFindByIdStub.calledWith(contract.companyId)).to.be.true;
        done();
      });
    });

    it('should return the right array of data when type is Mechanical', (done) => {
      // Arrange
      const expectedData = [
        contract._id.toString(),
        contract.name,
        contract.foreignId,
        contract.projectId,
        payee.name,
        contract.active,
        company.name,
        contract.accountingPeriod,
        contract.currency,
        contract.licenseNo,
        contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
        contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
        contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
        contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
        contract.contractCategories.join(';'),
        contract.openingBalance,
        contract.minPayout,
        contract.autoPayment,
        contract.selfBilling,
        contract.deductWithholding,
        contract.summaryContractTotals,
        contract.reserveBasis,
        contract.notes,
        contract.labels && contract.labels.length > 0 ? contract.labels.join(';') : null,
        balance,
      ];
      // Act
      contract.exportData('Mechanical', dateFormat, paymentTier, (err, data) => {
        if (err) return done(err); // <-- Handle errors correctly

        try {
          expect(data).to.deep.eq(expectedData);
          done();
        } catch (assertionErr) {
          done(assertionErr); // <-- Fail the test if assertion fails
        }
      });
    });

    it('should return the right array of data when type is Publisher', (done) => {
      // Arrange
      const expectedData = [
        contract._id.toString(),
        contract.name,
        contract.foreignId,
        contract.projectId,
        payee.name,
        contract.active,
        company.name,
        contract.accountingPeriod,
        contract.currency,
        contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
        contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
        contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
        contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
        contract.contractCategories.join(';'),
        contract.openingBalance,
        contract.minPayout,
        contract.autoPayment,
        contract.selfBilling,
        contract.deductWithholding,
        contract.summaryContractTotals,
        contract.notes,
        contract.aliases && contract.aliases.length > 0 ? contract.aliases.join(';') : null,
        balance,
      ];
      // Act
      contract.exportData('Publisher', dateFormat, paymentTier, (err, data) => {
        // Assert
        expect(data).to.deep.eq(expectedData);
        done();
      });
    });

    it('should return the right array of data when type is not Publisher and not Mechanical', (done) => {
      // Arrange
      const expectedData = [
        contract._id.toString(),
        contract.name,
        contract.foreignId,
        contract.projectId,
        payee.name,
        contract.active,
        company.name,
        contract.accountingPeriod,
        contract.type,
        contract.currency,
        contract.profitSharePercentage,
        contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
        contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
        contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
        contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
        contract.contractCategories.join(';'),
        contract.openingBalance,
        contract.minPayout,
        contract.autoPayment,
        contract.selfBilling,
        contract.deductWithholding,
        contract.feesInvoice,
        contract.summaryContractTotals,
        contract.reserveBasis,
        contract.notes,
        contract.labels && contract.labels.length > 0 ? contract.labels.join(';') : null,
        contract.aliases && contract.aliases.length > 0 ? contract.aliases.join(';') : null,
        balance,
        advanceRemaining,
      ];
      // Act
      contract.exportData(type, dateFormat, paymentTier, (err, data) => {
        // Assert
        expect(data).to.deep.eq(expectedData);
        done();
      });
    });
  });

  describe('getCurrentBalance', () => {
    describe('balanceAtDate', () => {
      beforeEach((done) => {
        sinon.stub(Contract.prototype, 'balanceAtDate').yields(null, testUtils.randomInt, testUtils.randomInt);
        done();
      });
      it('should call balanceAtDate method with correct params', (done) => {
        // Arrange
        const options = {};
        const currentDate = new Date();
        // Act
        contract.getCurrentBalance((err, advanceRemaining, balance) => {
          // Assert
          expect(contract.balanceAtDate.called).to.be.true;
          expect(contract.balanceAtDate.calledWith(currentDate, options)).to.be.true;
          done();
        });
      });
      describe('if contract is a profit-share or profit-share flex', () => {
        beforeEach((done) => {
          contract.type = 'Profit Share';
          done();
        });
        it('should call balanceAtDate with the correct params', (done) => {
          // Arrange
          const options = { excludeAdvance: true, excludeReserves: true };
          const currentDate = new Date();
          // Act
          contract.getCurrentBalance((err, advanceRemaining, balance) => {
            // Assert
            expect(contract.balanceAtDate.called).to.be.true;
            expect(contract.balanceAtDate.calledWith(currentDate, options)).to.be.true;
            done();
          });
        });
      });
    });
    describe('When contract type is not profit share', () => {
      let transactions; let transLean; let correctBalance;
      beforeEach((done) => {
        transactions = [
          new Transaction({ date: testUtils.randomDate(), amount: testUtils.randomInt(), type: 'Advance' }),
          new Transaction({ date: testUtils.randomDate(), amount: testUtils.randomInt() }),
        ];
        correctBalance = transactions[0].amount + transactions[1].amount + contract.openingBalance;

        transLean = sinon.stub().resolves(transactions);

        sinon.stub(Transaction, 'find');
        Transaction.find.returns({ lean: transLean });
        done();
      });
      it('should return the current balance including reserves and advances', (done) => {
        // Act
        contract.getCurrentBalance((err, advanceRemaining, balance) => {
          // Assert
          expect(advanceRemaining).to.eq(null);
          expect(balance).to.eq(correctBalance);
          done();
        });
      });
    });
    describe('When contract type is not profit share', () => {
      let transactions; let transLean; let correctBalance; let advance1; let advance2;
      beforeEach((done) => {
        contract.type = 'Profit Share';
        advance1 = testUtils.randomInt();
        advance2 = testUtils.randomInt();
        transactions = [
          new Transaction({ date: testUtils.randomDate(), amount: advance1, type: 'Advance' }),
          new Transaction({ date: testUtils.randomDate(), amount: advance2, type: 'Advance Recoupment' }),
        ];
        correctBalance = advance1 + advance2;

        transLean = sinon.stub().resolves(transactions);

        sinon.stub(Transaction, 'find');
        Transaction.find.returns({ lean: transLean });
        done();
      });
      it('should return the current balance including reserves and advances', (done) => {
        // Act
        contract.getCurrentBalance((err, advanceRemaining, balance) => {
          // Assert
          expect(advanceRemaining).to.eq(correctBalance);
          done();
        });
      });
    });
  });

  describe('createCsvExport', () => {
    let filePath; let filter; let clientId; let paymentTier;
    beforeEach((done) => {
      filter = {};
      filePath = testUtils.randomString();
      clientId = testUtils.randomId();
      paymentTier = testUtils.randomString();

      sinon.stub(ContractCsv, 'publishingContratsForCsv');
      ContractCsv.publishingContratsForCsv.yields(null, filePath);

      sinon.stub(ContractCsv, 'mechanicalContratsForCsv');
      ContractCsv.mechanicalContratsForCsv.yields(null, filePath);

      sinon.stub(ContractCsv, 'labelContractsForCsv');
      ContractCsv.labelContractsForCsv.yields(null, filePath);
      done();
    });

    describe('When clientType is Publisher', () => {
      it('shoudl call ContractCsv.publishingContratsForCsv', (done) => {
        // Arrange
        const clientType = 'Publisher';
        const contractType = testUtils.randomString();
        // Act
        Contract.createCsvExport(filter, clientId, paymentTier, clientType, contractType, () => {
          // Assert
          expect(ContractCsv.publishingContratsForCsv.called).to.be.true;
          expect(ContractCsv.publishingContratsForCsv.calledWith(filter, clientId, paymentTier)).to.be.true;
          done();
        });
      });
    });
    describe('When contractType is Mechanical', () => {
      it('shoudl call ContractCsv.mechanicalContratsForCsv', (done) => {
        // Arrange
        const clientType = testUtils.randomString();
        const contractType = 'Mechanical';
        // Act
        Contract.createCsvExport(filter, clientId, paymentTier, clientType, contractType, () => {
          // Assert
          expect(ContractCsv.mechanicalContratsForCsv.called).to.be.true;
          expect(ContractCsv.mechanicalContratsForCsv.calledWith(filter, clientId)).to.be.true;
          done();
        });
      });
    });
    describe('When clientType is NOT Mechanical or Publisher', () => {
      it('shoudl call ContractCsv.labelContractsForCsv', (done) => {
        // Arrange
        const clientType = testUtils.randomString();
        const contractType = testUtils.randomString();
        // Act
        Contract.createCsvExport(filter, clientId, paymentTier, clientType, contractType, () => {
          // Assert
          expect(ContractCsv.labelContractsForCsv.called).to.be.true;
          expect(ContractCsv.labelContractsForCsv.calledWith(filter, clientId, paymentTier)).to.be.true;
          done();
        });
      });
    });
  });

  describe('mapCrossContractCondition', () => {
    it('should exist', (done) => {
      // Assert
      expect(Contract.mapCrossContractCondition).to.exist;
      done();
    });

    it("should map the value 'Positive'", (done) => {
      // Arrange
      const value = 'Positive';
      const expectedResult = 'Balance is Positive';
      // Act
      const result = Contract.mapCrossContractCondition(value);
      // Assert
      expect(expectedResult).to.eq(result);
      done();
    });

    it("should map the value 'Negative'", (done) => {
      // Arrange
      const value = 'Negative';
      const expectedResult = 'Balance is Negative';
      // Act
      const result = Contract.mapCrossContractCondition(value);
      // Assert
      expect(expectedResult).to.eq(result);
      done();
    });

    it("should map the value 'Always'", (done) => {
      // Arrange
      const value = 'Always';
      const expectedResult = 'Always transfer Balance';
      // Act
      const result = Contract.mapCrossContractCondition(value);
      // Assert
      expect(expectedResult).to.eq(result);
      done();
    });

    it("should map the value 'Balance is Positive'", (done) => {
      // Arrange
      const value = 'Balance is Positive';
      const expectedResult = 'Positive';
      // Act
      const result = Contract.mapCrossContractCondition(value);
      // Assert
      expect(expectedResult).to.eq(result);
      done();
    });

    it("should map the value 'Balance is Negative'", (done) => {
      // Arrange
      const value = 'Balance is Negative';
      const expectedResult = 'Negative';
      // Act
      const result = Contract.mapCrossContractCondition(value);
      // Assert
      expect(expectedResult).to.eq(result);
      done();
    });

    it("should map the value 'Always transfer Balance'", (done) => {
      // Arrange
      const value = 'Always transfer Balance';
      const expectedResult = 'Always';
      // Act
      const result = Contract.mapCrossContractCondition(value);
      // Assert
      expect(expectedResult).to.eq(result);
      done();
    });
  });

  describe('matchContractToLabels', () => {
    let release;
    let track;

    let releaseFindStub;
    let trackFindStub;

    beforeEach((done) => {
      release = new Release({
        salesReturnsRights: [],
        costsRights: [],
      });

      track = new Track({
        isrc: testUtils.randomString(),
        salesReturnsRights: [],
        costsRights: [],
      });

      releaseFindStub = sinon.stub(Release, 'find');
      releaseFindStub.resolves([release]);

      trackFindStub = sinon.stub(Track, 'find');
      trackFindStub.resolves([track]);

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(contract.matchContractToLabels).to.exist;
      done();
    });

    it('should call Release.find with the right filter', (done) => {
      // Act
      contract.matchContractToLabels(() => {
        // Assert
        expect(releaseFindStub.called).to.be.true;
        expect(releaseFindStub.calledWith({
          clientId: contract.clientId,
          salesReturnsRights: { $size: 0 },
          costsRights: { $size: 0 },
          $or: [
            { label: { $in: contract.labels } },
            { label: contract.name },
          ],
        })).to.be.true;

        done();
      });
    });

    it('should add the contract to the release.salesReturnsRights', (done) => {
      // Act
      contract.matchContractToLabels(() => {
        // Assert
        expect(testUtils.areArraysOfObjectsEqual([{ contractId: contract._id.toString(), percentage: 100 }], release.salesReturnsRights)).to.be.true;

        done();
      });
    });

    it('should add the contract to the release.costsRights', (done) => {
      // Act
      contract.matchContractToLabels(() => {
        // Assert
        expect(testUtils.areArraysOfObjectsEqual([{ contractId: contract._id.toString(), percentage: 100 }], release.costsRights)).to.be.true;

        done();
      });
    });

    it('should call Track.find with the right filter', (done) => {
      // Act
      contract.matchContractToLabels(() => {
        // Assert
        expect(trackFindStub.called).to.be.true;
        expect(trackFindStub.calledWith({
          clientId: contract.clientId,
          salesReturnsRights: { $size: 0 },
          costsRights: { $size: 0 },
          $or: [
            { label: { $in: contract.labels } },
            { label: contract.name },
          ],
        })).to.be.true;

        done();
      });
    });

    it('should add the contract to the track.salesReturnsRights', (done) => {
      // Act
      contract.matchContractToLabels(() => {
        // Assert
        expect(testUtils.areArraysOfObjectsEqual([{ contractId: contract._id.toString(), percentage: 100 }], track.salesReturnsRights)).to.be.true;

        done();
      });
    });

    it('should add the contract to the track.costsRights', (done) => {
      // Act
      contract.matchContractToLabels(() => {
        // Assert
        expect(testUtils.areArraysOfObjectsEqual([{ contractId: contract._id.toString(), percentage: 100 }], track.costsRights)).to.be.true;

        done();
      });
    });
  });

  describe('uniqueAliases', () => {
    it('should exist', (done) => {
      // Assert
      expect(contract.uniqueAliases).to.exist;
      done();
    });

    it('should return a list of unique aliases', (done) => {
      // Arrange
      const alias = testUtils.randomString();
      contract.aliases = [alias, alias];
      // Act
      contract.uniqueAliases();
      // Assert
      expect(contract.aliases).to.deep.eq([alias]);
      done();
    });
  });

  describe('setPartitionNo', () => {
    it('should exist', (done) => {
      // Assert
      expect(contract.setPartitionNo).to.exist;
      done();
    });

    it('should set the partitionNo to 0 when no name', (done) => {
      // Arrange
      const newContract = new Contract();
      newContract.name = null;
      // Act
      newContract.setPartitionNo();
      // Assert
      expect(newContract.partitionNo).to.eq(0);
      done();
    });

    it('should set the partitionNo to charCodeAt(0) when it\'s < 97', (done) => {
      // Arrange
      const newContract = new Contract();
      newContract.name = 'f';
      // Act
      newContract.setPartitionNo();
      // Assert
      expect(newContract.partitionNo).to.eq(5);
      done();
    });

    it('should set the partitionNo to charCodeAt(0) when it\'s > 97', (done) => {
      // Arrange
      const newContract = new Contract();
      newContract.name = '√';
      // Act
      newContract.setPartitionNo();
      // Assert
      expect(newContract.partitionNo).to.eq(newContract.name.toLowerCase().charCodeAt(0) - 97);
      done();
    });

    it('should not change the partitionNo after it is originally set', (done) => {
      // Arrange
      const newContract = new Contract();
      newContract.name = 'hello';
      newContract.setPartitionNo();
      const { partitionNo } = newContract;
      // Act
      newContract.name = 'world';
      newContract.setPartitionNo();
      // Assert
      expect(newContract.partitionNo).to.eq(partitionNo);
      done();
    });
  });

  describe('cleanUpNumber', () => {
    it('should exist', (done) => {
      // Assert
      expect(Contract.cleanUpNumber).to.exist;
      done();
    });

    it('should return a cleaned up the number', (done) => {
      // Arrange
      const number = testUtils.randomInt();
      const numStr = `${number},${number}.${number}`;
      // Act
      const result = Contract.cleanUpNumber(numStr);
      // Assert
      expect(result).to.eq(`${number}${number}.${number}`);
      done();
    });
  });

  describe('cleanUpNumbersInArray', () => {
    it('should exist', (done) => {
      // Assert
      expect(Contract.cleanUpNumbersInArray).to.exist;
      done();
    });

    it('should return an array of cleaned up numbers', (done) => {
      // Arrange
      const number = testUtils.randomInt();
      const numStr = `${number},${number}.${number}`;
      const numberResult = testUtils.randomInt();
      const terms = [{
        term1: numStr,
      }];
      const items = ['term1'];
      const expectedResult = [{
        term1: numberResult,
      }];
      const cleanUpNumberStub = sinon.stub(Contract, 'cleanUpNumber');
      cleanUpNumberStub.returns(numberResult);

      // Act
      const result = Contract.cleanUpNumbersInArray(terms, items);

      // Assert
      expect(result).to.deep.eq(expectedResult);

      cleanUpNumberStub.restore();

      done();
    });
  });

  describe('isObjectPopulated', () => {
    it('should exist', (done) => {
      // Assert
      expect(Contract.__get__('isObjectPopulated')).to.exist;
      done();
    });

    describe('when the object is empty', () => {
      it('should return false', (done) => {
        // Arrange
        const obj = {};
        // Act
        const result = Contract.__get__('isObjectPopulated')(obj);
        // Assert
        expect(result).to.be.false;
        done();
      });
    });

    describe('when the object is not empty', () => {
      it('should return true', (done) => {
        // Arrange
        const obj = { field: testUtils.randomString() };
        // Act
        const result = Contract.__get__('isObjectPopulated')(obj);
        // Assert
        expect(result).to.be.true;
        done();
      });
    });
  });

  describe('processCategories', () => {
    const clientCategory = testUtils.randomString();
    const client = {
      contractCategories: [clientCategory, testUtils.randomString()],
    };
    const index = testUtils.randomInt();
    const errors = [];

    it('should exist', (done) => {
      // Assert
      expect(ContractsImporter.__get__('processCategories')).to.exist;
      done();
    });

    describe('when data.contractCategories is passed', () => {
      // Arrange
      const overwriteBlanks = false;
      describe("when a category doesn't match the client's list of categories ", () => {
        // Arrange
        const data = {
          contractCategories: [testUtils.randomString()],
        };
        it('should return an error', async () => {
          // Act
          await ContractsImporter.__get__('processCategories')({ data, contract, client, index, overwriteBlanks, errors });
          expect(errors.includes(`Overview Line ${index + 3}: Category doesn't match list`)).to.be.true;
        });
      });
      describe("when a category matches the client's list of categories ", () => {
        // Arrange
        const data = {
          contractCategories: [clientCategory],
        };
        it('should add the category to contract.contractCategories', async () => {
          // Act
          await ContractsImporter.__get__('processCategories')({ data, contract, client, index, overwriteBlanks, errors });
          expect(contract.contractCategories.includes(clientCategory)).to.be.true;
        });
      });
    });

    describe('when data.contractCategories is not passed and overwriteBlanks is true', () => {
      // Arrange
      const overwriteBlanks = true;
      describe("when a category doesn't match the client's list of categories ", () => {
        // Arrange
        const data = {
          contractCategories: [testUtils.randomString()],
        };
        it('should return an error', async () => {
          // Act
          await ContractsImporter.__get__('processCategories')({ data, contract, client, index, overwriteBlanks, errors });
          expect(errors.includes(`Overview Line ${index + 3}: Category doesn't match list`)).to.be.true;
        });
      });

      describe("when a category matches the client's list of categories ", () => {
        // Arrange
        const data = {
          contractCategories: [clientCategory],
        };
        it('should add the category to contract.contractCategories', async () => {
          // Act
          await ContractsImporter.__get__('processCategories')({ data, contract, client, index, overwriteBlanks, errors });
          expect(contract.contractCategories.includes(clientCategory)).to.be.true;
        });
      });
    });
  });

  describe('processPayee', () => {
    const errors = [];
    const client = {
      _id: testUtils.randomId(),
    };

    const payee = {
      _id: testUtils.randomId(),
      clientId: client._id,
    };
    const index = testUtils.randomInt();

    let payeeFindByIdStub;
    let payeeFindOneStub;

    beforeEach((done) => {
      payeeFindByIdStub = sinon.stub(Payee, 'findById');
      payeeFindByIdStub.resolves(payee);

      payeeFindOneStub = sinon.stub(Payee, 'findOne');
      payeeFindOneStub.resolves(payee);
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ContractsImporter.__get__('processPayee')).to.exist;
      done();
    });

    describe('when data.payeeId is not passed', () => {
      describe('when overwriteBlanks is true', () => {
        it('should return an [] contract.payees', async () => {
          // Arrange
          const data = {};
          const overwriteBlanks = true;
          // Act
          await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
          expect(contract.payees).to.deep.eq([]);
        });
      });
    });

    describe('when data.payeeId is passed', () => {
      // Arrange
      const data = { payeeId: payee._id };
      const overwriteBlanks = testUtils.randomBoolean();

      it('should call Payee.findById with data.payeeId', async () => {
        // Act
        await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
        expect(payeeFindByIdStub.called).to.be.true;
        expect(payeeFindByIdStub.calledWith(data.payeeId)).to.be.true;
      });

      describe('when Payee.findById returns a payee', () => {
        describe('when payee.clientId == client._id', () => {
          it('should assign payee._id to contract.payeeId', async () => {
            // Arrange
            payee.clientId = client._id.toString();
            // Act
            await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
            expect(contract.payees[0].payeeId).to.be.eq(payee._id.toString());
          });
        });

        describe('when payee.clientId != client._id', () => {
          it("shouldn't assign a contract.payeeId", async () => {
            // Arrange
            payee.clientId = testUtils.randomId();
            // Act
            await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
            expect(contract.payeeId).to.not.eq(payee._id.toString());
          });
        });
      });

      describe("when Payee.findById doesn't return a payee", () => {
        it('should call Payee.findOne with the clientId and payee name', async () => {
          // Arrange
          payeeFindByIdStub.resolves();
          // Act
          await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
          expect(payeeFindOneStub.called).to.be.true;
          expect(payeeFindOneStub.calledWith({ clientId: client._id.toString(), name: data.payeeId })).to.be.true;
        });

        describe('when Payee.findOne returns a payee', () => {
          it('should assign the payee._id to contract.payeeId', async () => {
            // Arrange
            payeeFindByIdStub.resolves();
            payeeFindOneStub.resolves(payee);
            // Act
            await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
            expect(contract.payees[0].payeeId).to.eq(payee._id.toString());
          });
        });

        describe("when Payee.findOne doesn't return a payee", () => {
          it('should return an error', async () => {
            // Arrange
            payeeFindByIdStub.resolves();
            payeeFindOneStub.resolves();
            // Act
            await ContractsImporter.__get__('processPayee')({ data, contract, client, index, overwriteBlanks, errors });
            expect(errors.includes(`Overview Line ${index + 3}: Payee doesn't exist`)).to.be.true;
          });
        });
      });
    });
  });

  describe('processCompany', () => {
    const errors = [];
    const client = {
      _id: testUtils.randomId(),
    };

    const company = {
      _id: testUtils.randomId(),
      clientId: client._id,
    };
    const index = testUtils.randomInt();

    let companyFindByIdStub;
    let companyFindOneStub;

    beforeEach((done) => {
      companyFindByIdStub = sinon.stub(Company, 'findById');
      companyFindByIdStub.resolves(company);

      companyFindOneStub = sinon.stub(Company, 'findOne');
      companyFindOneStub.resolves(company);
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ContractsImporter.__get__('processCompany')).to.exist;
      done();
    });

    describe('when data.companyId is not passed', () => {
      describe('when overwriteBlanks is true', () => {
        it('should return an empty contract.companyId', async () => {
          // Arrange
          const data = {};
          const overwriteBlanks = true;
          // Act
          await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
          expect(contract.companyId).to.eq('');
        });
      });
    });

    describe('when data.companyId is passed', () => {
      // Arrange
      const data = { companyId: company._id };
      const overwriteBlanks = testUtils.randomBoolean();

      it('should call Company.findById with data.companyId', async () => {
        // Act
        await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
        expect(companyFindByIdStub.called).to.be.true;
        expect(companyFindByIdStub.calledWith(data.companyId)).to.be.true;
      });

      describe('when Company.findById returns a company', () => {
        describe('when company.clientId = client._id', () => {
          it('should assign the company._id to contract.companyId', async () => {
            // Arrange
            company.clientId = client._id.toString();
            // Act
            await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
            expect(contract.companyId).to.eq(company._id.toString());
          });
        });
        describe('when company.clientId != client._id', () => {
          it("shouldn't assign a contract.companyId", async () => {
            // Arrange
            company.clientId = testUtils.randomId();
            // Act
            await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
            expect(contract.companyId).to.not.eq(company._id.toString());
          });
        });
      });

      describe("when Company.findById doesn't return a company", () => {
        it('should call Company.findOne with the clientId and company name', async () => {
          // Arrange
          companyFindByIdStub.resolves();
          // Act
          await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
          expect(companyFindOneStub.called).to.be.true;
          expect(companyFindOneStub.calledWith({ clientId: client._id.toString(), name: data.companyId })).to.be.true;
        });

        describe('when Company.findOne returns a company', () => {
          it('should assign the payee._id to contract.companyId', async () => {
            // Arrange
            companyFindByIdStub.resolves();
            companyFindOneStub.resolves(company);
            // Act
            await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
            expect(contract.companyId).to.eq(company._id.toString());
          });
        });

        describe("when Company.findOne doesn't return a company", () => {
          it('should return an error', async () => {
            // Arrange
            companyFindByIdStub.resolves();
            companyFindOneStub.resolves();
            // Act
            await ContractsImporter.__get__('processCompany')({ data, contract, client, index, overwriteBlanks, errors });
            expect(errors.includes(`Overview Line ${index + 3}: Company doesn't exist`)).to.be.true;
          });
        });
      });
    });
  });

  describe('processContractTermGroups', () => {
    const clientId = testUtils.randomId();
    const contractTermGroupResult = [{
      _id: testUtils.randomId(),
      name: testUtils.randomString(),
      type: testUtils.randomString(),
    }];
    const contractTermMappings = {};

    let contractTermGroupStub;

    beforeEach((done) => {
      contractTermGroupStub = sinon.stub(ContractTermGroup, 'find');
      contractTermGroupStub.resolves(contractTermGroupResult);
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(ContractsImporter.__get__('processContractTermGroups')).to.exist;
      done();
    });

    it('should call ContractTermGroup.find with clientId ', async () => {
      // Act
      await ContractsImporter.__get__('processContractTermGroups')({ contractTermMappings, clientId });
      // Assert
      expect(contractTermGroupStub.called).to.be.true;
      expect(contractTermGroupStub.calledWith({ clientId }, { name: 1, type: 1 })).to.be.true;
    });

    describe('when ContractTermGroup.find returns a result', () => {
      it('should assign the result to processContractTermGroups', async () => {
        // Arrange
        const expectedMapping = contractTermGroupResult[0]._id.toString();
        // Act
        await ContractsImporter.__get__('processContractTermGroups')({ contractTermMappings, clientId });
        // Assert
        expect(contractTermMappings[contractTermGroupResult[0].type][contractTermGroupResult[0].name]).to.eq(expectedMapping);
      });
    });
  });

  describe.skip('processTerms', () => {
    describe('when no tabData', () => {
      it('should return an empty callback');
    });

    describe('when tabData is passed', () => {
      describe('when overwriteBlanks is true', () => {
        it('should set contract[fieldName] to []');
      });

      describe('when item.contractName !== contract.name', () => {
        it('should return an empty callback');
      });

      describe('when item.contractName === contract.name', () => {
        describe('when [\'World\', \'world\'].includes(item.territory)', () => {
          it('should set item.territory to WW');
        });

        it('should call TerritoryGroup.findOne with the territory name and clientId');

        describe('when TerritoryGroup.findOne returns a group', () => {
          it('should set item.territory to the returned group');
        });

        describe('when TerritoryGroup.findOne doesn\'t return a group', () => {
          describe('when territories.includes(item.territory)', () => {
            it('should return an error');
          });
        });

        describe('when fieldName === \'costsTerms\'', () => {
          describe('when !client.costTypes.includes(item.type) && item.type !== \'All\'', () => {
            describe('when !ObjectId.isValid(item.type) && contractTermMappings[\'Cost Type\'] && contractTermMappings[\'Cost Type\'][item.type]', () => {
              it('should set item.type to  contractTermMappings[\'Cost Type\'][item.type]');
            });
            describe('when ObjectId.isValid(item.type) || !contractTermMappings[\'Cost Type\'] || !contractTermMappings[\'Cost Type\'][item.type]', () => {
              it('should return an error');
            });
          });
        });

        describe('when fieldName !== \'costsTerms\'', () => {
          describe('when !client.catalogueGroups.includes(item.catalogueGroup) && item.catalogueGroup !== \'All\'', () => {
            it('should return an error');
          });

          describe('when !client.distributionChannels.includes(item.channel) && item.channel !== \'All\'', () => {
            describe('when contractTermMappings[\'Distribution Channel\'] && contractTermMappings[\'Distribution Channel\'][item.channel]', () => {
              it('should set item.channel to contractTermMappings[\'Distribution Channel\'][item.channel]');
            });

            describe('when !contractTermMappings[\'Distribution Channel\'] || !contractTermMappings[\'Distribution Channel\'][item.channel]', () => {
              it('should return an error');
            });
          });

          describe('when !client.configurations.includes(item.configuration) && item.configuration !== \'All\'', () => {
            describe('when contractTermMappings.Configuration && contractTermMappings.Configuration[item.configuration]', () => {
              it('should set item.configuration to contractTermMappings.Configuration[item.configuration]');
            });

            describe('when !contractTermMappings.Configuration || !contractTermMappings.Configuration[item.configuration]', () => {
              it('should return an error');
            });
          });

          describe('when contractTemplateType !== \'Publisher\'', () => {
            describe('when !client.priceCategories.includes(item.priceCategory) && item.priceCategory && item.priceCategory !== \'All\'', () => {
              describe('when contractTermMappings[\'Price Category\'] && contractTermMappings[\'Price Category\'][item.priceCategory]', () => {
                it('should set item.priceCategory to contractTermMappings[\'Price Category\'][item.priceCategory]');
              });

              describe('when !contractTermMappings[\'Price Category\'] || !contractTermMappings[\'Price Category\'][item.priceCategory]', () => {
                it('should return an error');
              });
            });
          });

          describe('when !client.sources.includes(item.source) && item.source && item.source !== \'All\'', () => {
            describe('when contractTermMappings.Source && contractTermMappings.Source[item.source]', () => {
              it('should set item.source to contractTermMappings.Source[item.source]');
            });

            describe('when !contractTermMappings.Source || contractTermMappings.Source[item.source]', () => {
              it('should return an error');
            });
          });
        });

        describe('when fieldName !== \'salesTerms\' && contractTemplateType === \'Standard\'', () => {
          describe('when ![\'PPD\', \'Gross Receipts\', \'Net Receipts\', \'Unit Price\', \'Retail Price\', \'Unit Rate\', \'Fixed Unit Rate\'].includes(item.type)', () => {
            it('should return an error');
          });
        });

        describe('when [\'salesTerms\', \'deductionsTerms\'].includes(fieldName) && contractTemplateType === \'Publisher\'', () => {
          describe('when ![\'Work\', \'Contract\', \'All\'].includes(item.catType) || !item.catType', () => {
            it('should return an error');
          });
        });

        describe('when [\'salesTerms\', \'deductionsTerms\'].includes(fieldName) && contractTemplateType !== \'Publisher\'', () => {
          describe('when ![\'Release\', \'Track\', \'All\'].includes(item.catType) || !item.catType', () => {
            it('should return an error');
          });
        });

        describe('when fieldName === \'deductionsTerms\' || fieldName === \'withholdingTaxTerms\'', () => {
          describe('when ![\'Percentage\', \'Unit Rate\'].includes(item.deductionBasis)', () => {
            it('should return an error');
          });
          describe('when ![\'Pre-Calculation\', \'Post-Calculation\'].includes(item.type)', () => {
            it('should return an error');
          });
        });

        describe('when fieldName === \'mechanicalTerms\'', () => {
          describe('when ![\'Statutory Rate\', \'Min Statutory Rate\', \'Unit Rate\', \'PPD\', \'Net Receipts\'].includes(item.type)', () => {
            it('should return an error');
          });
          describe('when !item.rateBasis && item.rateBasis !== \'\' && ![\'US\', \'CA\'].includes(item.rateBasis)', () => {
            it('should return an error');
          });
        });

        describe('when fieldName === \'mechanicalContractTerms\'', () => {
          describe('when ![\'Statutory Rate\', \'Min Statutory Rate\', \'Unit Rate\', \'PPD\', \'Net Receipts\'].includes(item.type)', () => {
            it('should return an error');
          });
          describe('when !item.rateBasis && item.rateBasis !== \'\' && ![\'US\', \'CA\'].includes(item.rateBasis)', () => {
            it('should return an error');
          });
        });

        describe('when fieldName === \'salesTerms\' && contractTemplateType === \'Publisher\'', () => {
          describe('when ![\'Gross Receipts\', \'Net Receipts\'].includes(item.type)', () => {
            it('should return an error');
          });
        });

        describe('when fieldName === \'salesTerms\' || fieldName === \'deductionsTerms\' || fieldName === \'withholdingTaxTerms\' || fieldName === \'costsTerms\'', () => {
          describe('when item.escalationTrackers && item.escalationTrackers.length !== 0', () => {
            describe('when !contract.escalationTracking', () => {
              it('should return an error');
            });

            describe('when an escalation tracker doesn\'t match the list', () => {
              it('should return an error');
            });
          });
        });
      });
    });
  });
});
