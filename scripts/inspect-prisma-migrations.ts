import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

const connectionString = `${process.env.DATABASE_URL}&sslmode=no-verify`;
const client = new Client({ connectionString });

async function main() {
  await client.connect();
  console.log('connected');
  const cols = await client.query(`
    select column_name, data_type from information_schema.columns
    where table_name = '_prisma_migrations'
    order by ordinal_position;
  `);
  console.log('columns', cols.rows);
  const rows = await client.query(`select * from _prisma_migrations order by finished_at desc limit 20`);
  console.log('rows', rows.rows);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
