const { randomString, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { CwrDeliveryController, CWR } = require('@curveroyaltysystems/curve-shared-logic');
const fs = require('fs');

const path = require('path');
const Client = require('../../../models/client');
const CwrDelivery = require('../../../models/cwrDelivery');
const DeliveryPartner = require('../../../models/deliveryPartner');
const Work = require('../../../models/work');
const TerritoryGroup = require('../../../models/territoryGroup');
const Track = require('../../../models/track');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');
const Release = require('../../../models/release');
const CwrBuilder = require('./builder');

describe('createFile', () => {
  let logKey;
  let delivery;
  let client;
  let deliveryPartner;
  let works;

  beforeEach(() => {
    logKey = randomString();
    client = new Client({
      name: randomString(),
      cwrPartyId: randomString(),
      cwrPartyName: randomString(),
      ipiNo: randomString(),
    });
    deliveryPartner = new DeliveryPartner({
      clientId: client._id.toString(),
      ipiNo: randomString(),
      splitElection: randomBoolean(),
      splitElectionPRO: randomString(),
      cwrVersion: randomInt(),
    });
    delivery = new CwrDelivery({
      clientId: client._id.toString(),
      deliveryPartnerId: deliveryPartner._id.toString(),
      territory: 'WW',
      receivingParty: randomString(),
      sequenceNo: randomInt(),
      cwrVersion: randomInt(),
    });
    works = [
      new Work({ title: randomString(), rightsChain: [{ children: [] }] }),
      new Work({ title: randomString(), rightsChain: [{ children: [] }] }),
      new Work({ title: randomString(), rightsChain: [{ children: [] }] }),
    ];

    jest.spyOn(Client, 'findById').mockResolvedValue(client);
    jest.spyOn(DeliveryPartner, 'findById').mockResolvedValue(deliveryPartner);
    jest.spyOn(CwrDeliveryController, 'buildWorksFilter').mockResolvedValue({});
    jest.spyOn(Work, 'countDocuments').mockResolvedValue(works.length);
    jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
      works,
      territory: [delivery.territory],
    });
    jest.spyOn(CwrBuilder, 'setupCwrFile');
    jest.spyOn(CwrBuilder, 'addWorksToFile');
    jest.spyOn(CwrBuilder, 'closeCwrFile');
  });

  it('should create a CWR file for the specified delivery', async () => {
    // Arrange
    const ts = 1625077800000; // Fixed timestamp for testing
    jest.spyOn(Date, 'now').mockReturnValue(ts);

    // Act
    const { client: clientFromBuilder, filePath } = await CwrBuilder.createFile({ logKey, delivery });

    // Assert
    expect(Client.findById).toHaveBeenCalledWith(delivery.clientId);
    expect(DeliveryPartner.findById).toHaveBeenCalledWith(delivery.deliveryPartnerId);
    expect(Work.countDocuments).toHaveBeenCalledWith({});

    expect(clientFromBuilder).toEqual(client);
    expect(path.basename(filePath)).toEqual(`${client._id.toString()}-${ts}-${delivery.fileName}`);
    expect(fs.existsSync(filePath)).toEqual(true);
  });

  it('should throw an error if no works are found for the delivery', async () => {
    // Arrange
    jest.spyOn(Work, 'countDocuments').mockResolvedValue(0);

    // Act & Assert
    await expect(CwrBuilder.createFile({ logKey, delivery })).rejects.toThrow('No Works found with Delivery filter');
  });
});

