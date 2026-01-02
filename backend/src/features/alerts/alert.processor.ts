import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AlertsService } from './alerts.service';

@Processor('alerts')
export class AlertProcessor {
  private readonly logger = new Logger(AlertProcessor.name);

  constructor(private readonly alertsService: AlertsService) {}

  /**
   * Process alert escalation job
   * Triggered after escalation_delay_minutes has elapsed
   */
  @Process('escalate')
  async handleEscalation(job: Job<{ alertId: string }>): Promise<void> {
    const { alertId } = job.data;

    this.logger.log(
      `Processing escalation job ${job.id} for alert ${alertId}`,
    );

    try {
      await this.alertsService.escalateAlert(alertId);
      this.logger.log(`Escalation job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Escalation job ${job.id} failed for alert ${alertId}`,
        error.stack,
      );
      throw error; // Re-throw to mark job as failed
    }
  }
}
