import { Schema } from 'mongoose';

export type SsoConfig = {
  clientIds: string[];
  identityProvider: string;
  acceptedClockSkewMs: number;
  signatureAlgorithm: string;
  wantAssertionsSigned: boolean;
  wantAuthnResponseSigned: boolean;
  audience: string;
  callbackUrl: string;
  issuer: string;
  cert: string;
};

const ssoConfig = new Schema<SsoConfig>({
  clientIds: [String],
  identityProvider: String,
  acceptedClockSkewMs: Number,
  signatureAlgorithm: String,
  wantAssertionsSigned: Boolean,
  wantAuthnResponseSigned: Boolean,
  audience: String,
  callbackUrl: String,
  issuer: String,
  cert: String,
});

export default { name: 'SsoConfig', schema: ssoConfig };
