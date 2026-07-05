import dotenv from 'dotenv';
dotenv.config();

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

async function login() {
  const res = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!body?.token) throw new Error('Login failed');
  return body.token;
}

function cookieHeader(token: string) {
  return `token=${token}`;
}

async function main() {
  const token = await login();
  const cookie = cookieHeader(token);

  // Get lookups
  // obtain csrf token cookie
  const csrfResp = await fetch(`${base}/api/auth/csrf`, { headers: { Cookie: cookie } });
  const setCookie = csrfResp.headers.get('set-cookie') || '';
  console.log('csrf set-cookie header:', setCookie);
  const mcsrf = setCookie.match(/csrf-token=([^;]+)/);
  const csrf = mcsrf ? decodeURIComponent(mcsrf[1]) : undefined;
  console.log('csrf token parsed:', csrf);
  const cookieWithCsrf = csrf ? `${cookie}; csrf-token=${csrf}` : cookie;

  const lookupsRes = await fetch(`${base}/api/settings/lookups`, { headers: { Cookie: cookieWithCsrf } });
  const lookups = await lookupsRes.json();
  const ageGroup = lookups.ageGroups?.[0]?.name;
  const genre = lookups.genres?.[0]?.name;
  const gender = lookups.genders?.[0]?.name;
  if (!ageGroup || !genre || !gender) throw new Error('Missing lookups');

  // Create story
  const storyRes = await fetch(`${base}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ title: 'Manual Test Story', ageGroup, genre, characterGender: gender }),
  });
  const story = await storyRes.json().catch(() => null);
  console.log('Create story status', storyRes.status, 'body:', JSON.stringify(story, null, 2));
  const storyId = story?.id ?? story?.story?.id ?? story?.data?.id;
  if (!storyId) throw new Error('Failed to create story');
  console.log('Created story', storyId);

  // Create three pages
  const createdPages: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const pRes = await fetch(`${base}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieWithCsrf, 'x-csrf-token': csrf || '' },
      body: JSON.stringify({ storyId: story.id, pageNumber: i, storyText: `Page ${i} text`, title: `Page ${i}` }),
    });
    const p = await pRes.json().catch(() => null);
    console.log('Create page status', pRes.status, 'body:', JSON.stringify(p, null, 2));
    createdPages.push(p);
    console.log('Created page', p?.id, p?.pageNumber, p?.title);
  }

  // Update page 2: change title to 'Page 20' and set pageNumber to 20
  const page2 = createdPages[1];
  const updRes = await fetch(`${base}/api/pages/${page2.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieWithCsrf, 'x-csrf-token': csrf || '' },
    body: JSON.stringify({ title: 'Page 20', pageNumber: 20 }),
  });
  const upd = await updRes.json().catch(() => null);
  console.log('Update page status', updRes.status, 'body:', JSON.stringify(upd, null, 2));
  console.log('Updated page2:', upd?.id, upd?.pageNumber, upd?.title);

  // Create next page - should continue from 21
  const p4Res = await fetch(`${base}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieWithCsrf, 'x-csrf-token': csrf || '' },
    body: JSON.stringify({ storyId: story.id, pageNumber: 21, storyText: 'Page 21 text', title: 'Page 21' }),
  });
  const p4 = await p4Res.json().catch(() => null);
  console.log('Create p4 status', p4Res.status, 'body:', JSON.stringify(p4, null, 2));
  console.log('Created page after renumbering', p4?.id, p4?.pageNumber, p4?.title);

  // Fetch all pages
  const listRes = await fetch(`${base}/api/pages?storyId=${story.id}`, { headers: { Cookie: cookie } });
  const pages = await listRes.json().catch(() => null);
  console.log('List pages status', listRes.status, 'body:', JSON.stringify(pages, null, 2));
  if (Array.isArray(pages)) console.log('All pages:', pages.map((p: any) => ({ id: p.id, pageNumber: p.pageNumber, title: p.title })));
}

main().catch((e) => { console.error(e); process.exit(1); });
