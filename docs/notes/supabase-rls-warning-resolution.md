# Supabase RLS Warning — Resolution Note

**Date:** 2026-06-21
**Project:** storydb-main
**Database:** Supabase (ap-northeast-2, project ref `mfphfrvcphhjxvdhdfdr`)

## Problem

Supabase's Security Advisor raised the lint finding **`rls_disabled_in_public`** for tables in the `public` schema. Initially it flagged `public.User`, and after the first fix the same warning reappeared for `public._prisma_migrations`. The root cause was the same in both cases: every table created by the Prisma migrations in `prisma/migrations/0000_init/migration.sql` and `prisma/migrations/0001_user_management/migration.sql` was defined with plain `CREATE TABLE` statements that did not call `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. The Supabase linter treats every public-schema table as PostgREST-exposed, so any table without RLS enabled is automatically flagged — regardless of whether the application actually uses PostgREST.

In this project PostgREST is **not** used. All database access goes through Prisma using the `postgres` superuser connection string from [.env](.env) (`DATABASE_URL`, transaction pooler on port 6543). The superuser role bypasses RLS regardless of whether it is enabled, so the warnings were technically false positives for the current architecture. They were still worth fixing because:

- The Supabase linter surfaces them as actionable security issues.
- They would become real vulnerabilities if PostgREST were ever enabled or if the Prisma connection role were downgraded from superuser.
- Enabling RLS with a deny-all policy is essentially free; reverting later is also free.

## Fix

Two Prisma migrations were added and applied to the remote database.

### 1. `prisma/migrations/0002_enable_rls/migration.sql`

Enables RLS on every application table in the `public` schema (`User`, `Session`, `Invitation`, `PasswordReset`, `AuditLog`, `Story`, `StoryPage`, `Tag`, `StoryTag`, `Draft`, `Genre`, `AgeGroup`, `CharacterGender`) and installs a `deny_all_postgrest` RESTRICTIVE policy targeting the `anon` and `authenticated` roles (the roles PostgREST authenticates as). The policy uses `USING (false) WITH CHECK (false)`, so any PostgREST request fails immediately. The `RESTRICTIVE` qualifier means future permissive policies would be AND-ed with this deny-all, so widening access later cannot happen by accident.

### 2. `prisma/migrations/0003_rls_prisma_migrations/migration.sql`

Same treatment for Prisma's internal `_prisma_migrations` bookkeeping table — RLS enabled, same deny-all policy.

## Why this approach (and not moving the table out of `public`)

Moving `_prisma_migrations` to a non-public schema (the other viable option) was considered and rejected for now. It would require either updating the datasource `schemas` block plus a `SET SCHEMA` SQL statement, plus changes to the connection `search_path` so Prisma can still find the table. That is the right long-term cleanup, but it is more invasive than the current need. Adding one short migration mirrors the pattern already applied to the other 13 tables and clears the linter warning with no schema juggling.

## How the migration was applied

`npx prisma migrate deploy` was attempted first. It errored with `P1001: Can't reach database server` against the transaction pooler (port 6543), and then hung silently when retried against the session pooler (port 5432). The TCP layer was reachable — `Test-NetConnection` confirmed both ports respond — so the failure was at the Prisma client / Supabase pooler handshake layer in this environment, not a network problem.

The migration was therefore applied directly with `psql.exe` (PostgreSQL 18 client, already installed at `C:\Program Files\PostgreSQL\18\bin\psql.exe`) against the session pooler. After applying each migration's SQL, a row was inserted into `_prisma_migrations` so Prisma's migration tracker sees the migration as already applied and will not attempt to re-run it on a subsequent `prisma migrate deploy`.

## Verification

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Result: all 14 tables (13 application tables + `_prisma_migrations`) report `rowsecurity = t`.

```sql
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Result: every table has a `deny_all_postgrest` policy on `{anon, authenticated}` for `ALL` commands with `USING (false)` and `WITH CHECK (false)`.

## Impact on the running application

None. Prisma connects as the `postgres` superuser, which bypasses RLS by default, so all existing queries (reads, writes, migrations, the audit log, login flow) continue to work unchanged. The deny-all policy affects only the `anon` and `authenticated` roles, which the application does not use.

## Recommended follow-ups (not done)

- Configure `datasource db.directUrl = env("DIRECT_URL")` in [prisma/schema.prisma](prisma/schema.prisma) so Prisma automatically uses the session pooler for migrations. This may help `prisma migrate deploy` work reliably from this machine.
- Consider moving `_prisma_migrations` to its own schema (`prisma_migrations`) so it does not show up in the `public` schema at all, then drop the policy created by `0003`. This is a cosmetic improvement — security-wise it is already resolved.
- Revisit RLS if PostgREST is ever turned on: replace the deny-all policies with real per-role policies.
