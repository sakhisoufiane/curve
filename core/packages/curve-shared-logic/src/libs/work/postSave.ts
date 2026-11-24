import type {
  WorkInstance,
  WorkModel,
  ClientModel,
  TrackModel,
  ComposerModel,
  PublisherModel,
  TerritoryGroupModel,
} from '../../types/models';
import CatalogueInheritance from '../catalogueInheritance';

export async function postSave({
  work,
  Work,
  Client,
  Track,
  Composer,
  Publisher,
  TerritoryGroup,
}: {
  work: WorkInstance;
  Work: WorkModel;
  Client: ClientModel;
  Track: TrackModel;
  Composer: ComposerModel;
  Publisher: PublisherModel;
  TerritoryGroup: TerritoryGroupModel;
}): Promise<void> {
  await CatalogueInheritance.propagateWork({
    work,
    Work,
    Client,
    Track,
    Composer,
    Publisher,
    TerritoryGroup,
  });
}

export default {
  postSave,
};
