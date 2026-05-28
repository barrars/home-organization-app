/// <reference path="./types/express.d.ts" />
import express from 'express'
import cors from 'cors'
import http from 'http'
import path from 'path'
import mongoose from 'mongoose'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import logger, { morganStream } from './utils/logger'
import { initSocket } from './utils/socket'
import roomRouter from './routes/room.routes'
import categoryRouter from './routes/category.routes'
import tagRouter from './routes/tag.routes'
import itemRouter from './routes/inventory.routes'
import uploadRouter from './routes/upload.routes'
import dumpsterRouter from './routes/dumpster.routes'
import authRouter from './routes/auth.routes'
import { authMiddleware } from './middleware/authMiddleware'

const app = express()
const PORT = process.env.PORT || 5000

// HTTP request logging via morgan → winston
app.use(morgan('combined', { stream: morganStream }))

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000']
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. same-origin, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB connection
mongoose
  .connect('mongodb://localhost:27017/home-organization')
  .then(() => {
    logger.info('Connected to MongoDB')
  })
  .catch((err) => {
    logger.error('MongoDB connection error', { error: err })
    process.exit(1)
  })

// Static uploads
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// Serve built frontend
app.use(express.static(path.resolve(__dirname, '../public')))

// Auth routes — no authMiddleware here (init and join are public)
app.use('/api/auth', authRouter)

// All other API routes require a valid home token
app.use('/api/upload', authMiddleware, uploadRouter)
app.use('/api/rooms', authMiddleware, roomRouter)
app.use('/api/categories', authMiddleware, categoryRouter)
app.use('/api/tags', authMiddleware, tagRouter)
app.use('/api/items', authMiddleware, itemRouter)
app.use('/api/dumpster', authMiddleware, dumpsterRouter)

// SPA fallback — must be after API routes
app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/index.html'))
})

// Start the server
const server = http.createServer(app)
initSocket(server)
server.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`)
})
