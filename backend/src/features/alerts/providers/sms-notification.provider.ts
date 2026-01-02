import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { INotificationProvider } from './notification-provider.interface';
import { Alert } from '../alert.entity';
import { User } from '../../../users/user.entity';

@Injectable()
export class SmsNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(SmsNotificationProvider.name);
  private client: twilio.Twilio;
  private isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.isEnabled = true;
      this.logger.log('Twilio SMS provider initialized');
    } else {
      this.isEnabled = false;
      this.logger.warn('Twilio credentials not configured - SMS notifications disabled');
    }
  }

  async sendAlertNotification(
    alert: Alert,
    user: User,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('SMS notifications disabled - skipping');
      return;
    }

    if (!user.phone) {
      throw new Error(`User ${user.email} has no phone number configured`);
    }

    const isEscalation = metadata?.isEscalation || false;
    const isResolution = metadata?.isResolution || false;
    const escalationLevel = metadata?.escalationLevel || 0;
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const sensorName = alert.sensor?.name || 'Capteur';

    let message: string;

    if (isResolution) {
      message = `✅ CleanAirSafe: Alerte CO2 résolue pour ${sensorName}. ${alert.resolution_note || 'Niveau normalisé'}. Détails: ${frontendUrl}/alerts/${alert.id}`;
    } else if (isEscalation) {
      message = `🚨 CleanAirSafe ESCALATION Niveau ${escalationLevel}: Alerte CO2 ${sensorName} - ${alert.co2_level} ppm. Non traitée! Action immédiate requise: ${frontendUrl}/alerts/${alert.id}`;
    } else {
      message = `🚨 CleanAirSafe: Alerte CO2 ${sensorName} - ${alert.co2_level} ppm (seuil: ${alert.threshold_exceeded}). Acquitter: ${frontendUrl}/alerts/${alert.id}`;
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.configService.get('TWILIO_FROM_NUMBER'),
        to: user.phone,
      });

      this.logger.log(`SMS sent to ${user.phone} for alert ${alert.id}. SID: ${result.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${user.phone}`, error.stack);
      throw error;
    }
  }
}
