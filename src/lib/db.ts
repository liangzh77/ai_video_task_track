import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE2_DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  console.log('Creating Prisma client with connection string length:', connectionString.length)

  const pool = new Pool({ connectionString })
  // @ts-expect-error - Type compatibility
  const adapter = new PrismaNeon(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
