import type { PublisherInstance, PublisherModel, ClientModel } from '../../types/models';
import CatalogueInheritance from '../catalogueInheritance';

export async function postSave({
  publisher,
  Publisher,
  Client,
}: {
  publisher: PublisherInstance;
  Publisher: PublisherModel;
  Client: ClientModel;
}): Promise<void> {
  await CatalogueInheritance.propagatePublisher({
    publisher,
    Publisher,
    Client,
  });
}

export default {
  postSave,
};
