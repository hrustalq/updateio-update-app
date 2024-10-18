import { PrismaClient } from '@prisma/client'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  // Seed SteamSettings
  await prisma.steamSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      username: 'delphine321',
      password: '8792242s',
      cmdPath: path.join('C:', 'Program Files (x86)', 'Steam', 'Steam.exe')
    }
  })

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
