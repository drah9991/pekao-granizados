---
name: database-migrations
description: Best practices for database migrations, versioning, and schema management for PostgreSQL and Supabase.
origin: ECC
---

Best practices for database migrations and schema management.

### Key Principles
- All schema changes must be in migrations
- Never modify the database directly
- Each migration should be idempotent
- Include RLS policies in the same migration as the table creation

### Supabase Migrations
- Store in `supabase/migrations/`
- Use timestamp-prefixed filenames: `YYYYMMDDHHMMSS_name.sql`
- Always verify migrations on a branch before applying to production

### RLS Policies
```sql
-- Always enable RLS
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Example: Select policy for authenticated users
CREATE POLICY "Users can view their own markets"
ON markets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```
