import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { List } from '../models/list.model'
import { ListItem } from '../models/listItem.model'
import { Item } from '../models/inventory.model'
import logger from '../utils/logger'

class ListController {
  /** GET /api/lists — all lists for this home, with item count */
  async getLists(req: Request, res: Response): Promise<void> {
    try {
      const lists = await List.find({ homeId: req.homeId }).sort({ name: 1 }).lean()
      const ids = lists.map((l) => l._id as Types.ObjectId)
      const counts = await ListItem.aggregate([
        { $match: { listId: { $in: ids } } },
        { $group: { _id: '$listId', count: { $sum: 1 } } },
      ])
      const countMap: Record<string, number> = {}
      for (const c of counts) countMap[String(c._id)] = c.count
      const result = lists.map((l) => ({ ...l, itemCount: countMap[String(l._id)] ?? 0 }))
      res.json(result)
    } catch (error) {
      logger.error('Error fetching lists', { error })
      res.status(500).json({ message: 'Error fetching lists', error })
    }
  }

  /** POST /api/lists — create a list */
  async createList(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body as { name: string; description?: string }
      const list = await List.create({ homeId: req.homeId, name, description: description ?? '' })
      res.status(201).json(list)
    } catch (error) {
      logger.error('Error creating list', { error })
      res.status(400).json({ message: 'Error creating list', error })
    }
  }

  /** GET /api/lists/:id — list metadata + all its items (fully populated) */
  async getList(req: Request, res: Response): Promise<void> {
    try {
      const list = await List.findOne({ _id: req.params.id, homeId: req.homeId }).lean()
      if (!list) {
        res.status(404).json({ message: 'List not found' })
        return
      }
      const listItems = await ListItem.find({ listId: list._id })
        .populate({
          path: 'itemId',
          populate: [
            { path: 'categories', select: 'name' },
            { path: 'tags', select: 'name' },
            { path: 'roomId', select: 'name icon' },
          ],
        })
        .lean()

      // Filter out list entries whose underlying item has been deleted
      const items = listItems
        .filter((li) => {
          const item = li.itemId as unknown as Record<string, unknown> | null
          return item && !item.deletedAt
        })
        .map((li) => ({
          listItemId: li._id,
          note: li.note,
          addedAt: (li as unknown as { createdAt: unknown }).createdAt,
          item: li.itemId,
        }))

      res.json({ ...list, items })
    } catch (error) {
      logger.error('Error fetching list', { error })
      res.status(500).json({ message: 'Error fetching list', error })
    }
  }

  /** PATCH /api/lists/:id — update name / description */
  async updateList(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body as { name?: string; description?: string }
      const list = await List.findOneAndUpdate(
        { _id: req.params.id, homeId: req.homeId },
        {
          $set: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      if (!list) {
        res.status(404).json({ message: 'List not found' })
        return
      }
      res.json(list)
    } catch (error) {
      logger.error('Error updating list', { error })
      res.status(400).json({ message: 'Error updating list', error })
    }
  }

  /** DELETE /api/lists/:id — delete list and all its listItems */
  async deleteList(req: Request, res: Response): Promise<void> {
    try {
      const list = await List.findOneAndDelete({ _id: req.params.id, homeId: req.homeId })
      if (!list) {
        res.status(404).json({ message: 'List not found' })
        return
      }
      await ListItem.deleteMany({ listId: list._id })
      res.json({ message: 'List deleted' })
    } catch (error) {
      logger.error('Error deleting list', { error })
      res.status(500).json({ message: 'Error deleting list', error })
    }
  }

  /** POST /api/lists/:id/items — add an item to a list */
  async addItem(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, note } = req.body as { itemId: string; note?: string }
      // Verify the item belongs to this home
      const item = await Item.findOne({ _id: itemId, homeId: req.homeId, deletedAt: null })
      if (!item) {
        res.status(404).json({ message: 'Item not found' })
        return
      }
      const listItem = await ListItem.create({
        listId: new Types.ObjectId(req.params.id as string),
        itemId,
        homeId: req.homeId,
        note: note ?? '',
      })
      res.status(201).json(listItem)
    } catch (error: unknown) {
      // Duplicate key — item already on list
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: number }).code === 11000
      ) {
        res.status(409).json({ message: 'Item is already on this list' })
        return
      }
      logger.error('Error adding item to list', { error })
      res.status(400).json({ message: 'Error adding item to list', error })
    }
  }

  /** DELETE /api/lists/:id/items/:itemId — remove an item from a list */
  async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await ListItem.findOneAndDelete({
        listId: req.params.id,
        itemId: req.params.itemId,
        homeId: req.homeId,
      })
      if (!deleted) {
        res.status(404).json({ message: 'Item not on this list' })
        return
      }
      res.json({ message: 'Item removed from list' })
    } catch (error) {
      logger.error('Error removing item from list', { error })
      res.status(500).json({ message: 'Error removing item from list', error })
    }
  }

  /** PATCH /api/lists/:id/items/:itemId — update the list-specific note */
  async updateListItem(req: Request, res: Response): Promise<void> {
    try {
      const { note } = req.body as { note: string }
      const listItem = await ListItem.findOneAndUpdate(
        { listId: req.params.id, itemId: req.params.itemId, homeId: req.homeId },
        { $set: { note } },
        { returnDocument: 'after' },
      )
      if (!listItem) {
        res.status(404).json({ message: 'Item not on this list' })
        return
      }
      res.json(listItem)
    } catch (error) {
      logger.error('Error updating list item note', { error })
      res.status(400).json({ message: 'Error updating list item note', error })
    }
  }

  /** GET /api/lists/for-item/:itemId — which lists does this item appear on */
  async getListsForItem(req: Request, res: Response): Promise<void> {
    try {
      const listItems = await ListItem.find({ itemId: req.params.itemId, homeId: req.homeId })
        .populate('listId', 'name description')
        .lean()
      res.json(listItems.map((li) => ({ listItemId: li._id, note: li.note, list: li.listId })))
    } catch (error) {
      logger.error('Error fetching lists for item', { error })
      res.status(500).json({ message: 'Error fetching lists for item', error })
    }
  }
}

export default new ListController()
