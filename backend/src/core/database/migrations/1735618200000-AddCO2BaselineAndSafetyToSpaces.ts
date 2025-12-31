import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCO2BaselineAndSafetyToSpaces1735618200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CO2 baseline column
    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'co2_baseline',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 400,
        isNullable: false,
      }),
    );

    // Add safety compliance columns
    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'has_hydro_gel',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'has_temp_check',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'has_mask_required',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Create enum types for ventilation_level, cleaning_frequency, and safety_score
    await queryRunner.query(`
      CREATE TYPE "ventilation_level_enum" AS ENUM ('none', 'natural', 'mechanical', 'hepa');
    `);

    await queryRunner.query(`
      CREATE TYPE "cleaning_frequency_enum" AS ENUM ('none', 'weekly', 'daily', 'hourly');
    `);

    await queryRunner.query(`
      CREATE TYPE "safety_score_enum" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');
    `);

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'ventilation_level',
        type: 'ventilation_level_enum',
        default: "'none'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'max_capacity',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'current_capacity',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'cleaning_frequency',
        type: 'cleaning_frequency_enum',
        default: "'none'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'has_isolation_room',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'social_distancing',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'spaces',
      new TableColumn({
        name: 'safety_score',
        type: 'safety_score_enum',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.dropColumn('spaces', 'safety_score');
    await queryRunner.dropColumn('spaces', 'social_distancing');
    await queryRunner.dropColumn('spaces', 'has_isolation_room');
    await queryRunner.dropColumn('spaces', 'cleaning_frequency');
    await queryRunner.dropColumn('spaces', 'current_capacity');
    await queryRunner.dropColumn('spaces', 'max_capacity');
    await queryRunner.dropColumn('spaces', 'ventilation_level');
    await queryRunner.dropColumn('spaces', 'has_mask_required');
    await queryRunner.dropColumn('spaces', 'has_temp_check');
    await queryRunner.dropColumn('spaces', 'has_hydro_gel');
    await queryRunner.dropColumn('spaces', 'co2_baseline');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "safety_score_enum";`);
    await queryRunner.query(`DROP TYPE "cleaning_frequency_enum";`);
    await queryRunner.query(`DROP TYPE "ventilation_level_enum";`);
  }
}
