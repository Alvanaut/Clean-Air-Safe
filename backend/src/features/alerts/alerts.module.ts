import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Alert } from './alert.entity';
import { AlertRule } from './alert-rule.entity';
import { NotificationLog } from './notification-log.entity';
import { Sensor } from '../sensors/sensor.entity';
import { AlertsService } from './alerts.service';
import { NotificationService } from './notification.service';
import { AlertProcessor } from './alert.processor';
import { AlertsController } from './alerts.controller';
import { WebsocketModule } from '../../websocket/websocket.module';
import { UsersModule } from '../../users/users.module';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, AlertRule, NotificationLog, Sensor]),
    BullModule.registerQueue({ name: 'alerts' }),
    WebsocketModule,
    UsersModule,
    forwardRef(() => SensorsModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [AlertsController],
  providers: [AlertsService, NotificationService, AlertProcessor],
  exports: [AlertsService, NotificationService],
})
export class AlertsModule {}
