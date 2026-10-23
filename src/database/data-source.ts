import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

const environmentFile = resolve(process.cwd(), '.env');
if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile);
}

const port = Number(process.env.DB_PORT ?? '3306');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT debe ser un puerto TCP válido');
}

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
  entities: [resolve(__dirname, 'entities', '*.js')],
  migrations: [resolve(__dirname, 'migrations', '*.js')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
});
