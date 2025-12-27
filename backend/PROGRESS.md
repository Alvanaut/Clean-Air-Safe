# CleanAirSafe Backend - Progress Report

## Overview
Backend system for managing 10,000+ CO2 sensors with KSP API integration.

## Completed Features

### 1. Project Setup
- NestJS backend structure with modular architecture
- TypeScript configuration with path aliases
- Docker setup (PostgreSQL + Redis)
- Environment configuration (.env)

### 2. KSP API Integration
- **Authentication Service** (`ksp-auth.service.ts`)
  - Bearer token management
  - Auto-refresh before expiry
  - Token caching

- **KSP Service** (`ksp.service.ts`)
  - Complete API wrapper with type safety
  - Methods: getContracts, getDevices, getDevice
  - Historic logs support (real-time logs endpoint has issues)
  - Timestamp conversion (KSP epoch: 2000-01-01)
  - Log parsing utilities

- **Test Endpoints** (`ksp-test.controller.ts`)
  - `/api/ksp-test/auth` - Authentication test
  - `/api/ksp-test/contracts` - Get all contracts
  - `/api/ksp-test/devices` - Get devices for contract
  - `/api/ksp-test/full` - Complete integration test

### 3. Database Entities
All entities created with proper TypeORM decorations:
- **Tenant** - Multi-tenant support with KSP contract linking
- **User** - Hierarchical user structure (n-levels)
- **Space** - Hierarchical building/floor/room structure
- **Sensor** - CO2 sensors with KSP device mapping
- **SensorReading** - Time-series data (ready for TimescaleDB)
- **Alert** - Alert tracking with escalation
- **AlertRule** - Threshold configuration

### 4. KSP Synchronization Service
- **Automatic Polling** - Runs every 10 minutes (configurable)
- **Manual Trigger** - POST `/api/sensors/sync/now`
- **Status Endpoint** - GET `/api/sensors/sync/status`

**How it works:**
1. Fetches all active tenants with `sync_enabled=true`
2. For each tenant, fetches devices from KSP API
3. Creates/updates Sensor entities
4. Generates unique QR codes for each sensor
5. Attempts to fetch recent readings (last 15 minutes)
6. Updates `last_sync_at` timestamp

**Current Status:**
- Successfully synced 5 sensors from KSP
- All sensors have unique QR codes
- Last sync: 2025-12-26 23:42:48

## Configuration

### Polling Settings
```env
SENSOR_POLLING_ENABLED=true
SENSOR_POLLING_INTERVAL_MS=600000  # 10 minutes
KSP_SYNC_INTERVAL_SECONDS=600      # 10 minutes
```

### KSP API
```env
KSP_API_URL=https://api.kheiron-sp.io/v1
KSP_API_USERNAME=alexis.vanautgaerden1@gmail.com
```

## Database Schema

### Tenants
- `id` (UUID)
- `name`, `company_name`
- `ksp_contract_id` (links to KSP)
- `sync_enabled`, `sync_interval_seconds`
- `default_co2_threshold`

### Sensors
- `id` (UUID)
- `name`, `description`
- `ksp_device_id` (KSP device reference)
- `qr_code` (UUID, unique)
- `last_reading_co2`, `last_reading_temperature`, `last_reading_humidity`
- `last_reading_at`, `last_sync_at`
- `status`, `sync_status`, `sync_error`

### SensorReadings
- `id` (bigint)
- `sensor_id` (UUID)
- `co2_level`, `temperature`, `humidity`
- `timestamp` (from KSP)
- `source` (1=local, 2=remote)

## Test Data

### Tenant
```
Name: CleanAirSafe Test
KSP Contract: 3c419280-35a0-4c50-8922-3d461adaaf3a
Company: CLEAN AIR SAFE
```

### Synced Sensors (5)
1. T0007838 B0 2241J1356 (device 2)
2. Test wizard refacto (device 15)
3. ARCSOM - blue workspace (device 16)
4. ARCSOM - green workspace (device 17)
5. T0007806 B2 2251J1137 (device 18)

## API Endpoints

### KSP Test
- `GET /api/ksp-test/auth` - Test authentication
- `GET /api/ksp-test/contracts` - List contracts
- `GET /api/ksp-test/devices?contractId=xxx` - List devices
- `GET /api/ksp-test/full` - Full integration test

### Sensors Sync
- `GET /api/sensors/sync/status` - Get sync status
- `POST /api/sensors/sync/now` - Trigger manual sync

## Known Issues

1. **KSP Real-time Logs Endpoint**
   - `GET /devices/realtimes` returns 400 Bad Request
   - `POST /devices/realtimes` returns 500 Internal Server Error
   - Workaround: Using historic logs for last 15 minutes

2. **No Recent Data**
   - Devices haven't transmitted data in last 15 minutes
   - This is normal - will capture data on next transmission

## Next Steps

### Priority 1 - Core Features
- [ ] Core middleware and guards
- [ ] JWT authentication system
- [ ] Multi-tenancy isolation middleware
- [ ] User hierarchy management

### Priority 2 - Data Management
- [ ] Sensors CRUD endpoints
- [ ] Readings endpoints with historical queries
- [ ] TimescaleDB hypertable setup
- [ ] Alert detection service

### Priority 3 - Advanced Features
- [ ] Alert escalation cascade
- [ ] Space hierarchy tree
- [ ] WebSocket for real-time dashboards
- [ ] Godmode and Company dashboards

## Architecture Decisions

1. **Polling vs WebSockets**: Using polling every 10 minutes (user requirement)
2. **QR Codes**: Generated independently from KSP device IDs
3. **Denormalization**: Storing last_reading_* on Sensor for performance
4. **Historic Logs**: Using as fallback for real-time data
5. **Cron Jobs**: NestJS Schedule module with `@Cron` decorators

## Performance Considerations

- Sync runs in background (non-blocking)
- Prevents overlapping syncs with `isSyncing` flag
- Batch processing per tenant
- Efficient database queries with indexes
- TypeORM query logging in development

## Security Notes

- KSP credentials stored in .env (should be encrypted in production)
- Bearer tokens cached in-memory (consider Redis for multi-instance)
- Tenant isolation via `tenant_id` on all tables
- TODO: Add row-level security policies

---

**Last Updated:** 2025-12-26 23:42:48
**Backend Status:** Running on http://localhost:3000
**Database:** PostgreSQL (cleanairsafe_db)
**Redis:** Connected
