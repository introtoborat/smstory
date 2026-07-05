import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

const url = `${process.env.DATABASE_URL}&sslmode=no-verify`;
const client = new Client({ connectionString: url });

async function main() {
  await client.connect();
  const storyPage = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'StoryPage'
    order by ordinal_position;
  `);
  console.log('StoryPage columns', storyPage.rows);

  const pns = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'PageNameSuggestion'
    order by ordinal_position;
  `);
  console.log('PageNameSuggestion columns', pns.rows);

  const migrations = await client.query(`
    select migration_name, checksum, finished_at
    from _prisma_migrations
    where migration_name = '0005_add_page_name_suggestions'
    limit 1;
  `);
  console.log('0005_applied', migrations.rows);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
