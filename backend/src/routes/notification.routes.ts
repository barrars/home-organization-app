import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import notificationController from '../controllers/notification.controller'

const router = Router()

const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

router.get('/', notificationLimiter, notificationController.list.bind(notificationController))
router.get('/unread-count', notificationLimiter, notificationController.unreadCount.bind(notificationController))
router.patch('/:id/read', notificationLimiter, notificationController.markRead.bind(notificationController))
router.post('/mark-all-read', notificationLimiter, notificationController.markAllRead.bind(notificationController))
router.delete('/:id', notificationLimiter, notificationController.remove.bind(notificationController))

export default router
