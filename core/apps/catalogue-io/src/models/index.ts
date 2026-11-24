import { model } from '@curveroyaltysystems/models/mongoose';
import type { HydratedDocument } from '@curveroyaltysystems/models/mongoose';

import type { Client as ClientType } from '@curveroyaltysystems/models/dist/client';
import type { Track as TrackType } from '@curveroyaltysystems/models/dist/track';
import type { Release as ReleaseType } from '@curveroyaltysystems/models/dist/release';
import type { Work as WorkType } from '@curveroyaltysystems/models/dist/work';
import type { Contract as ContractType } from '@curveroyaltysystems/models/dist/contract';
import type { Composer as ComposerType } from '@curveroyaltysystems/models/dist/composer';
import type { Publisher as PublisherType } from '@curveroyaltysystems/models/dist/publisher';
import type { Notification as NotificationType } from '@curveroyaltysystems/models/dist/notification';
import type { User as UserType } from '@curveroyaltysystems/models/dist/user';
import type { Parent as ParentType } from '@curveroyaltysystems/models/dist/parent';
import type { BatchTask as BatchTaskType } from '@curveroyaltysystems/models/dist/batchTask';
import type { TerritoryGroup as TerritoryGroupType } from '@curveroyaltysystems/models/dist/territoryGroup';
import type { DeliveryPartner as DeliveryPartnerType } from '@curveroyaltysystems/models/dist/deliveryPartner';
import type { DeliveredWork as DeliveredWorkType } from '@curveroyaltysystems/models/dist/deliveredWork';

import {
  Client as ClientDef,
  Track as TrackDef,
  Release as ReleaseDef,
  Work as WorkDef,
  Contract as ContractDef,
  Composer as ComposerDef,
  Publisher as PublisherDef,
  Notification as NotificationDef,
  User as UserDef,
  Parent as ParentDef,
  BatchTask as BatchTaskDef,
  TerritoryGroup as TerritoryGroupDef,
  DeliveryPartner as DeliveryPartnerDef,
  DeliveredWork as DeliveredWorkDef,
} from '@curveroyaltysystems/models';

// Export models
export const Client = model<typeof ClientDef.schema>(ClientDef.name, ClientDef.schema);
export const Track = model<typeof TrackDef.schema>(TrackDef.name, TrackDef.schema );
export const Release = model<typeof ReleaseDef.schema>(ReleaseDef.name, ReleaseDef.schema );
export const Work = model<typeof WorkDef.schema>(WorkDef.name, WorkDef.schema );
export const Contract = model<typeof ContractDef.schema>(ContractDef.name, ContractDef.schema );
export const Composer = model<typeof ComposerDef.schema>(ComposerDef.name, ComposerDef.schema );
export const Publisher = model<typeof PublisherDef.schema>(PublisherDef.name, PublisherDef.schema );
export const Notification = model<typeof NotificationDef.schema>(NotificationDef.name, NotificationDef.schema );
export const User = model<typeof UserDef.schema>(UserDef.name, UserDef.schema );
export const Parent = model<typeof ParentDef.schema>(ParentDef.name, ParentDef.schema );
export const BatchTask = model<typeof BatchTaskDef.schema>(BatchTaskDef.name, BatchTaskDef.schema );
export const TerritoryGroup = model<typeof TerritoryGroupDef.schema>(TerritoryGroupDef.name, TerritoryGroupDef.schema );
export const DeliveryPartner = model<typeof DeliveryPartnerDef.schema>(DeliveryPartnerDef.name, DeliveryPartnerDef.schema );
export const DeliveredWork = model<typeof DeliveredWorkDef.schema>(DeliveredWorkDef.name, DeliveredWorkDef.schema );

// Export document types
export type ClientDocument = HydratedDocument<ClientType>;
export type TrackDocument = HydratedDocument<TrackType>;
export type ReleaseDocument = HydratedDocument<ReleaseType>;
export type WorkDocument = HydratedDocument<WorkType>;
export type ContractDocument = HydratedDocument<ContractType>;
export type ComposerDocument = HydratedDocument<ComposerType>;
export type PublisherDocument = HydratedDocument<PublisherType>;
export type NotificationDocument = HydratedDocument<NotificationType>;
export type UserDocument = HydratedDocument<UserType>;
export type ParentDocument = HydratedDocument<ParentType>;
export type BatchTaskDocument = HydratedDocument<BatchTaskType>;
export type TerritoryGroupDocument = HydratedDocument<TerritoryGroupType>;
export type DeliveryPartnerDocument = HydratedDocument<DeliveryPartnerType>;
export type DeliveredWorkDocument = HydratedDocument<DeliveredWorkType>;