import { Router, Request, Response } from 'express'
import { upload } from '../middleware/upload'

const router = Router()

router.post('/', upload.single('image'), (req: Request, res: Response) => {
  // multer adds `file` to req at runtime; cast to access it safely
  const file = (req as Request & { file?: { filename: string } }).file
  if (!file) {
    res.status(400).json({ message: 'No file uploaded' })
    return
  }
  res.json({ imageUrl: `/uploads/${file.filename}` })
})

export default router
