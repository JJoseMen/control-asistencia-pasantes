import 'dotenv/config'
import { randomBytes } from 'crypto'
import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@empresa.com' },
  })

  let initialPassword: string | null = null

  if (!existingAdmin) {
    initialPassword = randomBytes(12).toString('base64url')
    const hashed = await bcrypt.hash(initialPassword, 10)

    await prisma.user.create({
      data: {
        email: 'admin@empresa.com',
        password: hashed,
        name: 'Administrador',
        role: Role.ADMIN,
      },
    })
  }

  await prisma.place.upsert({
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
  if (initialPassword) {
    console.log('═════════════════════════════════════════════════════')
    console.log('  ADMIN CREADO — GUARDA ESTA CONTRASEÑA')
    console.log('  Email:    admin@empresa.com')
    console.log(`  Password: ${initialPassword}`)
    console.log('  NO SE VOLVERÁ A MOSTRAR. Cámbiala tras el primer login.')
    console.log('═════════════════════════════════════════════════════')
  } else {
    console.log('   Admin ya existía. Contraseña no regenerada.')
  }
  console.log(`   Lugar: Oficina Principal (19.4326, -99.1332)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
