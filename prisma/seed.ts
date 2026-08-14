import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      email: 'admin@empresa.com',
      password: adminPassword,
      name: 'Administrador',
      role: Role.ADMIN,
    },
  })

  const defaultLugar = await prisma.place.upsert({
    where: { id: 'lugar-oficina-principal' },
    update: {},
    create: {
      id: 'lugar-oficina-principal',
      name: 'Oficina Principal',
      lat: 19.4326,
      lng: -99.1332,
      radio: 500,
    },
  })

  console.log('✅ Seed completado: Usuario admin y lugar por defecto creados.')
  console.log('   Email: admin@empresa.com')
  console.log('   Password: admin123')
  console.log(`   Lugar: ${defaultLugar.name} (${defaultLugar.lat}, ${defaultLugar.lng})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
