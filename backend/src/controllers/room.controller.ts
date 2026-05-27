import { Request, Response } from 'express'
import { Room } from '../models/room.model'
import logger from '../utils/logger'
import { getIO } from '../utils/socket'

class RoomController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const rooms = await Room.find({ deletedAt: null }).sort({ name: 1 })
      res.json(rooms)
    } catch (error) {
      logger.error('Error fetching rooms', { error })
      res.status(500).json({ message: 'Error fetching rooms', error })
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const room = new Room(req.body)
      const saved = await room.save()
      getIO().emit('room:created', { id: saved._id })
      res.status(201).json(saved)
    } catch (error) {
      logger.error('Error creating room', { error })
      res.status(400).json({ message: 'Error creating room', error })
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, icon } = req.body
      const updated = await Room.findByIdAndUpdate(
        req.params.id,
        { name, description, icon },
        { new: true, runValidators: true },
      )
      if (!updated) {
        res.status(404).json({ message: 'Room not found' })
        return
      }
      getIO().emit('room:updated', { id: updated._id })
      res.json(updated)
    } catch (error) {
      logger.error('Error updating room', { id: req.params.id, error })
      res.status(400).json({ message: 'Error updating room', error })
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      await Room.findByIdAndUpdate(req.params.id, { deletedAt: new Date() })
      getIO().emit('room:deleted', { id: req.params.id })
      res.json({ message: 'Room moved to dumpster' })
    } catch (error) {
      logger.error('Error deleting room', { id: req.params.id, error })
      res.status(500).json({ message: 'Error deleting room', error })
    }
  }
}

export default new RoomController()
