import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  // Debug logging
  if (!connectionString) {
    const dbEnvVars = Object.keys(process.env).filter(k => k.toLowerCase().includes('database') || k.toLowerCase().includes('postgres') || k.toLowerCase().includes('neon'))
    console.error('DATABASE_URL is undefined. Related env vars found:', dbEnvVars)
    throw new Error(`DATABASE_URL is not set. Found these related vars: ${dbEnvVars.join(', ')}`)
  }

  console.log('DATABASE_URL found, length:', connectionString.length, 'starts with:', connectionString.substring(0, 15))

  const sql = neon(connectionString)
  // @ts-expect-error - Type compatibility
  const adapter = new PrismaNeon(sql)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
