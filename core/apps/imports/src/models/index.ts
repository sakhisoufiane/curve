// Temporarily needed until the models package fully exports models and not just schemas
import * as mongoose from '@curveroyaltysystems/models/mongoose';
import * as schemas from '@curveroyaltysystems/models';
import type {
  Client as ClientType,
  Track as TrackType,
  Notification as NotificationType,
  Contract as ContractType,
  Release as ReleaseType,
  Composer as ComposerType,
  Publisher as PublisherType,
  User as UserType,
  Parent as ParentType,
} from '@curveroyaltysystems/models';
import { Model } from 'mongoose';

// @ts-expect-error TODO: Mongoose type issue?
export const Client: Model<typeof ClientType> = mongoose.model<typeof ClientType>(schemas.Client.name, schemas.Client.schema);
// @ts-expect-error TODO: Mongoose type issue?
export const Track: Model<typeof TrackType> = mongoose.model<typeof TrackType>(schemas.Track.name, schemas.Track.schema,);
// @ts-expect-error TODO: Mongoose type issue?
export const Notification: Model<typeof NotificationType> = mongoose.model<typeof NotificationType>(schemas.Notification.name, schemas.Notification.schema);
// @ts-expect-error TODO: Mongoose type issue?
export const Contract: Model<typeof ContractType> = mongoose.model<typeof ContractType>(schemas.Contract.name, schemas.Contract.schema);
// @ts-expect-error TODO: Mongoose type issue?
export const Release: Model<typeof ReleaseType> = mongoose.model<typeof ReleaseType>(schemas.Release.name, schemas.Release.schema);
// @ts-expect-error TODO: Mongoose type issue?
export const Composer: Model<typeof ComposerType> = mongoose.model<typeof ComposerType>(schemas.Composer.name, schemas.Composer.schema);
// @ts-expect-error TODO: Mongoose type issue?
export const Publisher: Model<typeof PublisherType> = mongoose.model<typeof PublisherType>(schemas.Publisher.name, schemas.Publisher.schema);
// @ts-expect-error TODO: Mongoose type issue?
export const User: Model<typeof UserType> = mongoose.model<typeof UserType>(schemas.User.name, schemas.User.schema );
// @ts-expect-error TODO: Mongoose type issue?
export const Parent: Model<typeof ParentType> = mongoose.model<typeof ParentType>(schemas.Parent.name, schemas.Parent.schema);
