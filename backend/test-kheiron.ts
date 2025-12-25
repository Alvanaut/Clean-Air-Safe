import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const API_BASE = 'https://api.kheiron-sp.io'
const API_URL = `${API_BASE}/v1`
const USERNAME = process.env.KHEIRON_USERNAME
const PASSWORD = process.env.KHEIRON_PASSWORD

console.log('🧪 Testing Kheiron API Connection\n')
console.log('📍 API URL:', API_URL)
console.log('👤 Username:', USERNAME)
console.log('\n' + '='.repeat(60) + '\n')

async function test() {
  try {
    // 1. AUTHENTIFICATION (endpoint SANS /v1)
    console.log('1️⃣  AUTHENTICATION')
    console.log('Authenticating to:', `${API_BASE}/token`)

    const authResponse = await axios.post(
      `${API_BASE}/token`,
      new URLSearchParams({
        grant_type: 'password',
        username: USERNAME!,
        password: PASSWORD!
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    )

    const token = authResponse.data.access_token
    console.log('✅ Authenticated!')
    console.log('Token:', token.substring(0, 20) + '...')
    console.log('Expires in:', authResponse.data.expires_in, 'seconds')
    console.log('User:', authResponse.data.userName)
    console.log('\n' + '='.repeat(60) + '\n')

    // 2. RÉCUPÉRER LES CONTRACTS
    console.log('2️⃣  FETCHING CONTRACTS')
    console.log('URL:', `${API_URL}/contracts`)

    const contractsResponse = await axios.get(
      `${API_URL}/contracts`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    const contracts = contractsResponse.data.contracts
    console.log(`✅ Found ${contracts.length} contract(s):\n`)

    contracts.forEach((contract: any, i: number) => {
      console.log(`Contract ${i + 1}:`)
      console.log('  ID:', contract.id)
      console.log('  Reference:', contract.reference)
      console.log('  Company:', contract.company)
      console.log('  Contact:', contract.contactEmail)
      console.log('')
    })

    if (contracts.length === 0) {
      console.log('❌ No contracts found. Cannot continue.')
      return
    }

    const contractId = contracts[0].id
    console.log('📌 Using contract:', contracts[0].reference, '\n')
    console.log('='.repeat(60) + '\n')

    // 3. RÉCUPÉRER LES DEVICES
    console.log('3️⃣  FETCHING DEVICES')

    const devicesResponse = await axios.get(
      `${API_URL}/devices?contractId=${contractId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    const devices = devicesResponse.data.devices
    console.log(`✅ Found ${devices.length} device(s):\n`)

    devices.slice(0, 5).forEach((device: any, i: number) => {
      console.log(`Device ${i + 1}:`)
      console.log('  ID:', device.id)
      console.log('  Name:', device.name)
      console.log('  Details:', device.details)
      console.log('  Status:', device.status === 0 ? 'Active' : 'Inactive')
      console.log('  Timezone:', device.timezone)
      console.log('')
    })

    if (devices.length > 5) {
      console.log(`... and ${devices.length - 5} more devices\n`)
    }

    if (devices.length === 0) {
      console.log('❌ No devices found. Cannot continue.')
      return
    }

    console.log('='.repeat(60) + '\n')

// 4. TESTER REAL-TIME AVEC GET (UN SEUL DEVICE)
console.log('4️⃣  FETCHING REAL-TIME DATA (Single Device - GET)')

const testDeviceId = devices[0].id
const testDeviceName = devices[0].name
console.log(`Testing with device: ${testDeviceName} (ID: ${testDeviceId})\n`)

try {
  // Ajouter les tagReferences en query params
  const tags = ['DT_co2', 'DT_temperature', 'DT_humidity']
  const tagsParam = tags.map(t => `tagReferences=${t}`).join('&')

  const realtimeResponse = await axios.get(
    `${API_URL}/devices/realtimes?contractId=${contractId}&deviceId=${testDeviceId}&${tagsParam}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  const logs = realtimeResponse.data.logs
  console.log(`✅ Received ${logs.length} measurements:\n`)

  logs.forEach((log: any) => {
    console.log(`📊 ${log.tagReference}:`)
    console.log(`   Value: ${log.value}`)
    console.log(`   Timestamp: ${log.timestamp}`)
    console.log(`   Is Event: ${log.isEvent}`)
    console.log('')
  })

  console.log('='.repeat(60) + '\n')

  // 5. TESTER POST AVEC PLUSIEURS DEVICES
  console.log('5️⃣  FETCHING REAL-TIME DATA (Multiple Devices - POST)')

  const deviceIdsToTest = devices.slice(0, 3).map((d: any) => d.id.toString())
  console.log('Device IDs:', deviceIdsToTest)
  console.log('Tags:', tags, '\n')

  const realtimePostResponse = await axios.post(
    `${API_URL}/devices/realtimes?contractId=${contractId}`,
    {
      DeviceIdentifier: deviceIdsToTest,
      TagReference: tags
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  )

  const postLogs = realtimePostResponse.data.logs
  console.log(`✅ POST Success! Received ${postLogs.length} measurements\n`)

  // Grouper par device
  const byDevice: Record<string, any[]> = {}
  postLogs.forEach((log: any) => {
    if (!byDevice[log.deviceIdentifier]) {
      byDevice[log.deviceIdentifier] = []
    }
    byDevice[log.deviceIdentifier].push(log)
  })

  // Afficher
  Object.entries(byDevice).forEach(([deviceId, deviceLogs]) => {
    const device = devices.find((d: any) => d.id.toString() === deviceId)
    console.log(`📊 Device: ${device?.name || deviceId}`)

    deviceLogs.forEach(log => {
      const label = log.tagReference.replace('DT_', '').toUpperCase()
      console.log(`   ${label}: ${log.value}`)
    })

    if (deviceLogs.length > 0) {
      const timestamp = deviceLogs[0].timestamp
      // Kheiron timestamp = secondes depuis 2000-01-01
      const date = new Date(timestamp * 1000 + new Date('2000-01-01').getTime())
      console.log(`   Timestamp: ${date.toLocaleString()}`)
    }
    console.log('')
  })

} catch (error: any) {
  console.error('❌ Real-time fetch failed:')
  if (error.response) {
    console.error('Status:', error.response.status)
    console.error('URL:', error.config?.url)
    console.error('Request Body:', JSON.stringify(error.config?.data, null, 2))
    console.error('Response:', JSON.stringify(error.response.data, null, 2))
  } else {
    console.error(error.message)
  }
  console.log('\n⚠️  Continuing without real-time data...\n')
}

console.log('='.repeat(60) + '\n')

// 6. RÉSUMÉ
console.log('📈 SUMMARY')
console.log('✅ Authentication: OK')
console.log('✅ Contracts:', contracts.length, `(ID: ${contractId})`)
console.log('✅ Devices:', devices.length)
console.log('\n📋 Device List:')
devices.forEach((d: any, i: number) => {
  console.log(`  ${i + 1}. [ID: ${d.id}] ${d.name}`)
})
console.log('\n✅ Connection test completed!')
  } catch (error: any) {
    console.error('\n❌ ERROR:\n')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('URL:', error.config?.url)
      console.error('Data:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error(error.message)
    }
  }
}

test()