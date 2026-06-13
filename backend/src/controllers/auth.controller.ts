import { Request, Response } from 'express'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { Home } from '../models/home.model'
import { Room } from '../models/room.model'
import { Item } from '../models/inventory.model'
import { Share } from '../models/share.model'
import { ShareLink } from '../models/shareLink.model'
import { Notification } from '../models/notification.model'
import { HomeInvite } from '../models/homeInvite.model'
import { List } from '../models/list.model'
import { ListItem } from '../models/listItem.model'
import { Category } from '../models/category.model'
import { Tag } from '../models/tag.model'
import logger from '../utils/logger'
import { emitToHome } from '../utils/socket'

const COOKIE_NAME = 'home_token'
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000
const MAX_HOMES_PER_DEVICE = 3

function setCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: TEN_YEARS_MS,
    path: '/',
  })
}

async function countDeviceHomes(deviceId: string): Promise<number> {
  if (!deviceId) return 0
  return Home.countDocuments({ deviceIds: deviceId })
}

class AuthController {
  /**
   * POST /api/auth/init
   * Idempotent: creates a new Home if no valid cookie exists, otherwise returns the existing one.
   * Enforces max homes per device via device_id cookie.
   * Rate-limited upstream.
   */
  async init(req: Request, res: Response): Promise<void> {
    try {
      const existingToken = req.cookies?.[COOKIE_NAME] as string | undefined

      if (existingToken) {
        const existing = await Home.findOne({ token: existingToken })
        if (existing) {
          setCookie(res, existing.token)
          res.json({ id: existing._id, token: existing.token, isNew: false, name: existing.name })
          return
        }
      }

      const deviceId = req.deviceId
      const deviceCount = await countDeviceHomes(deviceId)
      if (deviceCount >= MAX_HOMES_PER_DEVICE) {
        res.status(403).json({
          message: `Maximum of ${MAX_HOMES_PER_DEVICE} homes per device. Delete an existing home first.`,
        })
        return
      }

      const token = crypto.randomBytes(32).toString('hex')
      const home = await Home.create({ token, deviceIds: [deviceId] })
      setCookie(res, home.token)
      logger.info('New home created via init', { homeId: home._id, deviceId })
      res.status(201).json({ id: home._id, token: home.token, isNew: true, name: home.name })
    } catch (error) {
      logger.error('Error during auth init', { error })
      res.status(500).json({ message: 'Failed to initialize home' })
    }
  }

  /**
   * GET /api/auth/join?token=XXXX
   * Validates a token and sets the cookie, then redirects to the app root.
   * This is how share links work.
   */
  async join(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query as { token?: string }
      if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        res.status(400).json({ message: 'Invalid token format' })
        return
      }

      const home = await Home.findOne({ token })
      if (!home) {
        res.status(404).json({ message: 'Home not found. The token may be incorrect.' })
        return
      }

      const deviceId = req.deviceId
      const isAlreadyMember = home.deviceIds.includes(deviceId)
      if (!isAlreadyMember) {
        const deviceCount = await countDeviceHomes(deviceId)
        if (deviceCount >= MAX_HOMES_PER_DEVICE) {
          res.redirect(`/?error=too_many_homes&limit=${MAX_HOMES_PER_DEVICE}`)
          return
        }
        await home.updateOne({ $addToSet: { deviceIds: deviceId } })
      }

