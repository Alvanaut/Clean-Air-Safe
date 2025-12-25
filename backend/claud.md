  # 🚀 CleanAirSafe - Backend Documentation

  > Documentation complète du backend Node.js + TypeScript pour CleanAirSafe
  > Projet de gestion de capteurs CO2 connectés à l'API Kheiron

  ---

  ## 📋 TABLE DES MATIÈRES

  1. [Architecture](#architecture)
  2. [Stack Technique](#stack-technique)
  3. [Configuration](#configuration)
  4. [Commandes Essentielles](#commandes-essentielles)
  5. [Structure du Projet](#structure-du-projet)
  6. [API Endpoints](#api-endpoints)
  7. [Intégration Kheiron](#intégration-kheiron)
  8. [Base de Données](#base-de-données)
  9. [Polling Service](#polling-service)
  10. [Prochaines Étapes](#prochaines-étapes)

  ---

  ## 🏗️ ARCHITECTURE

  ┌─────────────────────────────────────────────┐
  │  FRONTEND (À VENIR)                         │
  │  React + Next.js                            │
  └──────────────────┬──────────────────────────┘
                     │ HTTP + WebSocket
  ┌──────────────────▼──────────────────────────┐
  │  BACKEND (Node.js + Express)                │
  │  - API REST                                 │
  │  - WebSocket (Socket.io)                    │
  │  - Polling Service (cron 10min)             │
  └──────────────────┬──────────────────────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
  ┌───────▼────┐ ┌──▼────┐ ┌──▼─────────┐
  │ PostgreSQL │ │ Redis │ │ Kheiron API│
  │ + Prisma   │ │ Cache │ │ (CO2 data) │
  └────────────┘ └───────┘ └────────────┘

  ---

  ## 🛠️ STACK TECHNIQUE

  ### Backend
  - **Runtime:** Node.js 20 LTS
  - **Framework:** Express 4
  - **Langage:** TypeScript
  - **ORM:** Prisma 5.22
  - **WebSocket:** Socket.io
  - **Scheduler:** node-cron
  - **Logger:** Winston
  - **Validation:** Zod

  ### Base de Données
  - **SGBD:** PostgreSQL 15
  - **ORM:** Prisma
  - **Cache:** Redis 7

  ### API Externe
  - **Kheiron API:** https://api.kheiron-sp.io
  - **Authentification:** Bearer Token (OAuth2 password grant)
  - **Format:** JSON
  - **Polling:** Toutes les 10 minutes

  ---

  ## ⚙️ CONFIGURATION

  ### Variables d'Environnement (`.env`)

  ```bash
  # Base de données
  DATABASE_URL="postgresql://alexisvanautgaerden@localhost:5432/cleanairsafe"

  # Cache Redis
  REDIS_URL="redis://localhost:6379"

  # API Kheiron
  KHEIRON_API_URL="https://api.kheiron-sp.io/v1"
  KHEIRON_USERNAME="alexis.vanautgaerden1@gmail.com"
  KHEIRON_PASSWORD="votre_password"
  KHEIRON_CONTRACT_ID="3c419280-35a0-4c50-8922-3d461adaaf3a"

  # Serveur
  PORT=8000
  NODE_ENV="development"

  Informations Kheiron

  Contract:
  - ID: 3c419280-35a0-4c50-8922-3d461adaaf3a
  - Reference: App_CLEAN AIR SAFE
  - Company: CLEAN AIR SAFE

  Capteurs Actifs (5):
  1. ID: 2 - T0007838 B0 2241J1356
  2. ID: 15 - Test wizard refacto
  3. ID: 16 - ARCSOM - blue workspace
  4. ID: 17 - ARCSOM - green workspace
  5. ID: 18 - T0007806 B2 2251J1137

  ---
  🚀 COMMANDES ESSENTIELLES

  Développement

  # Démarrer le serveur (mode dev avec hot-reload)
  npm run dev

  # Build pour production
  npm run build

  # Démarrer en production
  npm run start

  Base de Données

  # Créer/Appliquer migrations
  npx prisma migrate dev --name nom_migration

  # Générer le client Prisma (après modif schema)
  npx prisma generate

  # Ouvrir Prisma Studio (GUI pour DB)
  npx prisma studio

  # Reset DB (ATTENTION: efface tout)
  npx prisma migrate reset

  Seeds

  # Créer les capteurs réels depuis Kheiron
  npx tsx seed-real-sensors.ts

  # Seed de test (demo data)
  npm run seed

  Tests

  # Tester la connexion Kheiron
  npx tsx test-kheiron.ts

  ---
  📁 STRUCTURE DU PROJET

  backend/
  ├── src/
  │   ├── index.ts              # Point d'entrée
  │   ├── server.ts             # Config Express + Socket.io
  │   │
  │   ├── config/
  │   │   └── env.ts            # Variables d'environnement (Zod)
  │   │
  │   ├── db/
  │   │   └── prisma.ts         # Client Prisma singleton
  │   │
  │   ├── routes/
  │   │   ├── index.ts          # Router principal
  │   │   ├── health.ts         # GET /api/health
  │   │   └── sensors.ts        # GET /api/sensors, /api/sensors/:id
  │   │
  │   ├── services/
  │   │   ├── kheironClient.ts  # Client API Kheiron
  │   │   ├── cacheService.ts   # Service Redis
  │   │   └── pollingService.ts # Polling 10 min (cron)
  │   │
  │   ├── types/
  │   │   └── index.ts          # Types TypeScript
  │   │
  │   └── utils/
  │       └── logger.ts         # Winston logger
  │
  ├── prisma/
  │   └── schema.prisma         # Schéma base de données
  │
  ├── test-kheiron.ts           # Script de test API
  ├── seed-real-sensors.ts      # Seed capteurs réels
  │
  ├── package.json
  ├── tsconfig.json
  └── .env                      # Variables d'environnement

  ---
  🔌 API ENDPOINTS

  Health Check

  GET /api/health

  Response:
  {
    "status": "ok",
    "timestamp": "2025-12-25T20:00:00.000Z",
    "services": {
      "database": "connected",
      "redis": "connected"
    }
  }

  ---
  Liste des Capteurs

  GET /api/sensors

  Response:
  {
    "sensors": [
      {
        "id": "cm59...",
        "deviceId": "16",
        "name": "ARCSOM - blue workspace",
        "serialNumber": "C88C58",
        "qrCode": "QR_C88C58",
        "status": "active",
        "thresholdWarning": 800,
        "thresholdCritical": 1000,
        "thresholdEmergency": 1500,
        "company": { "name": "CLEAN AIR SAFE" },
        "space": { "name": "ARCSOM" }
      }
    ]
  }

  ---
  Détail d'un Capteur

  GET /api/sensors/:id

  Response:
  {
    "sensor": {
      "id": "cm59...",
      "name": "ARCSOM - blue workspace",
      ...
    },
    "realtime": {
      "deviceId": "16",
      "co2": 422,
      "temperature": 18.7,
      "humidity": 23,
      "timestamp": 820011965,
      "lastPoll": 1735158421102
    }
  }

  ---
  🔗 INTÉGRATION KHEIRON

  Authentification

  Endpoint: POST https://api.kheiron-sp.io/token

  Méthode: OAuth2 Password Grant

  const response = await axios.post(
    'https://api.kheiron-sp.io/token',
    new URLSearchParams({
      grant_type: 'password',
      username: env.KHEIRON_USERNAME,
      password: env.KHEIRON_PASSWORD
    }).toString()
  )

  const token = response.data.access_token
  // Valable 86399 secondes (24h)

  ---
  Récupération Données Temps Réel

  Endpoint: GET https://api.kheiron-sp.io/v1/devices/realtimes

  Paramètres:
  - contractId (string) - ID du contrat
  - deviceId (string) - ID du capteur
  - tagReferences (array) - Tags à récupérer

  Tags Disponibles:
  - DT_co2 - CO2 en ppm
  - DT_temperature - Température en °C
  - DT_humidity - Humidité en %

  Exemple:
  const data = await kheironClient.getRealtimeDataSingle(
    contractId,
    deviceId,
    ['DT_co2', 'DT_temperature', 'DT_humidity']
  )

  Response:
  {
    "logs": [
      {
        "deviceIdentifier": "16",
        "tagReference": "DT_co2",
        "value": "422",
        "timestamp": 820011965,
        "isEvent": false
      },
      {
        "tagReference": "DT_temperature",
        "value": "18.7",
        ...
      }
    ]
  }

  ⚠️ NOTE IMPORTANTE:
  - Les timestamps Kheiron sont en secondes depuis le 1er janvier 2000
  - Pour convertir: new Date(timestamp * 1000 + new Date('2000-01-01').getTime())
  - Le POST /devices/realtimes ne fonctionne PAS actuellement (erreur 500)
  - Utiliser GET en parallèle à la place

  ---
  🗄️ BASE DE DONNÉES

  Schéma Prisma

  Modèles Principaux:

  Company      // Sociétés
    └─ User    // Utilisateurs (hiérarchie avec manager_id)
    └─ Space   // Espaces (hiérarchie avec parent_id)
    └─ Sensor  // Capteurs CO2
        └─ Measurement  // Mesures CO2 (time-series)
        └─ Alert        // Alertes (À VENIR)

  Relations:
  - Un Sensor appartient à une Company, un Space, et a un User responsable
  - Les Spaces ont une hiérarchie (path: "/1/2/3")
  - Les Users ont une hiérarchie (manager_id)

  ---
  ⏰ POLLING SERVICE

  Fonctionnement

  Fréquence: Toutes les 10 minutes (cron: */10 * * * *)

  Processus:
  1. Récupère tous les capteurs actifs depuis PostgreSQL
  2. Appelle l'API Kheiron pour chaque capteur (GET en parallèle)
  3. Stocke les données en cache Redis (TTL: 12 min)
  4. Sauvegarde en base PostgreSQL (table Measurement)
  5. Log le résultat

  Code:
  // Démarre automatiquement avec le serveur
  pollingService.start()

  // Poll immédiat au démarrage + toutes les 10 min

  Logs typiques:
  📡 Polling 5 sensors...
  ✅ Poll completed in 3542ms - 5 measurements saved

  ---
  🎯 PROCHAINES ÉTAPES

  ✅ TERMINÉ

  - Backend Node.js + Express
  - TypeScript configuré
  - PostgreSQL + Prisma ORM
  - Redis pour cache
  - Client API Kheiron fonctionnel
  - Authentification Kheiron OK
  - Récupération données temps réel (GET)
  - Polling automatique toutes les 10 min
  - 5 capteurs réels connectés
  - Stockage mesures en DB
  - API REST basique (/health, /sensors)

  🚧 À FAIRE

  1. Frontend React + Next.js

  - Setup Next.js 14 (App Router)
  - Dashboard principal (liste capteurs)
  - Page détail capteur (graphique CO2)
  - Temps réel avec WebSocket
  - Composants UI (shadcn/ui)

  2. Système d'Alertes

  - Détection dépassement seuils CO2
  - Escalade hiérarchique (n-1, n-2, etc.)
  - Notifications (email, push)
  - Dashboard alertes actives
  - Historique alertes

  3. Gestion Hiérarchique

  - CRUD Espaces (bâtiments/étages/locaux)
  - CRUD Utilisateurs avec hiérarchie
  - Affiliation capteur → espace
  - Affiliation responsable → capteur/espace

  4. Authentification

  - JWT tokens
  - Login/Logout
  - Rôles (godmode, company_admin, manager, user)
  - Permissions par rôle

  5. Analytics

  - Graphiques historiques CO2
  - Moyennes (horaire, journalière)
  - Export données (CSV, Excel)
  - Rapports automatiques

  6. Déploiement

  - Setup VPS Hostinger
  - NGINX reverse proxy
  - SSL avec Certbot
  - PM2 pour Node.js
  - CI/CD (GitHub Actions)

  ---
  🐛 PROBLÈMES CONNUS

  API Kheiron POST /devices/realtimes

  Status: Erreur 500
  Workaround: Utiliser GET en parallèle
  Impact: Plus d'appels API mais fonctionne

  ---
  📞 CONTACTS

  Développeur: Alexis Van Autgaerden
  Email: alexis.vanautgaerden1@gmail.com
  Société: CLEAN AIR SAFE
  Contact Support: svanaut@gmail.com

  ---
  📝 NOTES IMPORTANTES

  1. Token Kheiron: Expire après 24h, renouvelé automatiquement
  2. Timestamp Kheiron: Base 2000-01-01, pas 1970-01-01 (Unix)
  3. Polling: Ne pas descendre en dessous de 5 min (limite API)
  4. Cache Redis: TTL 12 min pour tolérer 1 poll raté
  5. PostgreSQL: Timezone UTC, convertir pour affichage local

  ---
  🔧 DEBUGGING

  Voir les logs en temps réel

  npm run dev
  # Logs colorés avec Winston

  Tester l'API Kheiron

  npx tsx test-kheiron.ts

  Inspecter la base de données

  npx prisma studio
  # Ouvre http://localhost:5555

  Vérifier Redis

  redis-cli
  > KEYS sensor:*
  > GET sensor:16:realtime

  Requêtes SQL directes

  psql -d cleanairsafe
  SELECT * FROM sensors;
  SELECT * FROM measurements ORDER BY timestamp DESC LIMIT 10;

  ---
  Dernière mise à jour: 25 décembre 2025
  Version: 1.0.0
  Status: ✅ Backend opérationnel, Frontend à venir

  ---

  **Créez aussi `backend/README.md` pour GitHub :**

  ```markdown
  # CleanAirSafe Backend

  Backend Node.js + TypeScript pour la gestion de capteurs CO2 connectés à l'API Kheiron.

  ## Quick Start

  ```bash
  # Installation
  npm install

  # Configuration
  cp .env.example .env
  # Éditer .env avec vos credentials

  # Base de données
  npx prisma migrate dev
  npx tsx seed-real-sensors.ts

  # Démarrage
  npm run dev

  Documentation

  Voir ./CLAUDE_NOTES.md pour la documentation complète.

  Stack

  - Node.js 20 + TypeScript
  - Express + Socket.io
  - PostgreSQL + Prisma
  - Redis
  - Kheiron API

  Endpoints

  - GET /api/health - Health check
  - GET /api/sensors - Liste capteurs
  - GET /api/sensors/:id - Détail capteur

  License

  Private - CLEAN AIR SAFE © 2025