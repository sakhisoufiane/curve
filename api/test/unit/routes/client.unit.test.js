process.env.NODE_ENV = 'test';

const sinon = require('sinon');
require('../../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const chai = require('chai');
const express = require('express');
const bodyParser = require('body-parser');
const supertest = require('supertest');
const Client = require('../../../models/client');
const clientRouter = require('../../../routes/clients');

chai.use(require('sinon-chai'));

const { expect } = chai;

describe('Client Route', () => {
  logger.info('\n\n**** .test/unit/routes/client.unit.test.js');
  let findByIdStub;
  let clientId;
  let parentId;
  let app;
  let request;

  beforeEach((done) => {
    app = express();
    app.use(bodyParser.json());
    parentId = randomId();
    clientId = randomId();

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.curveUser = {
        id: randomId(),
        type: 'client',
        parentId,
        clientId,
        rights: {
          [clientId]: {
            catalogue: 'Edit',
            contracts: 'Edit',
            sales: 'Edit',
            periods: 'Edit',
            admin: true,
          },
        },
        adminType: 'Admin',
        internal: false,
      };
      next();
    });

    app.use('/clients', clientRouter);
    request = supertest(app);
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('PUT /clients/:id', () => {
    it('should not remove the parentId when user is not internal', async () => {
      // Arrange
      const mockClient = {
        _id: clientId,
        name: 'Test Client',
        parentId,

        // Mock the userForbidden method
        userForbidden: sinon.stub().returns(false),

        // Mock the save method
        save: sinon.stub().callsFake(function () {
          return new Promise((resolve) => { resolve(this); });
        }),
      };

      findByIdStub = sinon.stub(Client, 'findById').resolves({ ...mockClient });

      // Act
      const res = await request
        .put(`/clients/${clientId}`)
        .send({
          name: 'Updated Client Name',
        })
        .expect(200);

      // Assert
      expect(findByIdStub).to.have.been.calledOnceWith(clientId);
      expect(res.body).to.have.property('parentId').that.is.ok;
      expect(res.body.parentId).to.equal(parentId);
      expect(res.body.parentId).to.not.equal(null);
      expect(res.body).to.have.property('name', 'Updated Client Name');
    });
  });
});
