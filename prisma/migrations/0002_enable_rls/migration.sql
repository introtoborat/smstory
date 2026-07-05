-- Enable Row Level Security on every public schema table.
--
-- Background: Supabase's PostgREST exposes every table in the `public` schema
-- to the `anon` and `authenticated` roles. Without RLS enabled, those roles
-- get unrestricted read/write access to the underlying data.
--
-- This project does not currently use PostgREST (all DB access goes through
-- Prisma using the `postgres` superuser connection from DATABASE_URL, which
-- bypasses RLS regardless). The Supabase Security Advisor still flags every
-- public table without RLS as a vulnerability, which is what this migration
-- fixes.
--
-- Strategy: enable RLS on every table and install a RESTRICTIVE deny-all
-- policy for `anon` and `authenticated`. The Prisma connection uses a
-- superuser role, so application queries are unaffected; PostgREST calls
-- (if anyone ever introduces them) are blocked until real policies are added.

ALTER TABLE "User"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordReset"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Story"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoryPage"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoryTag"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Draft"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Genre"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgeGroup"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CharacterGender" ENABLE ROW LEVEL SECURITY;

-- Deny all access via PostgREST (anon / authenticated).
-- RESTRICTIVE ensures these combine with any future permissive policy as AND,
-- so adding a permissive policy later cannot accidentally widen access.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'User',
    'Session',
    'Invitation',
    'PasswordReset',
    'AuditLog',
    'Story',
    'StoryPage',
    'Tag',
    'StoryTag',
    'Draft',
    'Genre',
    'AgeGroup',
    'CharacterGender'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "deny_all_postgrest" ON %I;',
      t
    );
    EXECUTE format(
      'CREATE POLICY "deny_all_postgrest" ON %I
         AS RESTRICTIVE
         FOR ALL
         TO anon, authenticated
         USING (false)
         WITH CHECK (false);',
      t
    );
  END LOOP;
END $$;
