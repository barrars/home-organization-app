import { Request, Response } from 'express'
import { Item } from '../models/inventory.model'
import { Room } from '../models/room.model'
import logger from '../utils/logger'
import { emitToHome } from '../utils/socket'

class DumpsterController {
  /** GET /api/dumpster — all soft-deleted items and rooms for this home */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const [items, rooms] = await Promise.all([
        Item.find({ homeId: req.homeId, deletedAt: { $ne: null } })
          .populate('categories', 'name')
          .populate('tags', 'name')
          .sort({ deletedAt: -1 }),
        Room.find({ homeId: req.homeId, deletedAt: { $ne: null } }).sort({ deletedAt: -1 }),
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
      const item = await Item.findOneAndUpdate(
        { _id: req.params.id, homeId: req.homeId },
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
      emitToHome(req.homeId, 'item:restored', { id: req.params.id })
      res.json(item)
    } catch (error) {
      logger.error('Error restoring item', { id: req.params.id, error })
      res.status(500).json({ message: 'Error restoring item', error })
    }
  }

  /** POST /api/dumpster/rooms/:id/restore */
  async restoreRoom(req: Request, res: Response): Promise<void> {
    try {
      const room = await Room.findOneAndUpdate(
        { _id: req.params.id, homeId: req.homeId },
        { deletedAt: null },
        { returnDocument: 'after' },
      )
      if (!room) {
        res.status(404).json({ message: 'Room not found' })
        return
      }
      logger.info('Room restored from dumpster', { id: req.params.id, name: room.name })
      emitToHome(req.homeId, 'room:restored', { id: req.params.id })
      res.json(room)
    } catch (error) {
      logger.error('Error restoring room', { id: req.params.id, error })
      res.status(500).json({ message: 'Error restoring room', error })
    }
  }

  /** DELETE /api/dumpster/items/:id — permanently delete one item */
  async destroyItem(req: Request, res: Response): Promise<void> {
    try {
      await Item.findOneAndDelete({ _id: req.params.id, homeId: req.homeId })
      logger.info('Item permanently deleted', { id: req.params.id })
      emitToHome(req.homeId, 'item:destroyed', { id: req.params.id })
      res.json({ message: 'Item permanently deleted' })
    } catch (error) {
      logger.error('Error permanently deleting item', { id: req.params.id, error })
      res.status(500).json({ message: 'Error permanently deleting item', error })
    }
  }

  /** DELETE /api/dumpster/rooms/:id — permanently delete one room */
  async destroyRoom(req: Request, res: Response): Promise<void> {
    try {
      await Room.findOneAndDelete({ _id: req.params.id, homeId: req.homeId })
      logger.info('Room permanently deleted', { id: req.params.id })
      emitToHome(req.homeId, 'room:destroyed', { id: req.params.id })
      res.json({ message: 'Room permanently deleted' })
    } catch (error) {
      logger.error('Error permanently deleting room', { id: req.params.id, error })
      res.status(500).json({ message: 'Error permanently deleting room', error })
    }
  }

  /** DELETE /api/dumpster — spring cleaning: permanently delete everything in trash for this home */
  async springCleaning(req: Request, res: Response): Promise<void> {
    try {
      const [itemResult, roomResult] = await Promise.all([
        Item.deleteMany({ homeId: req.homeId, deletedAt: { $ne: null } }),
        Room.deleteMany({ homeId: req.homeId, deletedAt: { $ne: null } }),
      ])
      logger.info('Spring cleaning complete', {
        itemsDeleted: itemResult.deletedCount,
        roomsDeleted: roomResult.deletedCount,
      })
      emitToHome(req.homeId, 'dumpster:wiped', {})
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

  /** GET /api/dumpster/count — total trashed items + rooms for this home */
  async getCount(req: Request, res: Response): Promise<void> {
    try {
      const [items, rooms] = await Promise.all([
        Item.countDocuments({ homeId: req.homeId, deletedAt: { $ne: null } }),
        Room.countDocuments({ homeId: req.homeId, deletedAt: { $ne: null } }),
      ])
      res.json({ items, rooms, total: items + rooms })
    } catch (error) {
      logger.error('Error fetching dumpster count', { error })
      res.status(500).json({ message: 'Error fetching dumpster count', error })
    }
  }
}

export default new DumpsterController()
