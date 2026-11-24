process.env.NODE_ENV = 'test';
require('../../../models/db');
const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { expect } = require('chai');
const moment = require('moment');
const sinon = require('sinon');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const CwrDelivery = require('../../../models/cwrDelivery');
const DeliveredWork = require('../../../models/deliveredWork');
const Work = require('../../../models/work');
const Client = require('../../../models/client');
const TerritoryGroup = require('../../../models/territoryGroup');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');

let delivery;
let work;

const client = {
  _id: randomId(),
  name: 'Test Client',
};

const deliveryPartner = {
  _id: randomId(),
  territory: ['WW'],
  insertion: {},
};

const curveUser = {
  _id: randomId(),
  internal: false,
  clientId: client._id,
};

describe('CWR Delivery', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    work = new Work({
      title: randomString(),
      rightsChain: [
        {
          territory: ['WW'],
          children: [
            {
              type: 'Publisher',
              publisherId: randomId(),
            },
          ],
        },
      ],
    });
    delivery = new CwrDelivery();
    delivery.clientId = client._id;
    delivery.deliveryPartnerId = deliveryPartner._id;
    delivery.workIds = [work._id.toString()];
    delivery.outputFormat = 'CWR';
    sinon.stub(fileManager, 'uploadToS3');
    fileManager.uploadToS3.yields(null, null);
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

  describe('updateWorkIds', () => {
    describe('CwrDelivery.findById returns data', () => {
      it('should call CwrDelivery.findById');
      it('should call CwrDelivery.findById with the correct parameter');
      describe('returned work workIds length > 0', () => {
        it('should merge return workIds with passed workIds');
        it('should remove duplicates from merged workIds');
      });
      describe('CwrDelivery.findByIdAndUpdate', () => {
        it('should call CwrDelivery.findByIdAndUpdate');
        it('should call CwrDelivery.findByIdAndUpdate with the correct parameter');
        it('should return status 200');
        it('should return correct updated cwrDelivery');
      });
      describe('CwrDelivery.findByIdAndUpdate returns an error', () => {
        it('should return status 500');
        it('should return correct error message');
      });
    });
    describe('CwrDelivery.findById returns an error', () => {
      it('should return status 500');
      it('should return correct error message');
    });
    describe('CwrDelivery.findById returns no data', () => {
      it('should return status 404');
      it('should return correct error message');
    });
  });

  describe('getSpecificDeliveries', () => {
    beforeEach((done) => {
      sinon.stub(CwrDelivery, 'find');
      CwrDelivery.find.resolves([]);
      done();
    });
    afterEach((done) => {
      sinon.restore();
      done();
    });

    describe('CwrDelivery.find returns data', () => {
      it('should call CwrDelivery.find', async () => {
        await CwrDeliveryController.getSpecificDeliveries({ req: { query: {}, curveUser }, CwrDelivery });
        expect(CwrDelivery.find.called).to.equal(true);
      });
      describe('if params clientId', () => {
        it('should call CwrDelivery.find with the correct parameter', async () => {
          await CwrDeliveryController.getSpecificDeliveries({ req: { query: {}, curveUser }, CwrDelivery });
          expect(CwrDelivery.find.args[0][0]).to.eql({ clientId: curveUser.clientId });
        });
      });
      describe('if params status', () => {
        it('should call CwrDelivery.find with the correct parameter', async () => {
          await CwrDeliveryController.getSpecificDeliveries({ req: { query: { status: 'Approved' }, curveUser }, CwrDelivery });
          expect(CwrDelivery.find.args[0][0]).to.eql({ status: 'Approved', clientId: curveUser.clientId });
        });
      });
      describe('if params filterType', () => {
        it('should call CwrDelivery.find with the correct parameter', async () => {
          await CwrDeliveryController.getSpecificDeliveries({ req: { query: { filterType: 'Approved' }, curveUser }, CwrDelivery });
          expect(CwrDelivery.find.args[0][0]).to.eql({ filterType: 'Approved', clientId: curveUser.clientId });
        });
      });
      it('should return correct deliveries', async () => {
        const { specificDeliveries } = await CwrDeliveryController.getSpecificDeliveries({ req: { query: { status: 'Approved' }, curveUser }, CwrDelivery });
        expect(CwrDelivery.find.called).to.equal(true);
        expect(specificDeliveries).to.not.be.undefined;
      });
    });
  });

  describe('getWorksForDelivery', () => {
    let territoryGroup;

    beforeEach((done) => {
      // Work
      sinon.stub(Work, 'find').returns({ lean: sinon.stub().resolves([work]) });
      sinon.stub(Work, 'updateMany');
      Work.updateMany.resolves();

      // Territory Group
      territoryGroup = new TerritoryGroup();
      sinon.stub(TerritoryGroup, 'findById');
      TerritoryGroup.findById.returns({ select: sinon.stub().returnsThis(), lean: sinon.stub().resolves(territoryGroup) });
      sinon.stub(TerritoryGroup, 'find').returns({ select: sinon.stub().returnsThis(), lean: sinon.stub().resolves([territoryGroup]) });

      // Publisher
      const publisher = new Publisher();
      sinon.stub(Publisher, 'findById');
      Publisher.findById.resolves(publisher);
      sinon.stub(Publisher, 'find');
      Publisher.find.resolves(publisher);

      // Composer
      sinon.stub(Composer, 'findById');
      Composer.findById.resolves(new Composer());

      done();
    });
    afterEach((done) => {
      sinon.restore();
      done();
    });

    it('should get works for a delivery', async () => {
      // Arrange
      const deliveryDataSpy = sinon.spy(CwrDeliveryController, 'getWorkDeliveryData');
      const originalChain = [
        {
          territory: territoryGroup._id,
          children: [{ name: 'Publisher 0', contractType: 'Original Publisher', children: [] }],
        },
      ];
      const partnerChains = [
        {
          deliveryPartnerId: deliveryPartner._id,
          rightsChain: [
            {
              name: 'Publisher 1',
              type: 'Publisher',
              contractType: 'Original Publisher',
              children: [
                {
                  name: 'Composer 1',
                  type: 'Composer',
                  contractType: 'Lyrics and Music',
                },
              ],
            },
          ],
        },
      ];
      work.rightsChain = originalChain;
      work.partnerRightsChains = partnerChains;
      delivery.territory = territoryGroup._id;
      // Act
      await CwrDeliveryController.getWorksForDelivery({
        delivery,
        deliveryPartner,
        territory: null,
        filter: {},
        options: { partnerChainsEnabled: true },
        limit: 100,
        Work,
        TerritoryGroup,
      });
      // Assert

      // Format is CWR so this should be false (not Catalogue Shipment)
      expect(deliveryDataSpy.args[0][0].isCatShipment).to.equal(false);
      expect(deliveryDataSpy.args[0][0].deliveryPartner).to.eql(deliveryPartner);
      // Partner Chains feature is enabled
      expect(deliveryDataSpy.args[0][0].partnerChainsEnabled).to.equal(true);
      // Rights chain should have been swapped out for the Partner Chain
      expect(work.rightsChain).to.not.eql(originalChain);
    });
  });
});
