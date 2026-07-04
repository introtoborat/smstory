import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

const migrationPath = path.resolve('prisma/migrations/0005_add_page_name_suggestions/migration.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

function buildConnectionString() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set');
  return base.includes('?') ? `${base}&sslmode=no-verify` : `${base}?sslmode=no-verify`;
}

async function main() {
  const connectionString = buildConnectionString();
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to DB, applying migration 0005 manually...');

  await client.query('BEGIN');
  try {
    await client.query(migrationSql);

    const existing = await client.query(
      `select 1 from _prisma_migrations where migration_name = $1 limit 1`,
      ['0005_add_page_name_suggestions'],
    );

    if (existing.rowCount === 0) {
      const id = crypto.randomUUID();
      const checksum = 'manual-0005_add_page_name_suggestions';
      const now = new Date().toISOString();
      await client.query(
        `insert into _prisma_migrations(id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, checksum, now, '0005_add_page_name_suggestions', '', null, now, 1],
      );
      console.log('Inserted migration record for 0005_add_page_name_suggestions');
    } else {
      console.log('Migration 0005 already recorded in _prisma_migrations');
    }

    await client.query('COMMIT');
    console.log('Migration 0005 applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

import crypto from 'crypto';

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
