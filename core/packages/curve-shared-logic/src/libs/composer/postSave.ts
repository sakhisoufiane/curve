import type { ComposerInstance, ComposerModel, ClientModel } from '../../types/models';
import CatalogueInheritance from '../catalogueInheritance';

export async function postSave({
  composer,
  Composer,
  Client,
}: {
  composer: ComposerInstance;
  Composer: ComposerModel;
  Client: ClientModel;
}): Promise<void> {
  await CatalogueInheritance.propagateComposer({
    composer,
    Composer,
    Client,
  });
}

export default {
  postSave,
};
