import { Request, Response } from 'express'
import { Tag } from '../models/tag.model'
import { Item } from '../models/inventory.model'
import logger from '../utils/logger'

class TagController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.query as { roomId?: string }
      if (roomId) {
        const tagIds = await Item.find({ homeId: req.homeId, roomId }).distinct('tags')
        const tags = await Tag.find({ homeId: req.homeId, _id: { $in: tagIds } }).sort({ name: 1 })
        res.json(tags)
      } else {
        const tags = await Tag.find({ homeId: req.homeId }).sort({ name: 1 })
        res.json(tags)
      }
    } catch (error) {
      logger.error('Error fetching tags', { error })
      res.status(500).json({ message: 'Error fetching tags', error })
    }
  }

  async findOrCreate(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body as { name: string }
      const normalizedName = String(name ?? '').trim()
      if (!normalizedName) {
        res.status(400).json({ message: 'Tag name is required' })
        return
      }

      const tag = await Tag.findOneAndUpdate(
        { homeId: req.homeId, name: normalizedName },
        { homeId: req.homeId, name: normalizedName },
        {
          upsert: true,
          returnDocument: 'after',
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      res.status(201).json(tag)
    } catch (error) {
      logger.error('Error creating tag', { error })
      res.status(400).json({ message: 'Error creating tag', error })
    }
  }
}

export default new TagController()
