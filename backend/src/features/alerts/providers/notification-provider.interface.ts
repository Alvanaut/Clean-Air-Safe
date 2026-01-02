import { Alert } from '../alert.entity';
import { User } from '../../../users/user.entity';

export interface INotificationProvider {
  /**
   * Send alert notification to user
   * @param alert - The alert to notify about
   * @param user - The user to notify
   * @param metadata - Additional metadata (e.g., isEscalation, escalationLevel)
   */
  sendAlertNotification(
    alert: Alert,
    user: User,
    metadata?: Record<string, any>,
  ): Promise<void>;
}
