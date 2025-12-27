# CleanAirSafe Backend API

Backend API NestJS pour la gestion de capteurs CO2 avec intégration Kheiron Service Platform (KSP).

## Architecture

```
/src
  /auth              - Authentification JWT
  /tenants           - Multi-tenancy (Sociétés)
  /users             - Utilisateurs avec hiérarchie
  /billing           - Facturation
  /core
    /config          - Configuration
    /database        - PostgreSQL + TimescaleDB
    /cache           - Redis
    /queue           - Bull (jobs)
    /integrations
      /ksp           - ✅ API Kheiron (READY)
    /middleware      - Middlewares
    /guards          - Guards
    /utils           - Utilitaires
  /features
    /sensors         - Gestion capteurs
    /readings        - Mesures CO2 (time-series)
    /alerts          - Alertes + escalation
    /spaces          - Espaces hiérarchiques
    /dashboards      - Dashboards temps réel
```

## Stack Technique

- **Framework**: NestJS 10
- **Database**: PostgreSQL 15 + TimescaleDB (time-series)
- **Cache**: Redis 7
- **Queue**: Bull (Redis-based)
- **API Integration**: KSP API v1.17.1
- **Real-time**: WebSocket (Socket.io)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your KSP API credentials in .env
```

## Development

```bash
# Start with Docker Compose (recommended)
docker-compose up -d

# Or start locally
npm run start:dev
```

## KSP Integration

Module d'intégration avec l'API Kheiron Service Platform :

### Services disponibles :

- `KspAuthService` - Gestion authentification bearer token
- `KspService` - Wrapper complet API KSP

### Exemple d'utilisation :

```typescript
// Récupérer données temps réel de plusieurs capteurs (OPTIMISÉ)
const realtimeLogs = await this.kspService.getMultipleDevicesRealtimeLogs(
  contractId,
  ['device1', 'device2', 'device3'],
  ['DT_co2', 'DT_temperature', 'DT_humidity']
);

// Parser les données
const readings = this.kspService.parseRealtimeLogs(realtimeLogs.logs);
// Output: [{deviceId, co2, temperature, humidity, timestamp}, ...]
```

## Tags KSP disponibles :

- `DT_co2` - CO2 (ppm)
- `DT_temperature` - Température (°C)
- `DT_humidity` - Humidité (%)
- `DT_serial_number` - Numéro série

## Prochaines étapes :

1. ✅ Setup projet + KSP integration
2. ⏳ Entities (Tenant, User, Sensor, Reading, Alert)
3. ⏳ Polling service (sync KSP toutes les 30s)
4. ⏳ Alert detection + escalation
5. ⏳ WebSocket dashboards
6. ⏳ Frontend React

## License

Proprietary - CleanAirSafe
