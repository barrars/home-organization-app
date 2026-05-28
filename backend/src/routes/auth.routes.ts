import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import authController from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

const initLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many join attempts, please try again later.' },
})

const switchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many switch attempts, please try again later.' },
})

router.post('/init', initLimiter, authController.init.bind(authController))
router.get('/join', joinLimiter, authController.join.bind(authController))
router.post('/switch', switchLimiter, authController.switch.bind(authController))
router.get('/share', authMiddleware, authController.share.bind(authController))
router.patch('/home', authMiddleware, authController.patchHome.bind(authController))

export default router
