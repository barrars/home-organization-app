import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { upload } from '../middleware/upload'

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
    const file = (req as Request & { file?: { filename: string } }).file
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' })
      return
    }
    res.json({ imageUrl: `/uploads/${file.filename}` })
  },
)

export default router