      setCookie(res, home.token)
      logger.info('Device joined home via share link', { homeId: home._id, deviceId })
      res.redirect('/')
    } catch (error) {
      logger.error('Error during auth join', { error })
      res.status(500).json({ message: 'Failed to join home' })
    }
  }

  /**
   * GET /api/auth/share
   * Returns the join URL for the current home. Requires a valid cookie (auth middleware applied).
   */
  async share(req: Request, res: Response): Promise<void> {
    try {
      const token = req.cookies?.[COOKIE_NAME] as string
      const proto = req.headers['x-forwarded-proto'] ?? req.protocol
      const host = req.headers['x-forwarded-host'] ?? req.headers.host
      const baseUrl = `${proto}://${host}`
      const joinUrl = `${baseUrl}/api/auth/join?token=${token}`
      res.json({ joinUrl })
    } catch (error) {
      logger.error('Error generating share link', { error })
      res.status(500).json({ message: 'Failed to generate share link' })
    }
  }

  /**
   * POST /api/auth/switch
   * Switches the active home cookie to a different home the device already knows about.
   * The frontend passes a token it has stored in localStorage. We validate it exists in
   * MongoDB, then set it as the active cookie so the next request uses that home.
   * Stamps the deviceId on the home so the 3-home limit can count it.
   */
  async switch(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body as { token?: string }
      if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        res.status(400).json({ message: 'Invalid token format' })
        return
      }
      const home = await Home.findOne({ token })
      if (!home) {
        res.status(404).json({ message: 'Home not found.' })
        return
      }

      const deviceId = req.deviceId
      if (!home.deviceIds.includes(deviceId)) {
        const deviceCount = await countDeviceHomes(deviceId)
        if (deviceCount >= MAX_HOMES_PER_DEVICE) {
          res.status(403).json({
            message: `Maximum of ${MAX_HOMES_PER_DEVICE} homes per device. Delete an existing home first.`,
          })
          return
        }
        await home.updateOne({ $addToSet: { deviceIds: deviceId } })
      }

      setCookie(res, home.token)
      logger.info('Device switched active home', { homeId: home._id, deviceId })
      res.json({ id: home._id, token: home.token, name: home.name })
    } catch (error) {
      logger.error('Error switching home', { error })
      res.status(500).json({ message: 'Failed to switch home' })
    }
  }

  /**
   * POST /api/auth/rotate
   * Generates a fresh 64-char token for the current home, invalidating the old one.
   * Updates the cookie and returns the new join URL. Requires auth middleware.
   */
  async rotateToken(req: Request, res: Response): Promise<void> {
    try {
      const newToken = crypto.randomBytes(32).toString('hex')
      await req.home.updateOne({ token: newToken })
      setCookie(res, newToken)
      const proto = req.headers['x-forwarded-proto'] ?? req.protocol
      const host = req.headers['x-forwarded-host'] ?? req.headers.host
      const baseUrl = `${proto}://${host}`
      const joinUrl = `${baseUrl}/api/auth/join?token=${newToken}`
      logger.info('Home token rotated', { homeId: req.home._id })
      res.json({ token: newToken, joinUrl })
    } catch (error) {
      logger.error('Error rotating token', { error })
      res.status(500).json({ message: 'Failed to rotate token' })
    }
  }

  /**
   * PATCH /api/auth/home
   * Updates mutable home properties (currently: name). Requires auth middleware.
   */
  async patchHome(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body as { name?: string }
      if (!name || typeof name !== 'string') {
        res.status(400).json({ message: 'name is required' })
        return
      }
      const trimmed = name.trim().slice(0, 50)
      if (!trimmed) {
        res.status(400).json({ message: 'name cannot be empty' })
        return
      }
      await req.home.updateOne({ name: trimmed })
      emitToHome(req.home._id, 'home:renamed', { name: trimmed })
      res.json({ name: trimmed })
    } catch (error) {
      logger.error('Error updating home', { error })
      res.status(500).json({ message: 'Failed to update home' })
    }
  }

  /**
   * POST /api/auth/create
   * Always creates a brand-new home, regardless of an existing cookie.
   * Requires auth middleware (must be authenticated to some home).
   * Enforces max homes per device via device_id cookie.
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.deviceId
      const deviceCount = await countDeviceHomes(deviceId)
      if (deviceCount >= MAX_HOMES_PER_DEVICE) {
        res.status(403).json({
          message: `Maximum of ${MAX_HOMES_PER_DEVICE} homes per device. Delete an existing home first.`,
        })
        return
      }

      const token = crypto.randomBytes(32).toString('hex')
      const home = await Home.create({ token, deviceIds: [deviceId] })
      setCookie(res, home.token)
      logger.info('New home created via create', { homeId: home._id, deviceId })
      res.status(201).json({ id: home._id, token: home.token, name: home.name })
    } catch (error) {
      logger.error('Error creating home', { error })
      res.status(500).json({ message: 'Failed to create home' })
    }
  }

  /**
   * DELETE /api/auth/home/:id
   * Permanently deletes a home and all related data (rooms, items, shares, etc.).
   * Requires auth middleware. The target home's token must be provided in the body
   * to prove the caller has access rights. Cannot delete the currently active home.
   */
  async deleteHome(req: Request, res: Response): Promise<void> {
    try {
      const { token: targetToken } = req.body as { token?: string }
      if (!targetToken || typeof targetToken !== 'string' || !/^[a-f0-9]{64}$/.test(targetToken)) {
        res.status(400).json({ message: 'Invalid token format' })
        return
      }

      // Prevent deleting the home you're currently authenticated to
      if (targetToken === req.cookies?.[COOKIE_NAME]) {
        res
          .status(400)
          .json({ message: 'Cannot delete the active home. Switch to another home first.' })
        return
      }

      const homeId = new mongoose.Types.ObjectId(req.params.id)
      const home = await Home.findById(homeId)
      if (!home || home.token !== targetToken) {
        res.status(404).json({ message: 'Home not found.' })
        return
      }

      // Cascade delete all data belonging to this home
      await Promise.all([
        Room.deleteMany({ homeId }),
        Item.deleteMany({ homeId }),
        Share.deleteMany({ $or: [{ ownerHomeId: homeId }, { sharedWithHomeId: homeId }] }),
        ShareLink.deleteMany({ ownerHomeId: homeId }),
        Notification.deleteMany({ homeId }),
        HomeInvite.deleteMany({ homeId }),
        List.deleteMany({ homeId }),
        ListItem.deleteMany({ homeId }),
        Category.deleteMany({ homeId }),
        Tag.deleteMany({ homeId }),
      ])
      await Home.findByIdAndDelete(homeId)

      logger.info('Home permanently deleted', { homeId: home._id, name: home.name })
      res.json({ message: 'Home deleted' })
    } catch (error) {
      logger.error('Error deleting home', { error })
      res.status(500).json({ message: 'Failed to delete home' })
    }
  }
}

export default new AuthController()
