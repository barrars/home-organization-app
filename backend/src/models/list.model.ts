import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IList extends Document {
  homeId: Types.ObjectId
  name: string
  description: string
}

const listSchema = new Schema<IList>(
  {
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true },
)

listSchema.index({ homeId: 1, name: 1 })

export const List = mongoose.model<IList>('List', listSchema)
