import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { GlobalJwtAuthGuard } from './core/guards/global-jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { SensorsModule } from './features/sensors/sensors.module';
import { ReadingsModule } from './features/readings/readings.module';
import { AlertsModule } from './features/alerts/alerts.module';
import { SpacesModule } from './features/spaces/spaces.module';

// KSP Integration
import { KspModule } from './core/integrations/ksp/ksp.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Scheduling (for cron jobs)
    ScheduleModule.forRoot(),

    // Queue system
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
    }),

    // Core
    DatabaseModule,
    CacheModule,

    // KSP Integration
    KspModule,

    // Features
    AuthModule,
    TenantsModule,
    UsersModule,
    SensorsModule,
    ReadingsModule,
    AlertsModule,
    SpacesModule,
  ],
  providers: [
    // Global JWT Guard - protects all routes by default
    {
      provide: APP_GUARD,
      useClass: GlobalJwtAuthGuard,
    },
    // Global Roles Guard - checks @Roles() decorator
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
