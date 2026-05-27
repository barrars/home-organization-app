import mongoose, { Schema, Document } from 'mongoose'

export interface IRoom extends Document {
  name: string
  description: string
  deletedAt: Date | null
}

const roomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// Enforce unique room names only among non-deleted rooms
roomSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
)

export const Room = mongoose.model<IRoom>('Room', roomSchema)
