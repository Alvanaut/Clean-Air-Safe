import dotenv from 'dotenv'
  import { z } from 'zod'

  dotenv.config()

  const envSchema = z.object({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    KHEIRON_API_URL: z.string(),
    KHEIRON_USERNAME: z.string(),
    KHEIRON_PASSWORD: z.string(),
    KHEIRON_CONTRACT_ID: z.string(),
    PORT: z.string().default('8000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })

  export const env = envSchema.parse(process.env)