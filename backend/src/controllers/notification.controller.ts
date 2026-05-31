import { Request, Response } from 'express'
import { Notification } from '../models/notification.model'
import logger from '../utils/logger'

class NotificationController {
  /**
   * GET /api/notifications
   * Get notifications for the current home. Supports ?unreadOnly=true and ?limit=50
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { unreadOnly, limit } = req.query as { unreadOnly?: string; limit?: string }
      const filter: Record<string, unknown> = { homeId: req.homeId }
      if (unreadOnly === 'true') {
        filter.read = false
      }
      const maxResults = Math.min(parseInt(limit ?? '50', 10) || 50, 200)

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(maxResults)
        .lean()

      res.json(notifications)
    } catch (error) {
      logger.error('Error fetching notifications', { error })
      res.status(500).json({ message: 'Failed to fetch notifications' })
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Returns the count of unread notifications.
   */
  async unreadCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await Notification.countDocuments({ homeId: req.homeId, read: false })
      res.json({ count })
    } catch (error) {
      logger.error('Error fetching unread count', { error })
      res.status(500).json({ message: 'Failed to fetch unread count' })
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read.
   */
  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const notification = await Notification.findOneAndUpdate(
        { _id: id, homeId: req.homeId },
        { read: true },
        { returnDocument: 'after' },
      )
      if (!notification) {
        res.status(404).json({ message: 'Notification not found' })
        return
      }
      res.json(notification)
    } catch (error) {
      logger.error('Error marking notification as read', { error })
      res.status(500).json({ message: 'Failed to mark notification as read' })
    }
  }

  /**
   * POST /api/notifications/mark-all-read
   * Mark all notifications for this home as read.
   */
  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      await Notification.updateMany({ homeId: req.homeId, read: false }, { read: true })
      res.json({ message: 'All notifications marked as read' })
    } catch (error) {
      logger.error('Error marking all notifications as read', { error })
      res.status(500).json({ message: 'Failed to mark all as read' })
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a single notification.
   */
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const notification = await Notification.findOneAndDelete({ _id: id, homeId: req.homeId })
      if (!notification) {
        res.status(404).json({ message: 'Notification not found' })
        return
      }
      res.json({ message: 'Notification deleted' })
    } catch (error) {
      logger.error('Error deleting notification', { error })
      res.status(500).json({ message: 'Failed to delete notification' })
    }
  }
}

export default new NotificationController()
