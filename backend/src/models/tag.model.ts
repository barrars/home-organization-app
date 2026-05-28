import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ITag extends Document {
  homeId: Types.ObjectId
  name: string
}

const tagSchema = new Schema<ITag>(
  {
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      validate: {
        validator: (v: string) => v.trim().length > 0,
        message: 'Tag name cannot be empty',
      },
    },
  },
  { timestamps: true },
)

// Unique tag names per home
tagSchema.index({ homeId: 1, name: 1 }, { unique: true })

export const Tag = mongoose.model<ITag>('Tag', tagSchema)
