import mongoose, { Schema, Document, Types } from 'mongoose'

export interface INotification extends Document {
  homeId: Types.ObjectId
  event: string
  data: Record<string, unknown>
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    event: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

// Index for fetching unread notifications efficiently
notificationSchema.index({ homeId: 1, read: 1, createdAt: -1 })

// Auto-expire old notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
