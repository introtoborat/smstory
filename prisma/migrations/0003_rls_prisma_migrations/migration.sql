-- Enable Row Level Security on Prisma's internal _prisma_migrations table.
--
-- Background: Supabase's Security Advisor flags every public-schema table
-- that does not have RLS enabled, regardless of whether the table actually
-- receives PostgREST traffic. _prisma_migrations is Prisma's bookkeeping
-- table for applied migrations; it sits in `public` because that is the
-- default schema for the datasource block.
--
-- Strategy: enable RLS and install the same RESTRICTIVE deny-all policy
-- used for the rest of the application tables, targeting the PostgREST
-- `anon` and `authenticated` roles. Prisma connects as the `postgres`
-- superuser, which bypasses RLS by default, so migration tracking is
-- unaffected.

ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_postgrest" ON _prisma_migrations;

CREATE POLICY "deny_all_postgrest" ON _prisma_migrations
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
