# Production Deployment Guide

**Project:** storydb-main
**Stack:** Next.js 16 + Prisma 7 + Supabase (PostgreSQL)
**Last updated:** 2026-06-21

This document explains how the connection strings are used in this project, why the runtime uses one URL and migrations another, and how to deploy to production safely.

---

## TL;DR

| What | URL | Why |
|---|---|---|
| App runtime (Next.js) | `DATABASE_URL` (port `6543`, transaction-mode pooler) | Multiplexes thousands of clients through a small pool — what Next.js needs under load |
| Database migrations | `DIRECT_URL` (port `5432`, session-mode pooler) | Holds a real session — required for migration scripts that use session-level features |
| Auth signing | `AUTH_SECRET` | **Must** be a real random value in production |
| Public app URL | `NEXT_PUBLIC_APP_URL` | Used for absolute URLs in emails, redirects, etc. |
| SMTP delivery | `SMTP_HOST`, `SMTP_FROM`, optional auth vars | Sends invitation and password reset emails |

---

## What each URL is for

### `DATABASE_URL` — transaction-mode pooler

```
postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

- Port `6543`.
- Query string includes `?pgbouncer=true`.
- Used by [src/lib/prisma.ts:9](src/lib/prisma.ts#L9) to construct the `PrismaPg` adapter at runtime:

  ```ts
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  ```

- This is the only connection string the running app reads.

### `DIRECT_URL` — session-mode pooler

```
postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

- Port `5432`.
- No `pgbouncer=true` query parameter.
- Used by migration scripts that need real Postgres sessions (advisory locks, `SET LOCAL`, prepared statements in transactions, schema migrations).
- Not read by the app at runtime.

---

## Why two URLs

The transaction-mode pooler is optimised for **many short-lived queries** from serverless/edge runtimes. It multiplexes thousands of clients onto a small backend connection pool, but it cannot hold a session across statements — so anything that depends on session state fails.

The session-mode pooler (and direct connections) gives each client a real Postgres session, which is what migrations and admin scripts need.

Prisma's documentation historically recommended splitting these via `directUrl` in `schema.prisma`. As of Prisma 7 (this project uses 7.8.0), the `directUrl` field was removed from `schema.prisma` — configuration moved to [prisma.config.ts](prisma.config.ts), and the v7 guidance is to keep the runtime on a single transaction-pooler URL and apply migrations through a separate session-mode path.

---

## Pre-production checklist

Before deploying, confirm all of the following. Anything left as the literal placeholder or commented-out sample is **not** safe for production.

### `.env` cleanup

The current [.env](.env) has issues. Before deploying:

- [ ] **`AUTH_SECRET`** — currently the placeholder `"change-me-to-a-secure-random-string-in-production"` on lines 10 and 18. Replace with `openssl rand -hex 32`. Remove the duplicate on line 18.
- [ ] **Remove the dead commented-out `DATABASE_URL`** on line 16 (different project ref, different password).
- [ ] **`NEXT_PUBLIC_APP_URL`** — currently `http://localhost:3000`. Replace with the production URL (e.g. `https://storydb.example.com`).
- [ ] **SMTP email** — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and, if required by your provider, `SMTP_USER` / `SMTP_PASS`. Do not enable `ALLOW_DEV_INVITE_URL` or `ALLOW_DEV_RESET_URL` in production.
- [ ] **`DATABASE_URL`** — keep as-is. It already points at the transaction-mode pooler with `pgbouncer=true`, which is what production runtime wants.
- [ ] **`DIRECT_URL`** — keep for now (used by migration scripts in CI).

### Code hardening

