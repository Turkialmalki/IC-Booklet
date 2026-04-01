import { Queue, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

export const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    })

export const exportQueue       = new Queue('templateforge-export', { connection })
export const exportQueueEvents = new QueueEvents('templateforge-export', { connection })
