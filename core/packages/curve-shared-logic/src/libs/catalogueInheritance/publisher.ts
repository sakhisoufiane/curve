import type { Client as ClientSchema } from '@curveroyaltysystems/models/dist/client';
import type { HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { PublisherInstance, PublisherModel, ClientModel } from '../../types/models';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Utils = require('../utils');

type ClientInstance = HydratedDocument<ClientSchema>;

type InheritCatalogueEntry = {
  clientId?: string;
  transferPublishers?: boolean;
  catalogueGroup?: string;
};

export async function propagatePublisher({
  publisher,
  Publisher,
  Client,
}: {
  publisher: PublisherInstance;
  Publisher: PublisherModel;
  Client: ClientModel;
}): Promise<void> {
  const parentClient = await Client.findById(publisher.clientId);
  if (!parentClient) return;

  const childClients = await Client.find({ 'inheritCatalogueFrom.clientId': parentClient._id.toString() });

  const matchingClients = childClients.filter((client) =>
    (client.inheritCatalogueFrom as InheritCatalogueEntry[]).some((inheritance) => {
      if (!inheritance?.transferPublishers) return false;
      if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
        return (publisher.catalogueGroups as string[]).includes(inheritance.catalogueGroup);
      }
      return true;
    })
  );

  for (const client of matchingClients) {
    await propagatePublisherToClient({ publisher, client, Publisher });
  }
}

async function propagatePublisherToClient({
  publisher,
  client,
  Publisher,
}: {
  publisher: PublisherInstance;
  client: ClientInstance;
  Publisher: PublisherModel;
}): Promise<void> {
  let childPublisher = await Publisher.findOne({
    clientId: client._id.toString(),
    duplicatedFrom: publisher._id.toString(),
  });

  if (!childPublisher) {
    childPublisher = new Publisher();
  }

  childPublisher.clientId = client._id as unknown as string;
  childPublisher.name = publisher.name;
  childPublisher.cae = Utils.padLeadingZeros(publisher.cae as string | undefined, 11) as string;
  childPublisher.mainPro = publisher.mainPro;
  childPublisher.mechanicalPro = publisher.mechanicalPro;
  childPublisher.performancePro = publisher.performancePro;
  childPublisher.syncPro = publisher.syncPro;
  childPublisher.mainProIdentifier = publisher.mainProIdentifier;
  childPublisher.mechanicalProIdentifier = publisher.mechanicalProIdentifier;
  childPublisher.performanceProIdentifier = publisher.performanceProIdentifier;
  childPublisher.syncProIdentifier = publisher.syncProIdentifier;
  childPublisher.controlled = publisher.controlled;
  childPublisher.notes = publisher.notes;
  childPublisher.aliases = (publisher.aliases as string[]) || [];
  childPublisher.duplicatedFrom = publisher._id as unknown as string;

  await childPublisher.save();
}
