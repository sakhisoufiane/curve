process.env.NODE_ENV = 'test';

const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const rewire = require('rewire');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const Client = require('../../../models/client');
const IswcDelivery = require('../../../models/iswcDelivery');
const DeliveryPartner = require('../../../models/deliveryPartner');

describe('IswcDeliveryController', () => {
  logger.info('\n\n**** .test/unit/controllers/iswcDelivery.unit.test.js');

  let Controller;

  beforeEach(() => {
    sinon.stub(Client, 'findById');
    Controller = rewire('../../../controllers/iswcDelivery');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getIswcDeliveries', () => {
    it('should return iswc deliveries', async () => {
      const clientId = randomId();
      const deliveryPartnerName = randomString();
      const outputFormat = randomString();
      const iswcDeliveries = [{ _id: randomId(), name: randomString() }, { _id: randomId(), name: randomString() }];
      const deliveriesMock = {
        docs: iswcDeliveries,
        totalDocs: randomInt(),
        limit: randomInt(),
        page: randomInt(),
        totalPages: randomInt(),
      };
      const curveUser = { clientId, id: clientId };
      const req = { curveUser, query: { page: randomInt(1, 10), limit: randomInt(1, 10), clientId } };
      const expectedResult = {
        iswcDeliveries: iswcDeliveries.map((item) => ({ ...item, deliveryPartnerName, outputFormat })),
        meta: { total: deliveriesMock.totalDocs, totalPages: deliveriesMock.totalPages },
      };
      let result = {};
      const res = { json: sinon.spy(), status: sinon.stub().returns({ json: (response) => { result = response; } }) };

      sinon.stub(IswcDelivery, 'paginate');
      IswcDelivery.paginate.resolves(deliveriesMock);

      sinon.stub(DeliveryPartner, 'findById');
      DeliveryPartner.findById.resolves({ name: deliveryPartnerName, outputFormat });

      sinon.stub(UserAccess, 'allowReadAccessToAll');
      UserAccess.allowReadAccessToAll.returns(true);

      await Controller.getIswcDeliveries({ req, res });

      expect(IswcDelivery.paginate).to.have.been.calledOnce;
      expect(DeliveryPartner.findById).to.have.been.calledTwice;
      expect(result.iswcDeliveries).to.deep.eq(expectedResult.iswcDeliveries);
      expect(result.iswcDeliveries[0]._id).to.eq(deliveriesMock.docs[0]._id);
      expect(result.iswcDeliveries[1]._id).to.eq(deliveriesMock.docs[1]._id);
      expect(result.meta).to.contain(expectedResult.meta);
    });

    it('should return forbidden error when client does not have catalogue read access', async () => {
      const clientId = randomId();
      const deliveryPartnerName = randomString();
      const outputFormat = randomString();
      const iswcDeliveries = [{ _id: randomId(), name: randomString() }, { _id: randomId(), name: randomString() }];
      const deliveriesMock = {
        docs: iswcDeliveries,
        total: randomInt(),
        limit: randomInt(),
        page: randomInt(),
        pages: randomInt(),
      };
      const curveUser = { clientId, id: clientId };
      const req = { curveUser, query: { page: randomInt(1, 10), limit: randomInt(1, 10), clientId } };
      let result = {};
      const res = { json: sinon.spy(), status: sinon.stub().returns({ json: (response) => { result = response; } }) };

      sinon.stub(IswcDelivery, 'paginate');
      IswcDelivery.paginate.resolves(deliveriesMock);

      sinon.stub(DeliveryPartner, 'findById');
      DeliveryPartner.findById.resolves({ name: deliveryPartnerName, outputFormat });

      sinon.stub(UserAccess, 'allowReadAccessToAll');
      UserAccess.allowReadAccessToAll.returns(false);

      await Controller.getIswcDeliveries({ req, res });

      expect(IswcDelivery.paginate).not.to.have.been.called;
      expect(DeliveryPartner.findById).not.to.have.been.called;
      expect(result).to.deep.eq({ message: 'Forbidden' });
    });
  });
});
