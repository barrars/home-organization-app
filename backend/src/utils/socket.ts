import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { Home } from '../models/home.model'

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
}
