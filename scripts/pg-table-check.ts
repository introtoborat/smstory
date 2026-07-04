import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

const url = `${process.env.DATABASE_URL}&sslmode=no-verify`;
const client = new Client({ connectionString: url });

async function main() {
  await client.connect();
  const res = await client.query(`
    select tablename from pg_tables where schemaname='public' order by tablename;
  `);
  console.log(res.rows.map((r) => r.tablename));
  const meta = await client.query(`
    select tablename from pg_tables where schemaname='public' and tablename like '%prisma%';
  `);
  console.log('prisma tables', meta.rows.map((r) => r.tablename));
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
