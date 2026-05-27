import winston from 'winston'
import path from 'path'
import fs from 'fs'

const logsDir = path.resolve(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const { combine, timestamp, colorize, printf, errors, json } = winston.format

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}${metaStr}`
      : `[${timestamp}] ${level}: ${message}${metaStr}`
  }),
)

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
)

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
})

/** A write-stream compatible with morgan's `stream` option. */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trimEnd())
  },
}

export default logger
