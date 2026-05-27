import express from 'express'
import cors from 'cors'
import http from 'http'
import path from 'path'
import mongoose from 'mongoose'
import morgan from 'morgan'
import logger, { morganStream } from './utils/logger'
import { initSocket } from './utils/socket'
import roomRouter from './routes/room.routes'
import categoryRouter from './routes/category.routes'
import tagRouter from './routes/tag.routes'
import itemRouter from './routes/inventory.routes'
import uploadRouter from './routes/upload.routes'
import dumpsterRouter from './routes/dumpster.routes'

const app = express()
const PORT = process.env.PORT || 5000

// HTTP request logging via morgan → winston
app.use(morgan('combined', { stream: morganStream }))

// Middleware
app.use(cors())
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

// Routes
app.use('/api/upload', uploadRouter)
app.use('/api/rooms', roomRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/tags', tagRouter)
app.use('/api/items', itemRouter)
app.use('/api/dumpster', dumpsterRouter)

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
