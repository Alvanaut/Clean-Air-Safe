import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Supprimer les données existantes
  await prisma.measurement.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.sensor.deleteMany()
  await prisma.space.deleteMany()
  await prisma.user.deleteMany()
  await prisma.company.deleteMany()

  // Créer une société
  const company = await prisma.company.create({
    data: {
      name: 'CleanAir Demo',
      reference: 'CA001',
      contactEmail: 'demo@cleanair.com'
    }
  })

  console.log('✅ Company created:', company.name)

  // Créer un admin
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cleanair.com',
      password: hashedPassword,
      name: 'Admin Demo',
      role: 'company_admin',
      companyId: company.id,
      phone: '+33123456789'
    }
  })

  console.log('✅ User created:', admin.name)

  // Créer des espaces
  const building = await prisma.space.create({
    data: {
      name: 'Bâtiment A',
      companyId: company.id,
      path: '/1',
      level: 0,
      responsibleId: admin.id
    }
  })

  const floor1 = await prisma.space.create({
    data: {
      name: 'Étage 1',
      companyId: company.id,
      parentSpaceId: building.id,
      path: '/1/2',
      level: 1,
      responsibleId: admin.id
    }
  })

  console.log('✅ Spaces created')

  // Créer des capteurs de test
  const sensor1 = await prisma.sensor.create({
    data: {
      deviceId: 'demo_001',
      serialNumber: 'SN001',
      qrCode: 'QR001',
      name: 'Capteur Bureau 101',
      companyId: company.id,
      spaceId: floor1.id,
      responsibleId: admin.id,
      status: 'active',
      thresholdWarning: 800,
      thresholdCritical: 1000,
      thresholdEmergency: 1500
    }
  })

  const sensor2 = await prisma.sensor.create({
    data: {
      deviceId: 'demo_002',
      serialNumber: 'SN002',
      qrCode: 'QR002',
      name: 'Capteur Salle de réunion',
      companyId: company.id,
      spaceId: floor1.id,
      responsibleId: admin.id,
      status: 'active'
    }
  })

  console.log('✅ Sensors created:', sensor1.name, sensor2.name)

  // Créer quelques mesures de test
  await prisma.measurement.createMany({
    data: [
      {
        sensorId: sensor1.id,
        co2Ppm: 650,
        temperature: 21.5,
        humidity: 45,
        timestamp: new Date(Date.now() - 3600000), // -1h
        source: 'remote'
      },
      {
        sensorId: sensor1.id,
        co2Ppm: 720,
        temperature: 22.0,
        humidity: 46,
        timestamp: new Date(Date.now() - 1800000), // -30min
        source: 'remote'
      },
      {
        sensorId: sensor1.id,
        co2Ppm: 680,
        temperature: 21.8,
        humidity: 44,
        timestamp: new Date(),
        source: 'remote'
      },
      {
        sensorId: sensor2.id,
        co2Ppm: 850,
        temperature: 23.5,
        humidity: 50,
        timestamp: new Date(),
        source: 'remote'
      }
    ]
  })

  console.log('✅ Measurements created')

  console.log('🎉 Seeding completed!')
  console.log('')
  console.log('📊 Summary:')
  console.log('- 1 Company')
  console.log('- 1 User (admin)')
  console.log('- 2 Spaces')
  console.log('- 2 Sensors')
  console.log('- 4 Measurements')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })