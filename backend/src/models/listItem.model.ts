import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IListItem extends Document {
  listId: Types.ObjectId
  itemId: Types.ObjectId
  homeId: Types.ObjectId
  note: string
}

const listItemSchema = new Schema<IListItem>(
  {
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    homeId: { type: Schema.Types.ObjectId, ref: 'Home', required: true, index: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
)

// Prevent duplicate item entries on the same list
listItemSchema.index({ listId: 1, itemId: 1 }, { unique: true })
// Fast reverse lookup: "which lists does this item appear on?"
listItemSchema.index({ itemId: 1 })

export const ListItem = mongoose.model<IListItem>('ListItem', listItemSchema)
