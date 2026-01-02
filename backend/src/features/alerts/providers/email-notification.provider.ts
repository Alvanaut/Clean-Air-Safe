import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { INotificationProvider } from './notification-provider.interface';
import { Alert } from '../alert.entity';
import { User } from '../../../users/user.entity';

@Injectable()
export class EmailNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(EmailNotificationProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT') || '587'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendAlertNotification(
    alert: Alert,
    user: User,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const isEscalation = metadata?.isEscalation || false;
    const isResolution = metadata?.isResolution || false;
    const escalationLevel = metadata?.escalationLevel || 0;

    let subject: string;
    let html: string;

    if (isResolution) {
      subject = `✅ Alerte CO2 Résolue: ${alert.sensor?.name || 'Capteur'}`;
      html = this.buildResolutionEmail(alert, user);
    } else if (isEscalation) {
      subject = `🚨 ESCALATION Niveau ${escalationLevel}: Alerte CO2 - ${alert.sensor?.name || 'Capteur'}`;
      html = this.buildEscalationEmail(alert, user, escalationLevel);
    } else {
      subject = `🚨 Alerte CO2: ${alert.sensor?.name || 'Capteur'}`;
      html = this.buildAlertEmail(alert, user);
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || 'noreply@cleanairsafe.com',
        to: user.email,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${user.email} for alert ${alert.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${user.email}`, error.stack);
      throw error;
    }
  }

  private buildAlertEmail(alert: Alert, user: User): string {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const sensorName = alert.sensor?.name || 'Capteur inconnu';
    const spaceName = alert.sensor?.space?.name || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fee; border: 2px solid #c00; padding: 20px; border-radius: 8px;">
          <h2 style="color: #c00; margin-top: 0;">🚨 Alerte CO2 Détectée</h2>

          <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p><strong>Bonjour ${user.first_name} ${user.last_name},</strong></p>
            <p>Une alerte CO2 a été déclenchée et nécessite votre attention.</p>

            <table style="width: 100%; margin: 15px 0;">
              <tr>
                <td style="padding: 8px 0;"><strong>Capteur:</strong></td>
                <td style="padding: 8px 0;">${sensorName}</td>
              </tr>
              ${spaceName ? `
              <tr>
                <td style="padding: 8px 0;"><strong>Emplacement:</strong></td>
                <td style="padding: 8px 0;">${spaceName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0;"><strong>Niveau CO2:</strong></td>
                <td style="padding: 8px 0; color: #c00; font-weight: bold; font-size: 18px;">${alert.co2_level} ppm</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Seuil dépassé:</strong></td>
                <td style="padding: 8px 0;">${alert.threshold_exceeded} ppm</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Date:</strong></td>
                <td style="padding: 8px 0;">${new Date(alert.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Brussels' })}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${frontendUrl}/alerts/${alert.id}"
               style="background: #c00; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">
              Voir l'alerte et acquitter
            </a>
          </div>

          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            ⚠️ Cette alerte sera escaladée automatiquement si elle n'est pas acquittée dans les 5 minutes.
          </p>
        </div>

        <p style="margin-top: 20px; font-size: 11px; color: #999; text-align: center;">
          CleanAirSafe - Système de monitoring de qualité de l'air
        </p>
      </body>
      </html>
    `;
  }

  private buildEscalationEmail(alert: Alert, user: User, escalationLevel: number): string {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const sensorName = alert.sensor?.name || 'Capteur inconnu';
    const spaceName = alert.sensor?.space?.name || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fdd; border: 3px solid #a00; padding: 20px; border-radius: 8px;">
          <h2 style="color: #a00; margin-top: 0;">🚨 ALERTE ESCALADÉE - Niveau ${escalationLevel}</h2>

          <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #a00;">
            <p><strong>Bonjour ${user.first_name} ${user.last_name},</strong></p>
            <p style="color: #a00; font-weight: bold;">⚠️ Une alerte CO2 non traitée a été escaladée à votre niveau.</p>
            <p>L'alerte n'a pas été acquittée par l'utilisateur responsable et nécessite votre intervention immédiate.</p>

            <table style="width: 100%; margin: 15px 0;">
              <tr>
                <td style="padding: 8px 0;"><strong>Capteur:</strong></td>
                <td style="padding: 8px 0;">${sensorName}</td>
              </tr>
              ${spaceName ? `
              <tr>
                <td style="padding: 8px 0;"><strong>Emplacement:</strong></td>
                <td style="padding: 8px 0;">${spaceName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0;"><strong>Niveau CO2:</strong></td>
                <td style="padding: 8px 0; color: #a00; font-weight: bold; font-size: 18px;">${alert.co2_level} ppm</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Niveau d'escalade:</strong></td>
                <td style="padding: 8px 0; color: #a00; font-weight: bold;">${escalationLevel} / 3</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Alerte initiale:</strong></td>
                <td style="padding: 8px 0;">${new Date(alert.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Brussels' })}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${frontendUrl}/alerts/${alert.id}"
               style="background: #a00; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">
              Voir l'alerte et prendre en charge
            </a>
          </div>

          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            ⚠️ Action requise immédiatement. L'alerte continuera à être escaladée si non traitée.
          </p>
        </div>

        <p style="margin-top: 20px; font-size: 11px; color: #999; text-align: center;">
          CleanAirSafe - Système de monitoring de qualité de l'air
        </p>
      </body>
      </html>
    `;
  }

  private buildResolutionEmail(alert: Alert, user: User): string {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const sensorName = alert.sensor?.name || 'Capteur inconnu';
    const spaceName = alert.sensor?.space?.name || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #efe; border: 2px solid #0a0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #0a0; margin-top: 0;">✅ Alerte CO2 Résolue</h2>

          <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p><strong>Bonjour ${user.first_name} ${user.last_name},</strong></p>
            <p style="color: #0a0;">Le niveau de CO2 est revenu à la normale.</p>

            <table style="width: 100%; margin: 15px 0;">
              <tr>
                <td style="padding: 8px 0;"><strong>Capteur:</strong></td>
                <td style="padding: 8px 0;">${sensorName}</td>
              </tr>
              ${spaceName ? `
              <tr>
                <td style="padding: 8px 0;"><strong>Emplacement:</strong></td>
                <td style="padding: 8px 0;">${spaceName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0;"><strong>Résolu à:</strong></td>
                <td style="padding: 8px 0;">${alert.resolved_at ? new Date(alert.resolved_at).toLocaleString('fr-FR', { timeZone: 'Europe/Brussels' }) : 'Maintenant'}</td>
              </tr>
              ${alert.resolution_note ? `
              <tr>
                <td style="padding: 8px 0;"><strong>Note:</strong></td>
                <td style="padding: 8px 0;">${alert.resolution_note}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${frontendUrl}/alerts/${alert.id}"
               style="background: #0a0; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">
              Voir les détails
            </a>
          </div>
        </div>

        <p style="margin-top: 20px; font-size: 11px; color: #999; text-align: center;">
          CleanAirSafe - Système de monitoring de qualité de l'air
        </p>
      </body>
      </html>
    `;
  }
}
