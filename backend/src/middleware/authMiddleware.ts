import { Request, Response, NextFunction } from 'express'
import { Home } from '../models/home.model'
import logger from '../utils/logger'

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.home_token as string | undefined
  if (!token) {
    res.status(401).json({ message: 'No home token. Call POST /api/auth/init first.' })
    return
  }

  try {
    const home = await Home.findOne({ token })
    if (!home) {
      res.status(401).json({ message: 'Invalid home token.' })
      return
    }
    req.homeId = home._id as import('mongoose').Types.ObjectId
    req.home = home
    next()
  } catch (error) {
    logger.error('Auth middleware error', { error })
    res.status(500).json({ message: 'Authentication error' })
  }
}
