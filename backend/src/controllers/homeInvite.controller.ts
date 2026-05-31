import { Request, Response } from 'express'
import { HomeInvite } from '../models/homeInvite.model'
import { Home } from '../models/home.model'
import logger from '../utils/logger'

class HomeInviteController {
  /**
   * POST /api/home-invites
   * Generate a new invite link for the current home.
   * Body: { mode: 'view' | 'join' }
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const mode = (req.body as { mode?: string }).mode
      if (!mode || !['view', 'join'].includes(mode)) {
        res.status(400).json({ message: 'mode must be "view" or "join"' })
        return
      }

      const invite = await HomeInvite.create({
        homeId: req.homeId,
        mode: mode as 'view' | 'join',
      })

      res.status(201).json(invite)
    } catch (error) {
      logger.error('Error creating home invite', { error })
      res.status(500).json({ message: 'Error creating invite' })
    }
  }

  /**
   * GET /api/public/invite/:token
   * Public — resolve invite metadata (home name, mode, expiry, claimed).
   */
  async resolve(req: Request, res: Response): Promise<void> {
    try {
      const invite = await HomeInvite.findOne({ token: req.params.token })
        .populate<{ homeId: { name: string } }>('homeId', 'name')
        .lean()

      if (!invite) {
        res.status(404).json({ message: 'Invite not found' })
        return
      }

      if (invite.expiresAt < new Date()) {
        res.status(410).json({ message: 'This invite link has expired' })
        return
      }

      if (invite.claimedAt) {
        res.status(410).json({ message: 'This invite link has already been used' })
        return
      }

      res.json({
        mode: invite.mode,
        homeName: (invite.homeId as unknown as { name: string }).name,
        expiresAt: invite.expiresAt,
      })
    } catch (error) {
      logger.error('Error resolving home invite', { error })
      res.status(500).json({ message: 'Error resolving invite' })
    }
  }

  /**
   * POST /api/public/invite/:token/claim
   * Public — claim the invite:
   *   mode=join  → returns the real home token so the device can adopt it as primary
   *   mode=view  → returns homeId so the caller can visit shared rooms
   */
  async claim(req: Request, res: Response): Promise<void> {
    try {
      const invite = await HomeInvite.findOne({ token: req.params.token }).populate<{
        homeId: { _id: unknown; token: string; name: string }
      }>('homeId', 'token name')

      if (!invite) {
        res.status(404).json({ message: 'Invite not found' })
        return
      }

      if (invite.expiresAt < new Date()) {
        res.status(410).json({ message: 'This invite link has expired' })
        return
      }

      if (invite.claimedAt) {
        res.status(410).json({ message: 'This invite link has already been used' })
        return
      }

      // Mark as claimed (single-use)
      invite.claimedAt = new Date()
      await invite.save()

      const home = invite.homeId as unknown as { _id: unknown; token: string; name: string }

      if (invite.mode === 'join') {
        // Give the caller the real home token so they can adopt this as their primary home
        res.json({ mode: 'join', homeToken: home.token, homeName: home.name })
      } else {
        // view — just confirm who the home is so the UI can redirect to shared-with-me
        res.json({ mode: 'view', homeName: home.name })
      }
    } catch (error) {
      logger.error('Error claiming home invite', { error })
      res.status(500).json({ message: 'Error claiming invite' })
    }
  }
}

export default new HomeInviteController()
