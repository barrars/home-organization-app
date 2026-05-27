import mongoose, { Schema, Document } from 'mongoose'

export interface ITag extends Document {
  name: string
}

const tagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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

export const Tag = mongoose.model<ITag>('Tag', tagSchema)
