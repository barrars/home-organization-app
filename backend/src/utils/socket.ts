import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

let io: Server

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)
    socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`))
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket() first')
  return io
}
