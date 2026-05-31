import { Router } from 'express'
import notificationController from '../controllers/notification.controller'

const router = Router()

router.get('/', notificationController.list.bind(notificationController))
router.get('/unread-count', notificationController.unreadCount.bind(notificationController))
router.patch('/:id/read', notificationController.markRead.bind(notificationController))
router.post('/mark-all-read', notificationController.markAllRead.bind(notificationController))
router.delete('/:id', notificationController.remove.bind(notificationController))

export default router
