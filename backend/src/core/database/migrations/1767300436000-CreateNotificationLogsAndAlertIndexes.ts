import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationLogsAndAlertIndexes1767300436000 implements MigrationInterface {
  name = 'CreateNotificationLogsAndAlertIndexes1767300436000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_logs table
    await queryRunner.query(`
      CREATE TABLE notification_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Add indexes for notification_logs
    await queryRunner.query(`
      CREATE INDEX idx_notification_logs_alert ON notification_logs(alert_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notification_logs_user ON notification_logs(user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id, created_at DESC)
    `);

    // Add indexes for alerts table (for better performance)
    await queryRunner.query(`
      CREATE INDEX idx_alerts_tenant_status ON alerts(tenant_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alerts_sensor_created ON alerts(sensor_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alerts_sensor_status ON alerts(sensor_id, status)
    `);

    // Add phone column to users table for SMS notifications (if not exists)
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove phone column from users table
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN phone
    `);

    // Drop alert indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_alerts_sensor_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_alerts_sensor_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_alerts_tenant_status
    `);

    // Drop notification_logs indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_logs_tenant
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_logs_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_logs_alert
    `);

    // Drop notification_logs table
    await queryRunner.query(`
      DROP TABLE notification_logs
    `);
  }
}
