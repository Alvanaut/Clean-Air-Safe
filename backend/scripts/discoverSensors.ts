import { PrismaClient } from '@prisma/client'
import { kheironClient } from '../src/services/kheironClient.js'
import { env } from '../src/config/env.js'

const prisma = new PrismaClient()

// Liste des device IDs à tester (plage élargie)
const knownDeviceIds = Array.from({ length: 50 }, (_, i) => i.toString())

async function discoverAndCreateSensors() {
  console.log('🔍 Discovering sensors from Kheiron API...')

  try {
    const contractId = env.KHEIRON_CONTRACT_ID

    // Récupère la company
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('No company found. Run seed first!')
    }

    // Récupère l'espace ARCSOM ou le premier espace disponible
    let space = await prisma.space.findFirst({
      where: { name: 'ARCSOM' }
    })

    if (!space) {
      space = await prisma.space.findFirst()
    }

    // Récupère l'admin
    const admin = await prisma.user.findFirst()

    console.log(`📡 Testing device IDs: ${knownDeviceIds.join(', ')}`)

    // Teste chaque device ID pour voir lesquels existent
    const validDeviceIds: string[] = []

    for (const deviceId of knownDeviceIds) {
      try {
        const data = await kheironClient.getRealtimeDataSingle(contractId, deviceId)

        if (Object.keys(data).length > 0) {
          validDeviceIds.push(deviceId)
          console.log(`✅ Found active device: ${deviceId}`)
        }
      } catch (error) {
        // Device doesn't exist or has no data
        console.log(`⏭️  Device ${deviceId} not found or no data`)
      }
    }

    console.log(`\n📊 Found ${validDeviceIds.length} active devices`)

    // Supprime les capteurs demo
    await prisma.measurement.deleteMany({
      where: {
        sensor: {
          deviceId: {
            startsWith: 'demo_'
          }
        }
      }
    })

    await prisma.sensor.deleteMany({
      where: {
        deviceId: {
          startsWith: 'demo_'
        }
      }
    })

    // Récupère les données de tous les devices valides
    const allData = await kheironClient.getRealtimeDataMultiple(contractId, validDeviceIds)

    // Crée les capteurs
    let created = 0
    for (const [deviceId, sensorData] of Object.entries(allData)) {
      // Vérifie si le capteur existe déjà
      const existing = await prisma.sensor.findUnique({
        where: { deviceId }
      })

      if (existing) {
        console.log(`⏭️  Sensor with deviceId ${deviceId} already exists`)
        continue
      }

      // Génère un nom basé sur les données ou utilise un nom par défaut
      const name = `Kheiron Sensor ${deviceId}`

      const sensor = await prisma.sensor.create({
        data: {
          deviceId: deviceId,
          serialNumber: `SN_${deviceId}`,
          qrCode: `QR_${deviceId}`,
          name: name,
          companyId: company.id,
          spaceId: space?.id,
          responsibleId: admin?.id,
          status: 'active',
          thresholdWarning: 800,
          thresholdCritical: 1000,
          thresholdEmergency: 1500
        }
      })

      created++
      console.log(`✅ Created sensor: ${sensor.name} (CO2: ${sensorData.co2 || 'N/A'} ppm)`)
    }

    console.log('')
    console.log('🎉 Discovery completed!')
    console.log(`📊 Created ${created} new sensors`)

    const totalSensors = await prisma.sensor.count()
    console.log(`📊 Total sensors in database: ${totalSensors}`)

  } catch (error) {
    console.error('❌ Discovery failed:', error)
    throw error
  }
}

discoverAndCreateSensors()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
