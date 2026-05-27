import { Request, Response } from 'express'
import { Item } from '../models/inventory.model'
import { Room } from '../models/room.model'
import logger from '../utils/logger'
import { getIO } from '../utils/socket'

class DumpsterController {
  /** GET /api/dumpster — all soft-deleted items and rooms */
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const [items, rooms] = await Promise.all([
        Item.find({ deletedAt: { $ne: null } })
          .populate('categories', 'name')
          .populate('tags', 'name')
          .sort({ deletedAt: -1 }),
        Room.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }),
      ])
      res.json({ items, rooms })
    } catch (error) {
      logger.error('Error fetching dumpster contents', { error })
      res.status(500).json({ message: 'Error fetching dumpster', error })
    }
  }

  /** POST /api/dumpster/items/:id/restore */
  async restoreItem(req: Request, res: Response): Promise<void> {
    try {
      const item = await Item.findByIdAndUpdate(
        req.params.id,
        { deletedAt: null },
        { returnDocument: 'after' },
      )
        .populate('categories', 'name')
        .populate('tags', 'name')
      if (!item) {
        res.status(404).json({ message: 'Item not found' })
        return
      }
      logger.info('Item restored from dumpster', { id: req.params.id, name: item.name })
      getIO().emit('item:restored', { id: req.params.id })
      res.json(item)
    } catch (error) {
      logger.error('Error restoring item', { id: req.params.id, error })
      res.status(500).json({ message: 'Error restoring item', error })
    }
  }

  /** POST /api/dumpster/rooms/:id/restore */
  async restoreRoom(req: Request, res: Response): Promise<void> {
    try {
      const room = await Room.findByIdAndUpdate(
        req.params.id,
        { deletedAt: null },
        { returnDocument: 'after' },
      )
      if (!room) {
        res.status(404).json({ message: 'Room not found' })
        return
      }
      logger.info('Room restored from dumpster', { id: req.params.id, name: room.name })
      getIO().emit('room:restored', { id: req.params.id })
      res.json(room)
    } catch (error) {
      logger.error('Error restoring room', { id: req.params.id, error })
      res.status(500).json({ message: 'Error restoring room', error })
    }
  }

  /** DELETE /api/dumpster/items/:id — permanently delete one item */
  async destroyItem(req: Request, res: Response): Promise<void> {
    try {
      await Item.findByIdAndDelete(req.params.id)
      logger.info('Item permanently deleted', { id: req.params.id })
      getIO().emit('item:destroyed', { id: req.params.id })
      res.json({ message: 'Item permanently deleted' })
    } catch (error) {
      logger.error('Error permanently deleting item', { id: req.params.id, error })
      res.status(500).json({ message: 'Error permanently deleting item', error })
    }
  }

  /** DELETE /api/dumpster/rooms/:id — permanently delete one room */
  async destroyRoom(req: Request, res: Response): Promise<void> {
    try {
      await Room.findByIdAndDelete(req.params.id)
      logger.info('Room permanently deleted', { id: req.params.id })
      getIO().emit('room:destroyed', { id: req.params.id })
      res.json({ message: 'Room permanently deleted' })
    } catch (error) {
      logger.error('Error permanently deleting room', { id: req.params.id, error })
      res.status(500).json({ message: 'Error permanently deleting room', error })
    }
  }

  /** DELETE /api/dumpster — spring cleaning: permanently delete everything in trash */
  async springCleaning(_req: Request, res: Response): Promise<void> {
    try {
      const [itemResult, roomResult] = await Promise.all([
        Item.deleteMany({ deletedAt: { $ne: null } }),
        Room.deleteMany({ deletedAt: { $ne: null } }),
      ])
      logger.info('Spring cleaning complete', {
        itemsDeleted: itemResult.deletedCount,
        roomsDeleted: roomResult.deletedCount,
      })
      getIO().emit('dumpster:wiped', {})
      res.json({
        message: 'Dumpster emptied',
        itemsDeleted: itemResult.deletedCount,
        roomsDeleted: roomResult.deletedCount,
      })
    } catch (error) {
      logger.error('Error during spring cleaning', { error })
      res.status(500).json({ message: 'Error emptying dumpster', error })
    }
  }

  /** GET /api/dumpster/count — total trashed items + rooms */
  async getCount(_req: Request, res: Response): Promise<void> {
    try {
      const [items, rooms] = await Promise.all([
        Item.countDocuments({ deletedAt: { $ne: null } }),
        Room.countDocuments({ deletedAt: { $ne: null } }),
      ])
      res.json({ items, rooms, total: items + rooms })
    } catch (error) {
      logger.error('Error fetching dumpster count', { error })
      res.status(500).json({ message: 'Error fetching dumpster count', error })
    }
  }
}

export default new DumpsterController()
