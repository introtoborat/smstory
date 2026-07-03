-- No-op: 0000_init already creates the full schema matching this point in time.
-- This migration is preserved so existing development databases that have already
-- applied it keep their history. On fresh databases, 0000_init does the work.
SELECT 1;
