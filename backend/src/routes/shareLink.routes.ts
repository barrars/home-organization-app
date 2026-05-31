import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import shareLinkController from '../controllers/shareLink.controller'

const router = Router()

const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

// Authenticated routes (authMiddleware applied in app.ts)
router.post('/', linkLimiter, shareLinkController.create.bind(shareLinkController))
router.get('/', shareLinkController.getMyLinks.bind(shareLinkController))
router.post('/:token/visit', linkLimiter, shareLinkController.visit.bind(shareLinkController))
router.patch('/:id', linkLimiter, shareLinkController.update.bind(shareLinkController))
router.delete('/:id', linkLimiter, shareLinkController.remove.bind(shareLinkController))

export default router
