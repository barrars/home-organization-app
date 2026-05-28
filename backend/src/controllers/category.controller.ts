import { Request, Response } from 'express'
import { Category } from '../models/category.model'
import logger from '../utils/logger'

class CategoryController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Category.find({ homeId: req.homeId }).sort({ name: 1 })
      res.json(categories)
    } catch (error) {
      logger.error('Error fetching categories', { error })
      res.status(500).json({ message: 'Error fetching categories', error })
    }
  }

  async findOrCreate(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body as { name: string }
      const trimmed = name.trim()
      const category = await Category.findOneAndUpdate(
        { homeId: req.homeId, name: trimmed },
        { homeId: req.homeId, name: trimmed },
        { upsert: true, returnDocument: 'after' },
      )
      res.status(201).json(category)
    } catch (error) {
      logger.error('Error creating category', { error })
      res.status(400).json({ message: 'Error creating category', error })
    }
  }
}

export default new CategoryController()
