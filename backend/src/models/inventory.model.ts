import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IItem extends Document {
  homeId: Types.ObjectId
  name: string
  quantity: number
  roomId: mongoose.Types.ObjectId
  categories: mongoose.Types.ObjectId[]
  tags: mongoose.Types.ObjectId[]
  notes: string
  imageUrl: string
  imageUrls: string[]
  deletedAt: Date | null
}

const itemSchema = new Schema<IItem>(
  {
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    notes: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imageUrls: { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

itemSchema.index({ homeId: 1, roomId: 1 })

export const Item = mongoose.model<IItem>('Item', itemSchema)
