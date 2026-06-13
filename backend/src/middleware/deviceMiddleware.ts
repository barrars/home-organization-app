import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

const COOKIE_NAME = 'device_id'
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000

export function deviceMiddleware(req: Request, res: Response, next: NextFunction): void {
  let deviceId = req.cookies?.[COOKIE_NAME] as string | undefined

  if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 8) {
    deviceId = crypto.randomUUID()
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie(COOKIE_NAME, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: TEN_YEARS_MS,
      path: '/',
    })
  }

  req.deviceId = deviceId
  next()
}
