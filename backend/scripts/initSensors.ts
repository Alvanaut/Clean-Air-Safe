import { PrismaClient } from '@prisma/client'
import { kheironClient } from '../src/services/kheironClient.js'
import { env } from '../src/config/env.js'

const prisma = new PrismaClient()

async function initSensors() {
  console.log('🔍 Fetching sensors from Kheiron API...')

  try {
    // Récupère les informations du contrat
    const contractId = env.KHEIRON_CONTRACT_ID
    const contractInfo = await kheironClient.getContractInfo(contractId)

    console.log(`📡 Found ${contractInfo.devices.length} devices in contract`)

    // Récupère la company (créée par le seed)
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('No company found. Run seed first!')
    }

    // Récupère l'espace par défaut
    const defaultSpace = await prisma.space.findFirst()

    // Récupère l'admin
    const admin = await prisma.user.findFirst()

    // Supprime les anciens capteurs demo
    await prisma.sensor.deleteMany({
      where: {
        deviceId: {
          startsWith: 'demo_'
        }
      }
    })

    // Crée les capteurs Kheiron
    for (const device of contractInfo.devices) {
      const deviceId = device.id.toString()

      // Vérifie si le capteur existe déjà
      const existing = await prisma.sensor.findUnique({
        where: { deviceId }
      })

      if (existing) {
        console.log(`⏭️  Sensor ${device.name} already exists`)
        continue
      }

      const sensor = await prisma.sensor.create({
        data: {
          deviceId: deviceId,
          serialNumber: device.serialNumber || `SN_${deviceId}`,
          qrCode: device.qrCode || `QR_${deviceId}`,
          name: device.name,
          companyId: company.id,
          spaceId: defaultSpace?.id,
          responsibleId: admin?.id,
          status: 'active',
          thresholdWarning: 800,
          thresholdCritical: 1000,
          thresholdEmergency: 1500
        }
      })

      console.log(`✅ Created sensor: ${sensor.name} (deviceId: ${deviceId})`)
    }

    console.log('')
    console.log('🎉 Initialization completed!')

    const totalSensors = await prisma.sensor.count()
    console.log(`📊 Total sensors in database: ${totalSensors}`)

  } catch (error) {
    console.error('❌ Initialization failed:', error)
    throw error
  }
}

initSensors()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