describe('setupCwrFile', () => {
  let client;
  let version;
  let deliveryPartner;
  let delivery;

  beforeEach(() => {
    client = new Client({
      name: randomString(),
      cwrPartyId: randomString(),
      cwrPartyName: randomString(),
      ipiNo: randomString(),
    });
    version = randomInt();
    deliveryPartner = new DeliveryPartner({
      ipiNo: randomString(),
      splitElection: randomBoolean(),
      splitElectionPRO: randomString(),
      cwrVersion: version,
    });
    delivery = new CwrDelivery({
      receivingParty: randomString(),
      sequenceNo: randomInt(),
      cwrVersion: version,
    });
  });

  it('should setup a CWR file with header rows', async () => {
    // Act
    const cwr = await CwrBuilder.setupCwrFile({ client, deliveryPartner, delivery });

    // Assert
    expect(cwr.params).toMatchObject({
      deliveryPartner: {
        cwrVersion: version.toString(),
        extraPartners: [],
        ipiNo: deliveryPartner.ipiNo,
        outputFormat: 'CWR',
        splitElectionPRO: deliveryPartner.splitElectionPRO,
        subPartners: [],
        _id: deliveryPartner._id,
        insertionTerritory: [],
      },
      senderName: client.cwrPartyName,
      senderType: 'PB',
      sendingParty: client.cwrPartyId,
      receivingParty: delivery.receivingParty,
      ipiNo: deliveryPartner.ipiNo,
      sequenceNo: delivery.sequenceNo,
      version,
      deliveryConfiguration: { splitElection: deliveryPartner.splitElection, splitElectionPRO: deliveryPartner.splitElectionPRO },
    });

    const lines = cwr.output.join('').split('\n');
    expect(lines[0]).toContain('HDR');
    expect(lines[1]).toContain('GRHREV');
  });

  it('should fallback to client fields or null when cwr/delivery specific ones are missing', async () => {
    // Arrange
    client.cwrPartyName = null;
    deliveryPartner = null;

    // Act
    const cwr = await CwrBuilder.setupCwrFile({ client, deliveryPartner, delivery });

    // Assert
    expect(cwr.params).toMatchObject({
      deliveryPartner: null,
      senderName: client.name,
      senderType: 'PB',
      sendingParty: client.cwrPartyId,
      receivingParty: delivery.receivingParty,
      ipiNo: client.ipiNo,
      sequenceNo: delivery.sequenceNo,
      version,
      deliveryConfiguration: { splitElection: null, splitElectionPRO: null },
    });
  });
  it('should let deliveryPartner override senderName, ipiNo and sendingParty', async () => {
  // Arrange
    const client = new Client({
      name: 'Client Name',
      cwrPartyName: 'Client CWR Name',
      cwrPartyId: 'CLIENT123',
      ipiNo: 'CLIENT_IPI',
    });

    const delivery = new CwrDelivery({
      receivingParty: 'DELIVERY_RECEIVER',
      sequenceNo: 1,
      cwrVersion: 2,
    });

    const deliveryPartner = new DeliveryPartner({
      ipiNo: 'PARTNER_IPI_OVERRIDE',
      splitElection: true,
      splitElectionPRO: 'ASCAP',
      cwrVersion: 2,
    });

    deliveryPartner.sendingPartyName = 'PARTNER_NAME_OVERRIDE';
    deliveryPartner.sendingPartyId = 'PARTNER_RECEIVER_OVERRIDE';

    // Act
    const cwr = await CwrBuilder.setupCwrFile({
      client,
      deliveryPartner,
      delivery,
    });

    // Assert
    expect(cwr.params).toMatchObject({
      senderName: 'PARTNER_NAME_OVERRIDE',
      ipiNo: 'PARTNER_IPI_OVERRIDE',
      receivingParty: 'DELIVERY_RECEIVER',
      sendingParty: 'PARTNER_RECEIVER_OVERRIDE',
    });
  });
});

describe('addWorksToFile', () => {
  let cwr;
  let filter;
  let delivery;
  let deliveryPartner;
  let territory;
  let options;

  beforeEach(() => {
    cwr = { addWorks: jest.fn().mockImplementation((works, rev, territory, cb) => cb()) };
    filter = {};
    delivery = new CwrDelivery();
    deliveryPartner = new DeliveryPartner();
    territory = 'WW';
    options = null;
    jest.spyOn(CwrBuilder, 'addWorksToFile');
  });

  it('should fetch works and add them to a CWR instance', async () => {
    // Arrange
    const works = [
      new Work({ title: randomString() }),
      new Work({ title: randomString() }),
      new Work({ title: randomString() }),
    ];
    jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
      works,
      territory: [territory],
    });

    // Act
    await CwrBuilder.addWorksToFile({
      cwr,
      filter,
      delivery,
      deliveryPartner,
      territory,
      options,
    });

    // Assert
    expect(CwrBuilder.addWorksToFile).toHaveBeenCalledTimes(1);
    expect(cwr.addWorks).toHaveBeenCalledWith(works, 'REV', [territory], expect.any(Function));
  });

  it('should pass all required models into CwrDeliveryController', async () => {
    // Arrange
    const works = [new Work({ title: randomString() })];
    jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
      works,
      territory: [territory],
    });

    // Act
    await CwrBuilder.addWorksToFile({
      cwr,
      filter,
      delivery,
      deliveryPartner,
      territory,
      options,
    });

    // Assert
    expect(CwrDeliveryController.getWorksForDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        TerritoryGroup,
        Work,
        Track,
        Publisher,
        Composer,
        Release,
      }),
    );
  });

  describe('when a processing limit is specified', () => {
    it('should recursively add all works in batches of that limit', async () => {
      // Arrange
      const works = [];
      for (let i = 0; i < 15; i += 1) {
        works.push(new Work({ title: randomString() }));
      }
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({
        works: works.slice(0, 10),
        territory: [territory],
      });
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({
        works: works.slice(10),
        territory: [territory],
      });

      // Act
      await CwrBuilder.addWorksToFile({
        cwr,
        filter,
        delivery,
        deliveryPartner,
        territory,
        options,
        limit: 10,
      });

      // Assert
      // Batch 1 - 10
      expect(cwr.addWorks).toHaveBeenNthCalledWith(1, works.slice(0, 10), 'REV', [territory], expect.any(Function));
      // Batch 2 - remaining 5
      expect(cwr.addWorks).toHaveBeenNthCalledWith(2, works.slice(10), 'REV', [territory], expect.any(Function));
    });
  });
});

describe('closeCwrFile', () => {
  it('should close the CWR file and write it to disk', async () => {
    // Arrange
    const cwr = new CWR();
    const filePath = `${process.env.APP_ROOT_DIR}/tmp/${randomString()}.V22`;

    // Act
    await CwrBuilder.closeCwrFile({ cwr, filePath });

    // Assert
    expect(fs.existsSync(filePath)).toEqual(true);
  });
});
