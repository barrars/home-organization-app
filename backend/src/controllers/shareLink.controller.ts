import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { ShareLink } from '../models/shareLink.model'
import { Share } from '../models/share.model'
import { Room } from '../models/room.model'
import { Item } from '../models/inventory.model'
import logger from '../utils/logger'

class ShareLinkController {
  /**
   * POST /api/share-links
   * Create (or return existing) share link for a target.
   * Body: { targetType, targetId, canEdit? }
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { targetType, targetId, canEdit } = req.body as {
        targetType?: string
        targetId?: string
        canEdit?: boolean
      }

      if (!targetType || !['room', 'item'].includes(targetType)) {
        res.status(400).json({ message: 'targetType must be room or item' })
        return
      }
      const validTargetType = targetType as 'room' | 'item'

      if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
        res.status(400).json({ message: 'Valid targetId is required' })
        return
      }

      const ownerHomeId = req.homeId

      // Verify ownership
      if (validTargetType === 'room') {
        const room = await Room.findOne({ _id: targetId, homeId: ownerHomeId, deletedAt: null })
        if (!room) {
          res.status(404).json({ message: 'Room not found or not owned by you' })
          return
        }
      } else {
        const item = await Item.findOne({ _id: targetId, homeId: ownerHomeId, deletedAt: null })
        if (!item) {
          res.status(404).json({ message: 'Item not found or not owned by you' })
          return
        }
      }

      // Upsert: one link per owner + target
      const shareLink = await ShareLink.findOneAndUpdate(
        {
          ownerHomeId,
          targetType: validTargetType,
          targetId: new mongoose.Types.ObjectId(targetId),
        },
        {
          $setOnInsert: { ownerHomeId, targetType: validTargetType, targetId: new mongoose.Types.ObjectId(targetId) },
          $set: { canEdit: !!canEdit, active: true },
        },
        { upsert: true, returnDocument: 'after' },
      )

      logger.info('Share link created/updated', { shareLinkId: shareLink._id, targetType, targetId })
      res.status(201).json(shareLink)
    } catch (error) {
      logger.error('Error creating share link', { error })
      res.status(500).json({ message: 'Failed to create share link' })
    }
  }

  /**
   * GET /api/share-links
   * Returns all share links owned by the current home.
   */
  async getMyLinks(req: Request, res: Response): Promise<void> {
    try {
      const links = await ShareLink.find({ ownerHomeId: req.homeId }).sort({ createdAt: -1 }).lean()
      res.json(links)
    } catch (error) {
      logger.error('Error fetching share links', { error })
      res.status(500).json({ message: 'Failed to fetch share links' })
    }
  }

  /**
   * PATCH /api/share-links/:id
   * Update canEdit and/or active. Body: { canEdit?, active? }
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { canEdit, active } = req.body as { canEdit?: boolean; active?: boolean }

      if (canEdit === undefined && active === undefined) {
        res.status(400).json({ message: 'Provide canEdit or active to update' })
        return
      }

      const patch: Record<string, boolean> = {}
      if (typeof canEdit === 'boolean') patch.canEdit = canEdit
      if (typeof active === 'boolean') patch.active = active

      const link = await ShareLink.findOneAndUpdate(
        { _id: id, ownerHomeId: req.homeId },
        { $set: patch },
        { returnDocument: 'after' },
      )

      if (!link) {
        res.status(404).json({ message: 'Share link not found or not owned by you' })
        return
      }

      res.json(link)
    } catch (error) {
      logger.error('Error updating share link', { error })
      res.status(500).json({ message: 'Failed to update share link' })
    }
  }

  /**
   * DELETE /api/share-links/:id
   * Revoke and delete a share link.
   */
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const link = await ShareLink.findOneAndDelete({ _id: id, ownerHomeId: req.homeId })
      if (!link) {
        res.status(404).json({ message: 'Share link not found or not owned by you' })
        return
      }
      res.json({ message: 'Share link revoked' })
    } catch (error) {
      logger.error('Error removing share link', { error })
      res.status(500).json({ message: 'Failed to remove share link' })
    }
  }

  /**
   * GET /api/public/share/:token
   * PUBLIC — no auth required.
   * Resolves a share link token and returns the target content.
   */
  async resolve(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params

      const link = await ShareLink.findOne({ token }).lean()
      if (!link) {
        res.status(404).json({ message: 'Share link not found' })
        return
      }
      if (!link.active) {
        res.status(403).json({ message: 'This share link has been disabled' })
        return
      }

      let target: unknown = null
      if (link.targetType === 'room') {
        const room = await Room.findOne({ _id: link.targetId, deletedAt: null }, 'name description icon').lean()
        if (!room) {
          res.status(404).json({ message: 'Shared room no longer exists' })
          return
        }
        const items = await Item.find({ roomId: link.targetId, deletedAt: null })
          .populate('categories', 'name')
          .populate('tags', 'name')
          .lean()
        target = { ...room, items }
      } else {
        const item = await Item.findOne({ _id: link.targetId, deletedAt: null })
          .populate('categories', 'name')
          .populate('tags', 'name')
          .lean()
        if (!item) {
          res.status(404).json({ message: 'Shared item no longer exists' })
          return
        }
        target = item
      }

      res.json({
        targetType: link.targetType,
        canEdit: link.canEdit,
        target,
      })
    } catch (error) {
      logger.error('Error resolving share link', { error })
      res.status(500).json({ message: 'Failed to resolve share link' })
    }
  }

  /**
   * POST /api/share-links/:token/visit
   * AUTH REQUIRED. Called when a logged-in user opens a share link.
   * Upserts a Share record so the link appears in their "Shared With Me" list
   * and they receive future update notifications.
   */
  async visit(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params
      const viewerHomeId = req.homeId

      const link = await ShareLink.findOne({ token }).lean()
      if (!link) {
        res.status(404).json({ message: 'Share link not found' })
        return
      }
      if (!link.active) {
        res.status(403).json({ message: 'This share link has been disabled' })
        return
      }

      // Owner visiting their own link — nothing to register
      if (link.ownerHomeId.toString() === viewerHomeId.toString()) {
        res.status(204).end()
        return
      }

      await Share.findOneAndUpdate(
        {
          sharedWithHomeId: viewerHomeId,
          targetType: link.targetType,
          targetId: link.targetId,
        },
        {
          $set: {
            ownerHomeId: link.ownerHomeId,
            canEdit: link.canEdit,
          },
        },
        { upsert: true },
      )

      logger.info('Share visit registered', { token, viewerHomeId })
      res.status(204).end()
    } catch (error) {
      logger.error('Error registering share link visit', { error })
      res.status(500).json({ message: 'Failed to register visit' })
    }
  }
}

export default new ShareLinkController()
