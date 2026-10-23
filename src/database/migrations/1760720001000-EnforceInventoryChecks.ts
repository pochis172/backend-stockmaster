import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceInventoryChecks1760720001000
  implements MigrationInterface
{
  name = 'EnforceInventoryChecks1760720001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addCheckIfMissing(
      queryRunner,
      'productos',
      'CHK_productos_stock_no_negativo',
      'stock_actual >= 0',
      'SELECT COUNT(*) AS total FROM productos WHERE stock_actual < 0',
    );
    await this.addCheckIfMissing(
      queryRunner,
      'movimientos',
      'CHK_movimientos_cantidad_positiva',
      'cantidad > 0',
      'SELECT COUNT(*) AS total FROM movimientos WHERE cantidad <= 0',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropCheckIfPresent(
      queryRunner,
      'movimientos',
      'CHK_movimientos_cantidad_positiva',
    );
    await this.dropCheckIfPresent(
      queryRunner,
      'productos',
      'CHK_productos_stock_no_negativo',
    );
  }

  private async addCheckIfMissing(
    queryRunner: QueryRunner,
    table: string,
    constraint: string,
    expression: string,
    invalidRowsQuery: string,
  ) {
    const rows = (await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND CONSTRAINT_NAME = ?
         AND CONSTRAINT_TYPE = 'CHECK'`,
      [table, constraint],
    )) as Array<{ CONSTRAINT_NAME: string }>;
    if (rows.length > 0) {
      return;
    }

    const invalidRows = (await queryRunner.query(
      invalidRowsQuery,
    )) as Array<{ total: number | string }>;
    if (Number(invalidRows[0]?.total ?? 0) > 0) {
      throw new Error(
        `No se puede agregar ${constraint}: hay registros existentes que incumplen la regla`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` CHECK (${expression})`,
    );
  }

  private async dropCheckIfPresent(
    queryRunner: QueryRunner,
    table: string,
    constraint: string,
  ) {
    const rows = (await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND CONSTRAINT_NAME = ?
         AND CONSTRAINT_TYPE = 'CHECK'`,
      [table, constraint],
    )) as Array<{ CONSTRAINT_NAME: string }>;
    if (rows.length > 0) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP CONSTRAINT \`${constraint}\``,
      );
    }
  }
}
