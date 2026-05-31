import { Request, Response } from 'express'
import { Room } from '../models/room.model'
import { Home } from '../models/home.model'
import logger from '../utils/logger'
import { emitToHome, notifyShareRecipients } from '../utils/socket'

class RoomController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const rooms = await Room.find({ homeId: req.homeId, deletedAt: null }).sort({ name: 1 })
      res.json(rooms)
    } catch (error) {
      logger.error('Error fetching rooms', { error })
      res.status(500).json({ message: 'Error fetching rooms', error })
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const room = new Room({ ...req.body, homeId: req.homeId })
      const saved = await room.save()
      const homeDoc = await Home.findById(req.homeId, 'name').lean()
      const homeName = homeDoc?.name ?? ''
      emitToHome(req.homeId, 'room:created', { id: saved._id, homeId: req.homeId, roomName: saved.name, homeName })
      res.status(201).json(saved)
    } catch (error) {
      logger.error('Error creating room', { error })
      res.status(400).json({ message: 'Error creating room', error })
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, icon } = req.body
      const updated = await Room.findOneAndUpdate(
        { _id: req.params.id, homeId: req.homeId },
        { name, description, icon },
        { returnDocument: 'after', runValidators: true },
      )
      if (!updated) {
        res.status(404).json({ message: 'Room not found' })
        return
      }
      const homeDoc = await Home.findById(req.homeId, 'name').lean()
      const homeName = homeDoc?.name ?? ''
      emitToHome(req.homeId, 'room:updated', { id: updated._id, homeId: req.homeId, roomName: updated.name, homeName })
      notifyShareRecipients(
        [{ targetType: 'room', targetId: updated._id }],
        'share:room:updated',
        { roomId: updated._id, roomName: updated.name, homeName },
      )
      res.json(updated)
    } catch (error) {
      logger.error('Error updating room', { id: req.params.id, error })
      res.status(400).json({ message: 'Error updating room', error })
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const removed = await Room.findOneAndUpdate(
        { _id: req.params.id, homeId: req.homeId },
        { deletedAt: new Date() },
        { returnDocument: 'after' },
      )
      if (removed) {
        const homeDoc = await Home.findById(req.homeId, 'name').lean()
        const homeName = homeDoc?.name ?? ''
        emitToHome(req.homeId, 'room:deleted', { id: removed._id, homeId: req.homeId, roomName: removed.name, homeName })
      } else {
        emitToHome(req.homeId, 'room:deleted', { id: req.params.id, homeId: req.homeId })
      }
      res.json({ message: 'Room moved to dumpster' })
    } catch (error) {
      logger.error('Error deleting room', { id: req.params.id, error })
      res.status(500).json({ message: 'Error deleting room', error })
    }
  }
}

export default new RoomController()
