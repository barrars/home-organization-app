import crypto from 'crypto'
import mongoose, { Schema, Document } from 'mongoose'

export interface IHome extends Document {
  token: string
}

const homeSchema = new Schema<IHome>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
  },
  { timestamps: true },
)

export const Home = mongoose.model<IHome>('Home', homeSchema)
