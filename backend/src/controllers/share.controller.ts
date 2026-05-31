import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Share } from '../models/share.model'
import { Home } from '../models/home.model'
import { Room } from '../models/room.model'
import { Item } from '../models/inventory.model'
import logger from '../utils/logger'

class ShareController {
  /**
   * POST /api/shares
   * Create a new share. Body: { targetType, targetId, sharedWithToken, canEdit }
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { targetType, targetId, sharedWithToken, canEdit } = req.body as {
        targetType?: string
        targetId?: string
        sharedWithToken?: string
        canEdit?: boolean
      }

      if (!targetType || !['home', 'room', 'item'].includes(targetType)) {
        res.status(400).json({ message: 'targetType must be home, room, or item' })
        return
      }
      const validTargetType = targetType as 'home' | 'room' | 'item'
      if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
        res.status(400).json({ message: 'Valid targetId is required' })
        return
      }
      if (!sharedWithToken || typeof sharedWithToken !== 'string') {
        res.status(400).json({ message: 'sharedWithToken is required' })
        return
      }

      // Verify the target home exists
      const sharedWithHome = await Home.findOne({ token: sharedWithToken })
      if (!sharedWithHome) {
        res.status(404).json({ message: 'Target home not found' })
        return
      }

      // Cannot share with yourself
      if (sharedWithHome._id.toString() === req.homeId.toString()) {
        res.status(400).json({ message: 'Cannot share with yourself' })
        return
      }

      // Verify ownership of the target resource
      const ownerHomeId = req.homeId
      if (validTargetType === 'home') {
        if (targetId !== ownerHomeId.toString()) {
          res.status(403).json({ message: 'You can only share your own home' })
          return
        }
      } else if (validTargetType === 'room') {
        const room = await Room.findOne({ _id: targetId, homeId: ownerHomeId, deletedAt: null })
        if (!room) {
          res.status(404).json({ message: 'Room not found or not owned by you' })
          return
        }
      } else if (validTargetType === 'item') {
        const item = await Item.findOne({ _id: targetId, homeId: ownerHomeId, deletedAt: null })
        if (!item) {
          res.status(404).json({ message: 'Item not found or not owned by you' })
          return
        }
      }

      const existingShare = await Share.findOne({
        sharedWithHomeId: sharedWithHome._id,
        targetType: validTargetType,
        targetId: new mongoose.Types.ObjectId(targetId),
      })

      let share
      if (existingShare) {
        existingShare.canEdit = !!canEdit
        existingShare.ownerHomeId = ownerHomeId
        await existingShare.save()
        share = existingShare.toObject()
      } else {
        const created = await Share.create({
          ownerHomeId,
          sharedWithHomeId: sharedWithHome._id,
          targetType: validTargetType,
          targetId: new mongoose.Types.ObjectId(targetId),
          canEdit: !!canEdit,
        })
        share = created.toObject()
      }

      logger.info('Share created', { shareId: share._id, targetType: validTargetType, targetId })
      res.status(201).json(share)
    } catch (error) {
      logger.error('Error creating share', { error })
      res.status(500).json({ message: 'Failed to create share' })
    }
  }

  /**
   * GET /api/shares/shared-with-me
   * Returns all shares where the current home is the recipient.
   */
  async sharedWithMe(req: Request, res: Response): Promise<void> {
    try {
      const shares = await Share.find({ sharedWithHomeId: req.homeId })
        .sort({ createdAt: -1 })
        .lean()

      // Populate target details
      const populated = await Promise.all(
        shares.map(async (share) => {
          let target: unknown = null
          if (share.targetType === 'home') {
            target = await Home.findById(share.targetId, 'name').lean()
          } else if (share.targetType === 'room') {
            target = await Room.findById(share.targetId, 'name description icon').lean()
          } else if (share.targetType === 'item') {
            target = await Item.findById(
              share.targetId,
              'name quantity roomId notes imageUrl',
            ).lean()
          }
          return { ...share, target }
        }),
      )

      res.json(populated)
    } catch (error) {
      logger.error('Error fetching shared-with-me', { error })
      res.status(500).json({ message: 'Failed to fetch shared items' })
    }
  }

  /**
   * GET /api/shares/shared-by-me
   * Returns all shares where the current home is the owner.
   */
  async sharedByMe(req: Request, res: Response): Promise<void> {
    try {
      const shares = await Share.find({ ownerHomeId: req.homeId }).sort({ createdAt: -1 }).lean()

      res.json(shares)
    } catch (error) {
      logger.error('Error fetching shared-by-me', { error })
      res.status(500).json({ message: 'Failed to fetch shares' })
    }
  }

  /**
   * PATCH /api/shares/:id
   * Update share permissions. Body: { canEdit }
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { canEdit } = req.body as { canEdit?: boolean }

      if (typeof canEdit !== 'boolean') {
        res.status(400).json({ message: 'canEdit (boolean) is required' })
        return
      }

      const share = await Share.findOneAndUpdate(
        { _id: id, ownerHomeId: req.homeId },
        { canEdit },
        { new: true },
      )

      if (!share) {
        res.status(404).json({ message: 'Share not found or not owned by you' })
        return
      }

      res.json(share)
    } catch (error) {
      logger.error('Error updating share', { error })
      res.status(500).json({ message: 'Failed to update share' })
    }
  }

  /**
   * DELETE /api/shares/:id
   * Remove a share. Owner can revoke, or recipient can remove from their list.
   */
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const homeId = req.homeId

      const share = await Share.findOneAndDelete({
        _id: id,
        $or: [{ ownerHomeId: homeId }, { sharedWithHomeId: homeId }],
      })

      if (!share) {
        res.status(404).json({ message: 'Share not found' })
        return
      }

      res.json({ message: 'Share removed' })
    } catch (error) {
      logger.error('Error removing share', { error })
      res.status(500).json({ message: 'Failed to remove share' })
    }
  }
}

export default new ShareController()
