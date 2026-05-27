import mongoose, { Schema, Document } from 'mongoose'

export interface IItem extends Document {
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

export const Item = mongoose.model<IItem>('Item', itemSchema)
