import { prisma } from '../src/lib/db'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: Role.ADMIN,
      canCRUD: true,
      canApprove: true,
    },
  })

  console.log('Seed completed: admin user created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
