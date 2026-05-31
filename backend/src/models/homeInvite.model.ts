import mongoose, { Schema, Document, Types } from 'mongoose'
import crypto from 'crypto'

export type HomeInviteMode = 'view' | 'join'

export interface IHomeInvite extends Document {
  token: string
  homeId: Types.ObjectId
  /** 'join' = claim the home token as primary; 'view' = visit as a guest (share) */
  mode: HomeInviteMode
  expiresAt: Date
  claimedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const homeInviteSchema = new Schema<IHomeInvite>(
  {
    token: {
      type: String,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(20).toString('base64url'),
    },
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    mode: { type: String, enum: ['view', 'join'], required: true, default: 'join' },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const HomeInvite = mongoose.model<IHomeInvite>('HomeInvite', homeInviteSchema)
