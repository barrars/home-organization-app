import { Request, Response } from 'express'
import { Category } from '../models/category.model'
import logger from '../utils/logger'

class CategoryController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await Category.find().sort({ name: 1 })
      res.json(categories)
    } catch (error) {
      logger.error('Error fetching categories', { error })
      res.status(500).json({ message: 'Error fetching categories', error })
    }
  }

  async findOrCreate(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body as { name: string }
      const category = await Category.findOneAndUpdate(
        { name: name.trim() },
        { name: name.trim() },
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
