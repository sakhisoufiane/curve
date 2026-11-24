import type { Model, HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type { Work as WorkSchema } from '@curveroyaltysystems/models/dist/work';
import type { Client as ClientSchema } from '@curveroyaltysystems/models/dist/client';
import type { Composer as ComposerSchema } from '@curveroyaltysystems/models/dist/composer';
import type { Publisher as PublisherSchema } from '@curveroyaltysystems/models/dist/publisher';
import type { TerritoryGroup as TerritoryGroupSchema } from '@curveroyaltysystems/models/dist/territoryGroup';
import type { Track as TrackSchema } from '@curveroyaltysystems/models/dist/track';

export type WorkModel = Model<WorkSchema>;
export type ClientModel = Model<ClientSchema>;
export type ComposerModel = Model<ComposerSchema>;
export type PublisherModel = Model<PublisherSchema>;
export type TerritoryGroupModel = Model<TerritoryGroupSchema>;
export type TrackModel = Model<TrackSchema>;

export type WorkInstance = HydratedDocument<
  WorkSchema & {
    _excludeIdsForValidation?: string[];
    _creationType?: 'unmapped';
  }
>;

export type PublisherInstance = HydratedDocument<PublisherSchema>;
export type ComposerInstance = HydratedDocument<ComposerSchema>;
