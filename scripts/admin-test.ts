import dotenv from 'dotenv';
dotenv.config();

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

function parseSetCookie(setCookieHeaders: string[] | null) {
  if (!setCookieHeaders) return {} as Record<string,string>;
  const cookies: Record<string,string> = {};
  for (const header of setCookieHeaders) {
    const parts = header.split(';')[0].split('=');
    const name = parts.shift();
    const value = parts.join('=');
    if (name) cookies[name.trim()] = value;
  }
  return cookies;
}

async function main() {
  // Login
  const loginRes = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  console.log('Login status', loginRes.status);
  const loginBody = await loginRes.json().catch(() => null);
  if (!loginBody || !loginBody.token) {
    console.error('Login failed or token missing');
    console.error(await loginRes.text());
    process.exit(1);
  }
  const token = loginBody.token;
  const cookieHeader = `token=${token}`;

  // Request CSRF token (sets csrf-token cookie)
  const csrfResp = await fetch(`${base}/api/auth/csrf`, { headers: { Cookie: cookieHeader } });
  const setCookie = csrfResp.headers.get('set-cookie') || '';
  const m = setCookie.match(/csrf-token=([^;]+)/);
  const csrf = m ? decodeURIComponent(m[1]) : undefined;

  // GET suggestions
  const getRes = await fetch(`${base}/api/settings/page-name-suggestions`, {
    headers: { Cookie: cookieHeader },
  });
  console.log('GET suggestions status', getRes.status);
  console.log(await getRes.text());

  // POST new suggestion (should include X-CSRF-Token header)
  const payload = { name: 'Automated Seeded Title' };
  const postRes = await fetch(`${base}/api/settings/page-name-suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'x-csrf-token': csrf || '',
    },
    body: JSON.stringify(payload),
  });
  console.log('POST suggestion status', postRes.status);
  console.log(await postRes.text());
}

main().catch((e) => { console.error(e); process.exit(1); });
