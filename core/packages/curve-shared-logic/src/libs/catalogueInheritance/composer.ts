import type { Client as ClientSchema } from '@curveroyaltysystems/models/dist/client';
import type { HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { ComposerInstance, ComposerModel, ClientModel } from '../../types/models';

type ClientInstance = HydratedDocument<ClientSchema>;

type InheritCatalogueEntry = {
  clientId?: string;
  transferComposers?: boolean;
  catalogueGroup?: string;
};

export async function propagateComposer({
  composer,
  Composer,
  Client,
}: {
  composer: ComposerInstance;
  Composer: ComposerModel;
  Client: ClientModel;
}): Promise<void> {
  const parentClient = await Client.findById(composer.clientId);
  if (!parentClient) return;

  const childClients = await Client.find({ 'inheritCatalogueFrom.clientId': parentClient._id.toString() });

  const matchingClients = childClients.filter((client) =>
    (client.inheritCatalogueFrom as InheritCatalogueEntry[]).some((inheritance) => {
      if (!inheritance?.transferComposers) return false;
      if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
        return (composer.catalogueGroups as string[]).includes(inheritance.catalogueGroup);
      }
      return true;
    })
  );

  for (const client of matchingClients) {
    await propagateComposerToClient({ composer, client, Composer });
  }
}

async function propagateComposerToClient({
  composer,
  client,
  Composer,
}: {
  composer: ComposerInstance;
  client: ClientInstance;
  Composer: ComposerModel;
}): Promise<void> {
  let childComposer = await Composer.findOne({
    clientId: client._id.toString(),
    duplicatedFrom: composer._id.toString(),
  });

  if (!childComposer) {
    childComposer = new Composer();
  }

  childComposer.clientId = client._id as unknown as string;
  childComposer.name = composer.name;
  childComposer.cae = composer.cae as string;
  childComposer.mainPro = composer.mainPro;
  childComposer.mechanicalPro = composer.mechanicalPro;
  childComposer.performancePro = composer.performancePro;
  childComposer.syncPro = composer.syncPro;
  childComposer.mainProIdentifier = composer.mainProIdentifier;
  childComposer.mechanicalProIdentifier = composer.mechanicalProIdentifier;
  childComposer.performanceProIdentifier = composer.performanceProIdentifier;
  childComposer.syncProIdentifier = composer.syncProIdentifier;
  childComposer.controlled = composer.controlled;
  childComposer.notes = composer.notes;
  childComposer.firstName = composer.firstName;
  childComposer.middleNames = composer.middleNames;
  childComposer.surname = composer.surname;
  childComposer.duplicatedFrom = composer._id as unknown as string;

  await childComposer.save();
}
