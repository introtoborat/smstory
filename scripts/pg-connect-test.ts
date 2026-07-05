import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  throw new Error('DATABASE_URL missing');
}

const urls = [
  baseUrl,
  `${baseUrl}&sslmode=require`,
  `${baseUrl}&sslmode=no-verify`,
  `${baseUrl}&ssl=no-verify`,
  `${baseUrl}&ssl=true`,
  `${baseUrl}&sslmode=prefer`,
  `${baseUrl}&sslmode=verify-full`,
  `${baseUrl}&sslmode=verify-ca`,
];

async function tryUrl(url: string) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query('select 1 as ok');
    console.log('SUCCESS', url, res.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('FAIL', url, message);
  } finally {
    await client.end();
  }
}

(async () => {
  for (const url of urls) {
    console.log('Testing', url);
    await tryUrl(url);
  }
})();
