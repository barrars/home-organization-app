import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { upload } from '../middleware/upload'

// JPEG: FF D8 FF
// PNG:  89 50 4E 47
// GIF:  47 49 46 38
// WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
// BMP:  42 4D
// TIFF: 49 49 or 4D 4D
// HEIC/HEIF: check for 'ftyp' at offset 4
function detectImageType(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif'
  if (buf[0] === 0x42 && buf[1] === 0x4d) return '.bmp'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return '.webp'
  if ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d)) return '.tiff'
  if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') return '.heic'
  return null
}

const router = Router()

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ message: `Upload error: ${err.message}` })
        return
      }
      if (err) {
        res.status(500).json({ message: err.message ?? 'Upload failed' })
        return
      }
      next()
    })
  },
  (req: Request, res: Response) => {
    const file = (req as Request & { file?: Express.Multer.File }).file
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' })
      return
    }

    // Validate actual file content via magic bytes
    const header = Buffer.alloc(12)
    let fd: number | null = null
    try {
      fd = fs.openSync(file.path, 'r')
      fs.readSync(fd, header, 0, 12, 0)
    } finally {
      if (fd !== null) fs.closeSync(fd)
    }

    const detectedExt = detectImageType(header)
    if (!detectedExt) {
      fs.unlinkSync(file.path)
      res.status(400).json({ message: 'File does not appear to be a valid image' })
      return
    }

    // If the stored file has no extension, rename it with the correct one
    let filename = file.filename
    if (!path.extname(filename)) {
      const newFilename = filename + detectedExt
      const newPath = path.join(path.dirname(file.path), newFilename)
      fs.renameSync(file.path, newPath)
      filename = newFilename
    }

    res.json({ imageUrl: `/uploads/${filename}` })
  },
)

export default router
