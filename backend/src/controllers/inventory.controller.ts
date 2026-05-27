import { Request, Response } from 'express'
import { Item } from '../models/inventory.model'
import { Room } from '../models/room.model'
import logger from '../utils/logger'
import { getIO } from '../utils/socket'

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = (target ?? '').toLowerCase()
  if (!q || !t) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  // fuzzy: all chars of query appear in order inside target
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  if (qi === q.length) return Math.round(30 * (q.length / t.length))
  return 0
}

function sanitizeImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

function normalizeImagePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const hasImageUrl = Object.prototype.hasOwnProperty.call(payload, 'imageUrl')
  const hasImageUrls = Object.prototype.hasOwnProperty.call(payload, 'imageUrls')
  if (!hasImageUrl && !hasImageUrls) return payload

  const fromArray = sanitizeImageUrls(payload.imageUrls)
  const fromSingle = typeof payload.imageUrl === 'string' ? payload.imageUrl.trim() : ''
  const imageUrls = fromArray.length > 0 ? fromArray : fromSingle ? [fromSingle] : []
  return {
    ...payload,
    imageUrls,
    imageUrl: imageUrls[0] ?? '',
  }
}

class ItemController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filter: Record<string, unknown> = { deletedAt: null }
      if (req.query.roomId) filter.roomId = req.query.roomId
      const items = await Item.find(filter)
        .populate('categories', 'name')
        .populate('tags', 'name')
        .sort({ name: 1 })
      res.json(items)
    } catch (error) {
      logger.error('Error fetching items', { error })
      res.status(500).json({ message: 'Error fetching items', error })
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const item = new Item(normalizeImagePayload(req.body as Record<string, unknown>))
      const saved = await item.save()
      const populated = await Item.findById(saved._id)
        .populate('categories', 'name')
        .populate('tags', 'name')
      getIO().emit('item:created', { id: saved._id })
      res.status(201).json(populated)
    } catch (error) {
      logger.error('Error creating item', { error })
      res.status(400).json({ message: 'Error creating item', error })
    }
  }

  async bulkInsert(req: Request, res: Response): Promise<void> {
    try {
      const docs = Array.isArray(req.body)
        ? req.body.map((row) => normalizeImagePayload(row as Record<string, unknown>))
        : req.body
      const result = await Item.insertMany(docs)
      getIO().emit('item:created', { bulk: true })
      res.status(201).json({ message: 'Items added successfully', result })
    } catch (error) {
      logger.error('Error bulk inserting items', { error })
      res.status(400).json({ message: 'Error adding items', error })
    }
  }
  async patch(req: Request, res: Response): Promise<void> {
    try {
      const updatePayload = normalizeImagePayload(req.body as Record<string, unknown>)
      const item = await Item.findByIdAndUpdate(
        req.params.id,
        { $set: updatePayload },
        { returnDocument: 'after' },
      )
        .populate('categories', 'name')
        .populate('tags', 'name')
      getIO().emit('item:updated', { id: req.params.id })
      res.json(item)
    } catch (error) {
      logger.error('Error updating item', { id: req.params.id, error })
      res.status(400).json({ message: 'Error updating item', error })
    }
  }
  async remove(req: Request, res: Response): Promise<void> {
    try {
      await Item.findByIdAndUpdate(req.params.id, { deletedAt: new Date() })
      getIO().emit('item:deleted', { id: req.params.id })
      res.json({ message: 'Item moved to dumpster' })
    } catch (error) {
      logger.error('Error deleting item', { id: req.params.id, error })
      res.status(500).json({ message: 'Error deleting item', error })
    }
  }

  /** GET /api/items/search?q=... — fuzzy search across name, notes, categories, tags */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const q = String(req.query.q ?? '').trim()
      if (!q) { res.json([]); return }

      const items = await Item.find({ deletedAt: null })
        .populate('categories', 'name')
        .populate('tags', 'name')
        .populate('roomId', 'name')
        .lean()

      const scored = items
        .map((item) => {
          const catNames = (item.categories as unknown as { name: string }[]).map((c) => c.name).join(' ')
          const tagNames = (item.tags as unknown as { name: string }[]).map((t) => t.name).join(' ')
          const best = Math.max(
            fuzzyScore(q, item.name),
            fuzzyScore(q, item.notes ?? ''),
            fuzzyScore(q, catNames),
            fuzzyScore(q, tagNames),
          )
          return { ...item, _score: best }
        })
        .filter((i) => i._score > 0)
        .sort((a, b) => b._score - a._score)

      res.json(scored)
    } catch (error) {
      logger.error('Error searching items', { error })
      res.status(500).json({ message: 'Error searching items', error })
    }
  }

  /** GET /api/items/counts-by-room — active item count per room */
  async countsByRoom(_req: Request, res: Response): Promise<void> {
    try {
      const agg = await Item.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$roomId', count: { $sum: 1 } } },
      ])
      const result: Record<string, number> = {}
      for (const row of agg) {
        result[String(row._id)] = row.count
      }
      res.json(result)
    } catch (error) {
      logger.error('Error fetching item counts by room', { error })
      res.status(500).json({ message: 'Error fetching counts', error })
    }
  }

  /** GET /api/items/yard-sale — active items whose room has been soft-deleted */
  async getYardSale(_req: Request, res: Response): Promise<void> {
    try {
      const deletedRoomIds = await Room.find({ deletedAt: { $ne: null } }).distinct('_id')
      const items = await Item.find({ deletedAt: null, roomId: { $in: deletedRoomIds } })
        .populate('categories', 'name')
        .populate('tags', 'name')
        .populate('roomId', 'name')
        .sort({ name: 1 })
      res.json(items)
    } catch (error) {
      logger.error('Error fetching yard sale items', { error })
      res.status(500).json({ message: 'Error fetching yard sale items', error })
    }
  }

  /** GET /api/items/yard-sale/count */
  async getYardSaleCount(_req: Request, res: Response): Promise<void> {
    try {
      const deletedRoomIds = await Room.find({ deletedAt: { $ne: null } }).distinct('_id')
      const total = await Item.countDocuments({ deletedAt: null, roomId: { $in: deletedRoomIds } })
      res.json({ total })
    } catch (error) {
      logger.error('Error counting yard sale items', { error })
      res.status(500).json({ message: 'Error counting yard sale items', error })
    }
  }
}

export default new ItemController()
