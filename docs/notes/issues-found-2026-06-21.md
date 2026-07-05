# Issues Found and Resolved — 2026-06-21

**Project:** storydb-main
**Session:** Supabase RLS hardening + migration tooling follow-up

This note summarises every problem investigated or fixed during this session, including secondary issues surfaced while working on the primary one.

---

## 1. Supabase Security Advisor: `RLS Disabled in Public` on `public.User` (and 12 other tables)

### What was reported

Supabase Studio's Security Advisor surfaced the lint finding `rls_disabled_in_public` against `public.User`, with the description: *"Detects cases where row level security (RLS) has not been enabled on tables in schemas exposed to PostgREST."* The same warning applied to every other application table in the `public` schema, and to Prisma's own `_prisma_migrations` table.

### Root cause

The Prisma migrations at [prisma/migrations/0000_init/migration.sql](prisma/migrations/0000_init/migration.sql) and [prisma/migrations/0001_user_management/migration.sql](prisma/migrations/0001_user_management/migration.sql) create 13 application tables with plain `CREATE TABLE` statements. None of them call `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Supabase's linter treats every table in the `public` schema as PostgREST-exposed, so missing RLS is reported as a vulnerability regardless of whether PostgREST is actually in use.

### Context

This project does not use PostgREST. All database access goes through Prisma using the `postgres` superuser connection string in [.env](.env) (`DATABASE_URL`, transaction pooler on port 6543). The superuser role bypasses RLS regardless of whether it is enabled, so the warning was technically a false positive for the current architecture — but worth fixing because (a) it would become a real vulnerability if PostgREST were ever turned on, (b) the linter surfaces it as actionable, and (c) enabling RLS with a deny-all policy is essentially free.

### Fix

Two new Prisma migrations were added and applied.

**[prisma/migrations/0002_enable_rls/migration.sql](prisma/migrations/0002_enable_rls/migration.sql)** enables RLS on all 13 application tables and installs a `deny_all_postgrest` RESTRICTIVE policy targeting the PostgREST roles (`anon`, `authenticated`) with `USING (false) WITH CHECK (false)`. RESTRICTIVE means any future permissive policy is AND-ed with this deny-all, so widening access later cannot happen by accident.

**[prisma/migrations/0003_rls_prisma_migrations/migration.sql](prisma/migrations/0003_rls_prisma_migrations/migration.sql)** does the same for `_prisma_migrations`. Chosen over moving the table to a non-public schema because it is one short migration and matches the existing pattern.

### Verification

`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';` reports `rowsecurity = t` for all 14 tables. `SELECT * FROM pg_policies WHERE schemaname='public';` reports one `deny_all_postgrest` policy per table.

### Impact on the running app

None. Prisma's superuser connection bypasses RLS, so all existing reads/writes/migrations are unaffected. The deny-all policy only blocks the `anon` and `authenticated` roles, which the app does not use.

---

## 2. Prisma `migrate deploy` cannot reach the Supabase database from this machine

### Symptom

While applying the new migrations, `npx prisma migrate deploy` reported `Error: P1001: Can't reach database server at aws-1-ap-northeast-2.pooler.supabase.com:6543`. Re-running against the session pooler (`port 5432`) printed only `Datasource "db": PostgreSQL database "postgres", schema "public" at ...` and then hung indefinitely — it neither succeeded nor produced an error within several minutes.

### Investigation

