/**
 * 🧪 SCRIPT DE TEST POUR L'API REST
 *
 * Ce script teste toutes les routes de l'API sensors
 * Pour lancer : npx tsx test-api.ts
 */

const API_BASE = 'http://localhost:8000/api'

// Fonction helper pour faire des requêtes
async function request(method: string, endpoint: string, body?: any) {
  const url = `${API_BASE}${endpoint}`

  console.log(`\n🔵 ${method} ${endpoint}`)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      ...(body && { body: JSON.stringify(body) })
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`✅ ${response.status} ${response.statusText}`)
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      console.log(`❌ ${response.status} ${response.statusText}`)
      console.log('Error:', JSON.stringify(data, null, 2))
    }

    return { response, data }
  } catch (error) {
    console.log(`❌ Request failed:`, error)
    throw error
  }
}

async function testAPI() {
  console.log('🚀 Testing CleanAirSafe API\n')
  console.log('=' .repeat(50))

  // 1️⃣ TEST : GET /api/sensors (Liste tous les capteurs)
  console.log('\n📋 TEST 1: Get all sensors')
  console.log('-'.repeat(50))
  const { data: sensorsData } = await request('GET', '/sensors')
  const firstSensor = sensorsData.data?.[0]

  if (firstSensor) {
    console.log(`\n📍 Premier capteur trouvé: ${firstSensor.name} (ID: ${firstSensor.id})`)
  }

  // 2️⃣ TEST : GET /api/sensors/:id (Un capteur spécifique)
  if (firstSensor) {
    console.log('\n📋 TEST 2: Get sensor by ID')
    console.log('-'.repeat(50))
    await request('GET', `/sensors/${firstSensor.id}`)
  }

  // 3️⃣ TEST : GET /api/sensors/:id/measurements (Historique)
  if (firstSensor) {
    console.log('\n📋 TEST 3: Get sensor measurements')
    console.log('-'.repeat(50))
    await request('GET', `/sensors/${firstSensor.id}/measurements?limit=5`)
  }

  // 4️⃣ TEST : POST /api/sensors (Créer un capteur - DEVRAIT ÉCHOUER car validation)
  console.log('\n📋 TEST 4: Create sensor (invalid data - should fail)')
  console.log('-'.repeat(50))
  await request('POST', '/sensors', {
    deviceId: '',  // ❌ Vide
    name: 'AB',    // ❌ Trop court
    companyId: 'invalid'  // ❌ Pas un UUID
  })

  // 5️⃣ TEST : POST /api/sensors (Créer un capteur - VALIDE)
  console.log('\n📋 TEST 5: Create sensor (valid data)')
  console.log('-'.repeat(50))

  // On récupère le companyId du premier capteur
  if (firstSensor) {
    const newSensor = await request('POST', '/sensors', {
      deviceId: '999',
      name: 'Test Sensor API',
      companyId: firstSensor.companyId,
      spaceId: firstSensor.spaceId
    })

    const createdId = newSensor.data?.data?.id

    // 6️⃣ TEST : PATCH /api/sensors/:id (Modifier le capteur)
    if (createdId) {
      console.log('\n📋 TEST 6: Update sensor')
      console.log('-'.repeat(50))
      await request('PATCH', `/sensors/${createdId}`, {
        name: 'Test Sensor UPDATED',
        status: 'maintenance'
      })

      // 7️⃣ TEST : DELETE /api/sensors/:id (Supprimer le capteur)
      console.log('\n📋 TEST 7: Delete sensor')
      console.log('-'.repeat(50))
      await request('DELETE', `/sensors/${createdId}`)
    }
  }

  // 8️⃣ TEST : GET /api/health (Health check)
  console.log('\n📋 TEST 8: Health check')
  console.log('-'.repeat(50))
  await request('GET', '/health')

  console.log('\n' + '='.repeat(50))
  console.log('✅ Tests terminés !')
}

// Lance les tests
testAPI().catch(error => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})

/**
 * 📖 EXPLICATION DES TESTS :
 *
 * 1. GET /sensors        → Récupère tous les capteurs
 * 2. GET /sensors/:id    → Récupère un capteur spécifique
 * 3. GET /sensors/:id/measurements → Récupère l'historique
 * 4. POST /sensors (invalid) → Teste la validation (doit échouer)
 * 5. POST /sensors (valid)   → Crée un nouveau capteur
 * 6. PATCH /sensors/:id      → Modifie le capteur créé
 * 7. DELETE /sensors/:id     → Supprime le capteur créé
 * 8. GET /health            → Vérifie que l'API est en ligne
 *
 * 🎯 Ce que tu apprends :
 * - Comment faire des requêtes HTTP avec fetch()
 * - Les différentes méthodes REST (GET, POST, PATCH, DELETE)
 * - La validation des données (Zod)
 * - Les codes de statut HTTP (200, 201, 400, 404, 500)
 * - Le format des réponses JSON
 */
