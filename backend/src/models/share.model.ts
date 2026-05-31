import mongoose, { Schema, Document, Types } from 'mongoose'

export type ShareTargetType = 'home' | 'room' | 'item'

export interface IShare extends Document {
  ownerHomeId: Types.ObjectId
  sharedWithHomeId: Types.ObjectId
  targetType: ShareTargetType
  targetId: Types.ObjectId
  canEdit: boolean
  createdAt: Date
  updatedAt: Date
}

const shareSchema = new Schema<IShare>(
  {
    ownerHomeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    sharedWithHomeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    targetType: {
      type: String,
      enum: ['home', 'room', 'item'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    canEdit: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Prevent duplicate shares of the same target to the same home
shareSchema.index({ sharedWithHomeId: 1, targetType: 1, targetId: 1 }, { unique: true })

// Quick lookup: what has been shared with me?
shareSchema.index({ sharedWithHomeId: 1, targetType: 1 })

// Quick lookup: what have I shared?
shareSchema.index({ ownerHomeId: 1, targetType: 1 })

export const Share = mongoose.model<IShare>('Share', shareSchema)
