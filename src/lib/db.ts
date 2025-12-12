import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Try multiple possible variable names
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE2_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE2_POSTGRES_URL

  console.log('Checking env vars:')
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
  console.log('- DATABASE2_DATABASE_URL:', process.env.DATABASE2_DATABASE_URL ? 'SET' : 'NOT SET')
  console.log('- POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET')

  if (!connectionString) {
    throw new Error('No database connection string found in environment variables')
  }

  console.log('Using connection string, length:', connectionString.length)

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
