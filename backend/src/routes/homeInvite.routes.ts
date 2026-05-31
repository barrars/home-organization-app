import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import homeInviteController from '../controllers/homeInvite.controller'

const router = Router()

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/home-invites — generate invite (auth required, applied at app level)
router.post('/', inviteLimiter, homeInviteController.create.bind(homeInviteController))

export default router
