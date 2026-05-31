import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import type mongoose from 'mongoose'
import { Home } from '../models/home.model'
import { Notification } from '../models/notification.model'
import { Share } from '../models/share.model'
import { ShareLink } from '../models/shareLink.model'

let io: Server

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // Client sends the list of home tokens it wants live updates for.
    // We validate each against MongoDB and join the corresponding room.
    socket.on('subscribe:homes', async (tokens: unknown) => {
      if (!Array.isArray(tokens)) return
      // Sanitize: only hex-64 strings, max 20 homes
      const valid = tokens
        .filter((t): t is string => typeof t === 'string' && /^[a-f0-9]{64}$/.test(t))
        .slice(0, 20)

      for (const token of valid) {
        const home = await Home.findOne({ token }, '_id').lean()
        if (home) {
          const room = `home:${home._id}`
          socket.join(room)
          console.log(`[socket] ${socket.id} joined ${room}`)
        }
      }
    })

    socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`))
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket() first')
  return io
}

/** Emit an event only to clients subscribed to a specific home. */
export function emitToHome(
  homeId: import('mongoose').Types.ObjectId | string,
  event: string,
  data: unknown,
): void {
  getIO().to(`home:${homeId}`).emit(event, data)

  // Persist as a notification so offline users can catch up later
  Notification.create({
    homeId,
    event,
    data: (data && typeof data === 'object' ? data : { payload: data }) as Record<string, unknown>,
  }).catch((err) => {
    console.error('[socket] Failed to persist notification', err)
  })
}

/**
 * Find every home that has a Share record for any of the given targets,
 * then emit `event` + create a notification for each recipient.
 * Used to push updates to homes that are watching a shared room or item.
 */
export async function notifyShareRecipients(
  targets: Array<{ targetType: 'room' | 'item'; targetId: mongoose.Types.ObjectId }>,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    if (targets.length === 0) return
    const shares = await Share.find({
      $or: targets.map(({ targetType, targetId }) => ({ targetType, targetId })),
    })
      .select('sharedWithHomeId ownerHomeId targetType targetId')
      .lean()

    if (shares.length === 0) return

    // Look up active ShareLink tokens so recipients can navigate directly
    // Only room/item shares have ShareLinks (home shares don't)
    const linkableShares = shares.filter(
      (s): s is typeof s & { targetType: 'room' | 'item' } =>
        s.targetType === 'room' || s.targetType === 'item',
    )

    const shareLinkDocs = linkableShares.length
      ? await ShareLink.find({
          $or: linkableShares.map((s) => ({
            ownerHomeId: s.ownerHomeId,
            targetType: s.targetType,
            targetId: s.targetId,
            active: true,
          })),
        })
          .select('ownerHomeId targetType targetId token')
          .lean()
      : []

    const tokenMap = new Map<string, string>()
    for (const sl of shareLinkDocs) {
      const key = `${sl.ownerHomeId}:${sl.targetType}:${sl.targetId}`
      tokenMap.set(key, sl.token)
    }

    // Deduplicate recipients and emit with the appropriate share link token
    const seen = new Set<string>()
    for (const share of shares) {
      const recipientId = share.sharedWithHomeId.toString()
      if (!seen.has(recipientId)) {
        seen.add(recipientId)
        const key = `${share.ownerHomeId}:${share.targetType}:${share.targetId}`
        const shareLinkToken = tokenMap.get(key) ?? null
        emitToHome(recipientId, event, { ...data, shareLinkToken })
      }
    }
  } catch (err) {
    console.error('[socket] Failed to notify share recipients', err)
  }
}
