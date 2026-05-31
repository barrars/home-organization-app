import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import shareController from '../controllers/share.controller'

const router = Router()

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

router.post('/', shareLimiter, shareController.create.bind(shareController))
router.get('/shared-with-me', shareController.sharedWithMe.bind(shareController))
router.get('/shared-by-me', shareController.sharedByMe.bind(shareController))
router.patch('/:id', shareLimiter, shareController.update.bind(shareController))
router.delete('/:id', shareLimiter, shareController.remove.bind(shareController))

export default router
