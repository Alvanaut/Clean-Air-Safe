import { PrismaClient } from '@prisma/client'

  const prisma = new PrismaClient()

  async function main() {
    console.log('🌱 Creating real sensors from Kheiron...\n')

    // Nettoyer d'abord
    await prisma.measurement.deleteMany()
    await prisma.sensor.deleteMany()
    await prisma.space.deleteMany()
    await prisma.user.deleteMany()
    await prisma.company.deleteMany()

    // Créer la société
    const company = await prisma.company.create({
      data: {
        name: 'CLEAN AIR SAFE',
        reference: 'App_CLEAN AIR SAFE',
        contactEmail: 'svanaut@gmail.com'
      }
    })
    console.log('✅ Company:', company.name)

    // Créer admin
    const admin = await prisma.user.create({
      data: {
        email: 'alexis.vanautgaerden1@gmail.com',
        name: 'Alexis Van Autgaerden',
        role: 'company_admin',
        companyId: company.id
      }
    })
    console.log('✅ User:', admin.name)

    // Créer espace principal
    const mainSpace = await prisma.space.create({
      data: {
        name: 'ARCSOM',
        companyId: company.id,
        path: '/1',
        level: 0,
        responsibleId: admin.id
      }
    })
    console.log('✅ Space:', mainSpace.name)

    // VOS 5 CAPTEURS RÉELS
    const sensors = [
      {
        deviceId: '2',
        name: 'T0007838 B0 2241J1356',
        serial: '647FDA000000F585',
        qr: 'QR_647FDA000000F585'
      },
      {
        deviceId: '15',
        name: 'Test wizard refacto',
        serial: 'DT_TEST_WIZARD',
        qr: 'QR_TEST_WIZARD'
      },
      {
        deviceId: '16',
        name: 'ARCSOM - blue workspace',
        serial: 'C88C58',
        qr: 'QR_C88C58'
      },
      {
        deviceId: '17',
        name: 'ARCSOM - green workspace',
        serial: 'C38F21',
        qr: 'QR_C38F21'
      },
      {
        deviceId: '18',
        name: 'T0007806 B2 2251J1137',
        serial: '647FDA000001487D',
        qr: 'QR_647FDA000001487D'
      },
    ]

    for (const sensor of sensors) {
      await prisma.sensor.create({
        data: {
          deviceId: sensor.deviceId,
          serialNumber: sensor.serial,
          qrCode: sensor.qr,
          name: sensor.name,
          companyId: company.id,
          spaceId: mainSpace.id,
          responsibleId: admin.id,
          status: 'active',
          thresholdWarning: 800,
          thresholdCritical: 1000,
          thresholdEmergency: 1500
        }
      })
      console.log('✅ Sensor:', sensor.name)
    }

    console.log('\n🎉 Real sensors created!')
    console.log('\n📊 Summary:')
    console.log('- 1 Company: CLEAN AIR SAFE')
    console.log('- 1 User: Alexis Van Autgaerden')
    console.log('- 1 Space: ARCSOM')
    console.log('- 5 Sensors (active)')
  }

  main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())