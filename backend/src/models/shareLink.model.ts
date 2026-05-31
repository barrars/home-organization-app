import mongoose, { Schema, Document, Types } from 'mongoose'
import crypto from 'crypto'

export type ShareLinkTargetType = 'room' | 'item'

export interface IShareLink extends Document {
  ownerHomeId: Types.ObjectId
  targetType: ShareLinkTargetType
  targetId: Types.ObjectId
  token: string
  canEdit: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const shareLinkSchema = new Schema<IShareLink>(
  {
    ownerHomeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    targetType: {
      type: String,
      enum: ['room', 'item'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(18).toString('base64url'),
    },
    canEdit: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

// One link per target per owner (upsert-friendly)
shareLinkSchema.index({ ownerHomeId: 1, targetType: 1, targetId: 1 }, { unique: true })

export const ShareLink = mongoose.model<IShareLink>('ShareLink', shareLinkSchema)