- [ ] **Remove the auth fallback** in [src/lib/auth.ts:6](src/lib/auth.ts#L6) (`"fallback-secret-change-me"`) so the app refuses to start without a real `AUTH_SECRET`:

  ```ts
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  if (!secret.byteLength) {
    throw new Error("AUTH_SECRET is not set");
  }
  ```

- [ ] **Confirm `.env` is in `.gitignore`**. If it is committed anywhere, rotate the Supabase password before launch.
- [ ] **Rotate the Supabase database password**, since it has appeared in plaintext on a local machine and is reachable from session-transcript paths in `C:\Users\F&A-UCSI\.claude\projects\`.

### Hosting-provider env vars

Set these in Vercel (or your platform). Do **not** deploy the `.env` file itself.

| Variable | Required for | Value |
|---|---|---|
| `DATABASE_URL` | App runtime | Transaction-pooler URL (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Migration step only | Session-pooler URL (port 5432) |
| `AUTH_SECRET` | App runtime | Real 32-byte random hex string |
| `NEXT_PUBLIC_APP_URL` | App runtime | Production URL |
| `SMTP_HOST` | App runtime | SMTP server hostname |
| `SMTP_PORT` | App runtime | Usually `587`, or `465` with `SMTP_SECURE=true` |
| `SMTP_USER` / `SMTP_PASS` | App runtime | SMTP credentials, if your provider requires them |
| `SMTP_FROM` | App runtime | Verified sender address, e.g. `StoryDB <no-reply@example.com>` |

`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and SMTP credentials are secrets.

---

## Deploy steps

### 1. Apply migrations to the production database

The local Prisma CLI (`npx prisma migrate deploy`) was observed to hang against Supabase's transaction pooler in this environment. To avoid the same risk in production, apply migrations with `psql` against `DIRECT_URL` instead. Order matters — apply each migration once and in the order Prisma recorded them.

A safe shell loop (run from CI or a one-off deploy shell):

```bash
set -euo pipefail

for f in prisma/migrations/*/migration.sql; do
  echo "Applying $f"
  psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

After applying, the `_prisma_migrations` table should contain one row per migration folder (`0000_init`, `0001_user_management`, `0002_enable_rls`, `0003_rls_prisma_migrations`). If a row is missing, insert it manually so future `prisma migrate deploy` calls don't try to re-apply the migration.

### 2. Deploy the app

Standard Next.js build:

```bash
npm ci
npm run build
```

Push to your hosting provider with the env vars from the table above set. The build step runs `prisma generate` automatically (via the `postinstall` script in [package.json](package.json)).

### 3. Smoke-test after deploy

- Hit any page that reads the DB (e.g. `/admin/users`, `/stories`). A successful response confirms `DATABASE_URL` is set and reachable.
- Log in as an admin user. Successful login confirms `AUTH_SECRET` is set and the JWT round-trip works.
- Watch server logs for any `DATABASE_URL is not set` error — that's the literal message [src/lib/prisma.ts:11](src/lib/prisma.ts#L11) throws if the runtime cannot find the env var.

If anything fails, the most likely cause is an env-var misconfiguration in the hosting provider, not a code issue.

---

## Verification commands

Run from any machine with `psql` and `DATABASE_URL` / `DIRECT_URL` set.

```bash
# Confirm every public-schema table has RLS enabled.
psql "$DIRECT_URL" -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

# Confirm a deny-all PostgREST policy exists on every public table.
psql "$DIRECT_URL" -c "SELECT tablename, policyname, roles, qual FROM pg_policies WHERE schemaname='public' ORDER BY tablename;"

# Confirm the migrations table knows about every migration.
psql "$DIRECT_URL" -c "SELECT migration_name, finished_at IS NOT NULL AS applied FROM _prisma_migrations ORDER BY started_at;"
```

Expected:

- `rowsecurity = t` for all 14 public tables (13 application tables + `_prisma_migrations`).
- One row per table in `pg_policies`, all named `deny_all_postgrest`, with `qual = false`.
- Four rows in `_prisma_migrations`: `0000_init`, `0001_user_management`, `0002_enable_rls`, `0003_rls_prisma_migrations`, all `applied = t`.

---

## Why the local migration CLI hung

For future debugging — `npx prisma migrate deploy` against `aws-1-ap-northeast-2.pooler.supabase.com:6543` produced `P1001: Can't reach database server`, and against port `5432` it produced no error but never completed. TCP connectivity to both ports succeeded (`Test-NetConnection`). The failure was at the Prisma client / Supabase pooler handshake layer, not a connectivity problem.

This is a known class of issue with Prisma + Supabase's pooler when migration statements interact with session-level features. Using `psql` against the session pooler (`DIRECT_URL`, port 5432) avoids the issue and is the recommended path for migrations.

---

## References

- [src/lib/prisma.ts](src/lib/prisma.ts) — runtime Prisma client construction.
- [src/lib/auth.ts](src/lib/auth.ts) — JWT signing, secret fallback to remove.
- [prisma/schema.prisma](prisma/schema.prisma) — Prisma 7 datasource block (provider only; no `url`).
- [prisma.config.ts](prisma.config.ts) — Prisma 7 datasource config (`env("DATABASE_URL")`).
- [.env](.env) — local development environment (replace `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL` before deploying).
- [prisma/migrations/0002_enable_rls/migration.sql](prisma/migrations/0002_enable_rls/migration.sql) — RLS enabled on all 13 application tables.
- [prisma/migrations/0003_rls_prisma_migrations/migration.sql](prisma/migrations/0003_rls_prisma_migrations/migration.sql) — RLS enabled on `_prisma_migrations`.
- [docs/notes/supabase-rls-warning-resolution.md](supabase-rls-warning-resolution.md) — the RLS work this deploy guide builds on.
- [docs/notes/issues-found-2026-06-21.md](issues-found-2026-06-21.md) — every issue surfaced during the 2026-06-21 session.
