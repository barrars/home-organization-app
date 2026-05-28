import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ICategory extends Document {
  homeId: Types.ObjectId
  name: string
}

const categorySchema = new Schema<ICategory>(
  {
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

// Unique category names per home
categorySchema.index({ homeId: 1, name: 1 }, { unique: true })

export const Category = mongoose.model<ICategory>('Category', categorySchema)
