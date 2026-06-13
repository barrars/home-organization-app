import crypto from 'crypto'
import mongoose, { Schema, Document } from 'mongoose'

export interface IHome extends Document {
  token: string
  name: string
  deviceIds: string[]
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
    name: {
      type: String,
      default: 'Home Organizer',
      maxlength: 50,
    },
    deviceIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
)

export const Home = mongoose.model<IHome>('Home', homeSchema)