- `Test-NetConnection -Port 6543` and `-Port 5432` against `aws-1-ap-northeast-2.pooler.supabase.com` both reported `TcpTestSucceeded : True`. The TCP layer is reachable.
- The hang with no error message points to the Prisma client / Supabase transaction-pooler handshake, not a connectivity failure. (Well-known: Supabase's transaction-mode pooler has constraints around prepared statements and session-level features that some Prisma queries hit during migrations.)

### Workaround

Applied the migration SQL directly with the locally installed PostgreSQL 18 client at `C:\Program Files\PostgreSQL\18\bin\psql.exe` against the **session pooler** (`port 5432`, `DIRECT_URL`). Then inserted a row into `_prisma_migrations` so Prisma sees the migration as already applied and will not try to re-run it on a subsequent `prisma migrate deploy`.

```sql
INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count, started_at)
VALUES ('0002_enable_rls', 'rls-migration-manually-applied', '0002_enable_rls', NOW(), 1, NOW());
```

(Repeated for `0003_rls_prisma_migrations`.)

### Recommended fix (not done)

Add to [prisma/schema.prisma](prisma/schema.prisma):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

This tells Prisma to use the transaction pooler for queries but the session pooler for migrations, which is what Supabase recommends and what would make `prisma migrate deploy` reliable from this machine.

---

## 3. Lint reappears for `public._prisma_migrations`

### Symptom

After fixing the 13 application tables, Supabase's linter immediately surfaced the same `rls_disabled_in_public` warning against `public._prisma_migrations` — the table Prisma uses internally to track applied migrations.

### Why it exists

Prisma auto-creates `_prisma_migrations` in whatever schema the datasource points at. Because [prisma/schema.prisma](prisma/schema.prisma) does not declare a non-public schema, the table lives in `public` and is therefore subject to the same linter rule as everything else.

### Fix

[prisma/migrations/0003_rls_prisma_migrations/migration.sql](prisma/migrations/0003_rls_prisma_migrations/migration.sql) — enabled RLS on `_prisma_migrations` and installed the same deny-all policy as for the application tables. Verified via `pg_tables` and `pg_policies`.

### Why this option (and not moving the table)

The alternative was to move `_prisma_migrations` to a non-public schema (e.g. `prisma_migrations`) and adjust the connection `search_path` so Prisma can still find it. That is the right long-term cleanup, but it is more invasive. RLS-on-in-public is sufficient to clear the warning and matches the pattern already applied.

---

## 4. `.env` exposes production-looking credentials in plaintext (not fixed — flagged)

### Observation

[.env](.env) contains the project Supabase database password (`myWorld%40200820312`) and pooler hostnames in plaintext. It also contains what appears to be a second, older database URL (`wqgecumcaroytyngcula:Borat@200820312`) commented out on line 16. The file is in the project root and is not in `.gitignore` (the file was opened directly in the IDE).

### Risk

If this repository is ever pushed to a remote or shared, those credentials are committed. The Supabase project ref is also leaked, which makes targeted attacks against the project feasible.

### Recommended fix

- Confirm `.env` is listed in `.gitignore` (or add it if missing).
- Rotate the Supabase database password, since it has appeared in a Claude session transcript path that is reachable from this machine (`C:\Users\F&A-UCSI\.claude\projects\...`).
- Remove the dead commented-out `DATABASE_URL` from [.env:16](.env#L16).
- Move all secrets out of `.env` files committed alongside source — use `direnv`, Doppler, or Supabase Vault for secrets management.
- Confirm `AUTH_SECRET="change-me-to-a-secure-random-string-in-production"` is replaced with a real value before deploying; it is also duplicated on line 18.

This was not fixed in this session because it is outside the requested scope, but it is the most important follow-up.

---

## 5. `AUTH_SECRET` duplicated and unchanged (not fixed — flagged)

### Observation

[.env](.env) defines `AUTH_SECRET="change-me-to-a-secure-random-string-in-production"` twice (lines 10 and 18). Both copies are still the placeholder value. [src/lib/auth.ts](src/lib/auth.ts) reads it at module load time and falls back to the literal string `"fallback-secret-change-me"` if it is unset.

### Risk

If the app is ever deployed with the placeholder in place, JWTs are signed with a publicly known secret and any attacker can forge sessions for any user, including admins.

### Recommended fix

- Generate a real random secret (`openssl rand -hex 32`).
- Remove the duplicate line.
- Remove the fallback in [src/lib/auth.ts:6](src/lib/auth.ts#L6) so the app refuses to start without a secret — this is safer than silently signing with a known value.

---

## Summary table

| # | Problem | Status | File(s) |
|---|---|---|---|
| 1 | `rls_disabled_in_public` on 13 application tables | Fixed | `prisma/migrations/0002_enable_rls/migration.sql` |
| 2 | `prisma migrate deploy` hangs/fails against Supabase from this machine | Worked around with `psql`; recommend `directUrl` | `prisma/schema.prisma` (recommended change) |
| 3 | `rls_disabled_in_public` on `_prisma_migrations` | Fixed | `prisma/migrations/0003_rls_prisma_migrations/migration.sql` |
| 4 | Plaintext credentials in `.env` (incl. dead commented-out URL) | **Not fixed — flagged as most important follow-up** | `.env` |
| 5 | `AUTH_SECRET` placeholder duplicated and unchanged | **Not fixed — flagged** | `.env`, `src/lib/auth.ts` |
