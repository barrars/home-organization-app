import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IRoom extends Document {
  homeId: Types.ObjectId
  name: string
  description: string
  icon: string
  deletedAt: Date | null
}

const roomSchema = new Schema<IRoom>(
  {
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'door' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// Enforce unique room names per home among non-deleted rooms
roomSchema.index(
  { homeId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
)

export const Room = mongoose.model<IRoom>('Room', roomSchema)
