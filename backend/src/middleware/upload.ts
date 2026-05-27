import multer from 'multer'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger'

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
  '.avif',
  '.bmp',
  '.tiff',
  '.tif',
])

const uploadsDir = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase()
  // Accept if MIME type is image, extension matches known image types,
  // or browser couldn't determine type (no extension / file transferred from another OS)
  if (
    file.mimetype.startsWith('image/') ||
    IMAGE_EXTENSIONS.has(ext) ||
    file.mimetype === 'application/octet-stream'
  ) {
    cb(null, true)
  } else {
    logger.warn(`Rejected upload: mimetype=${file.mimetype}, ext=${ext}, name=${file.originalname}`)
    cb(new Error('Only image files are allowed'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})
