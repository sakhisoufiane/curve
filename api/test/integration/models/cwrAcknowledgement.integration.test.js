process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const sinon = require('sinon');
const { randomString, cleanUp, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Work = require('../../../models/work');
const Client = require('../../../models/client');
const CwrDelivery = require('../../../models/cwrDelivery');
const CwrAcknowledgement = require('../../../models/cwrAcknowledgement');
const DeliveryPartner = require('../../../models/deliveryPartner');
const DeliveryLog = require('../../../models/deliveryLog');

describe('cwrDelivery', () => {
  let client;
  let cwrAcknowledgement;
  let curveUser;
  let deliveryLog1;
  let deliveryLog2;
  let deliveryLog3;
  let cwrDelivery;
  let work1;
  let work2;
  let work3;
  let deliveryPartner;

  beforeEach(async () => {
    client = await new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();

    curveUser = { clientId: client._id.toString() };

    deliveryPartner = await new DeliveryPartner({
      clientId: client._id.toString(),
      name: randomString(),
      receivingParty: randomString(),
      territory: 'WW',
      type: 'Email',
      notificationEmail: randomString(),
    }).save();

    cwrDelivery = await new CwrDelivery({
      clientId: client._id.toString(),
      deliveryPartnerId: deliveryPartner._id.toString(),
      name: randomString(),
      territory: 'WW',
    }).save();

    work1 = await new Work({ clientId: client._id, title: randomString() }).save();
    work2 = await new Work({ clientId: client._id, title: randomString() }).save();
    work3 = await new Work({ clientId: client._id, title: randomString() }).save();

    cwrAcknowledgement = await new CwrAcknowledgement({
      clientId: client._id,
      name: randomString(),
      source: randomString(),
      cwrDeliveryId: cwrDelivery._id.toString(),
      deliveryPartnerId: deliveryPartner._id.toString(),
      status: 'Complete',
    }).save();

    deliveryLog1 = await new DeliveryLog({
      _id: randomId(),
      clientId: client._id.toString(),
      workId: work1._id.toString(),
      deliveryPartnerId: deliveryPartner._id.toString(),
      log: [{
        acknowledgementId: cwrAcknowledgement._id.toString(),
        status: 'Rejected',
      }],
    }).save();

    deliveryLog2 = await new DeliveryLog({
      _id: randomId(),
      clientId: client._id.toString(),
      workId: work2._id.toString(),
      deliveryPartnerId: deliveryPartner._id.toString(),
      log: [{
        acknowledgementId: cwrAcknowledgement._id.toString(),
        status: 'Rejected',
      }],
    }).save();

    deliveryLog3 = await new DeliveryLog({
      _id: randomId(),
      clientId: client._id.toString(),
      workId: work3._id.toString(),
      deliveryPartnerId: deliveryPartner._id.toString(),
      log: [{
        acknowledgementId: cwrAcknowledgement._id.toString(),
        status: 'Accepted',
      }],
    }).save();
  });

  afterEach((done) => {
    sinon.restore();
    cleanUp(done);
  });

  describe('reDeliverWorks', () => {
    it('should only return rejected works', (done) => {
      cwrAcknowledgement.reDeliverWorks('Rejected', curveUser, async (err, newDelivery) => {
        const workIds = newDelivery.filter.workIds.map((id) => id.toString());
        const acceptedId = work3._id.toString();
        const rejectedIds = [work1._id.toString(), work2._id.toString()];
        expect(newDelivery).to.exist;
        expect(newDelivery.filter).to.have.property('workIds');
        expect(newDelivery.filter.workIds).to.have.lengthOf(2);
        expect(workIds).to.not.include(acceptedId);
        expect(workIds).to.include.members(rejectedIds);
        done();
      });
    });
  });
});
