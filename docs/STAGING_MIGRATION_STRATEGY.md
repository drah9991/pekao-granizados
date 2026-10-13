# CRITICAL: Staging Migration Strategy

## 🚨 Current Situation

**STAGING IS CRITICALLY OUT OF SYNC**

- **Local migrations:** 96 files in `supabase/migrations/`
- **Staging applied:** 0 tracked migrations
- **Data in staging:** products (50), categories (9), customers (3)
- **Schema state:** Partial, inconsistent, manually applied

## 📊 Audit Results Summary

### Missing Tables
- `store_stock` - Inventory management
- `invoices` - Invoice generation
- `movements` - Inventory audit log

### Broken Tables
- `orders` - Has NO columns (empty schema)
- `order_items` - Has NO columns (empty schema)

### Inconsistent Tables
- `products` - Has old schema columns (category_id, supplier_id, product_type_id)
- `profiles` - Has extra column (email)

### Data to Preserve
- ✅ profiles: 1 record
- ✅ user_roles: 1 record  
- ✅ stores: 1 record
- ✅ products: 50 records
- ✅ customers: 3 records

## 🎯 Recommended Strategy

### Option A: FULL RESET (Recommended for Staging)

**Pros:**
- Clean slate, guaranteed consistency
- All 96 migrations applied in correct order
- No conflicts from partial manual changes

**Cons:**
- Loses existing data (50 products, 3 customers)
- Needs data re-import

**Process:**
```bash
1. Export critical data
   node scripts/export-for-staging.js

2. Reset staging database (Supabase Dashboard)
   Settings > Database > Reset database

3. Apply all migrations in order
   node scripts/migrate-staging.js

4. Re-import data
   node scripts/import-to-staging.js

5. Validate
   node scripts/audit-staging-schema.js
```

### Option B: SURGICAL FIX (Current Approach)

**Pros:**
- Preserves existing data
- No data export/import needed

**Cons:**
- Risk of conflicts between migrations
- Some migrations may fail due to existing partial schema
- May need manual intervention

**Process:**
```bash
1. Apply exec_sql function first (manual)
   - Go to Supabase SQL Editor
   - Run: supabase/migrations/20250131000001_add_exec_sql_function.sql

2. Apply consolidation migration
   node scripts/migrate-staging.js --file=20250131000000_staging_consolidation.sql

3. Apply remaining 94 migrations sequentially
   node scripts/migrate-staging.js
   
   EXPECTED: Many will fail due to conflicts
   ACTION: Skip failed ones, fix manually

4. Audit and fix remaining issues
   node scripts/audit-staging-schema.js
```

### Option C: HYBRID (BEST FOR PRODUCTION PREP)

**Pros:**
- Data preserved via export/import
- Clean migration history
- Production-ready workflow

**Cons:**
- More steps
- Takes longer

**Process:**
```bash
1. Export ALL data from staging
   node scripts/export-all-for-staging.js
   # Saves to: backups/staging-export-TIMESTAMP/

2. Document current state
   node scripts/audit-staging-schema.js > docs/staging-audit-before.txt

3. Reset staging database
   # Via Supabase Dashboard

4. Apply all migrations cleanly
   node scripts/migrate-staging.js

5. Import data back
   node scripts/import-to-staging.js backups/staging-export-TIMESTAMP/

6. Validate
   node scripts/audit-staging-schema.js > docs/staging-audit-after.txt
   diff docs/staging-audit-before.txt docs/staging-audit-after.txt
```

## ⚡ Quick Win: Apply exec_sql Function

**PREREQUISITE for automated migrations:**

```sql
-- Run this in Supabase SQL Editor FIRST
-- File: supabase/migrations/20250131000001_add_exec_sql_function.sql

create or replace function public.exec_sql(sql_query text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  execute sql_query;
  return json_build_object('success', true, 'executed_at', now());
exception when others then
  raise warning 'exec_sql error: %', SQLERRM;
  return json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
end;
$$;
```

## 🔧 Immediate Actions

### FOR STAGING (Testing Environment)
**Recommendation: Option A (Full Reset)**

1. ✅ Data is test data (50 products can be re-created)
2. ✅ Clean slate ensures consistency
3. ✅ Simulates production deployment process
4. ✅ Fastest path to working state

### FOR PRODUCTION (When Ready)
**Requirement: Option C (Hybrid)**

1. ❗ MUST export all production data
2. ❗ MUST test migration on staging copy first
3. ❗ MUST have rollback plan
4. ❗ MUST coordinate with downtime window

## 📋 Migration Files Priority

### Critical (Core Schema)
1. `20251015032609_268fcd2d-a81d-4972-9ae0-1b865f2b7a30.sql` - Base schema
2. `20250131000001_add_exec_sql_function.sql` - Automation helper
3. `20250131000000_staging_consolidation.sql` - Fix inconsistencies

### Important (Features)
- Cash turns, inventory system, RLS fixes, roles/permissions
- About 20-30 migrations for core POS functionality

### Optional (Enhancements)
- Advanced features, optimizations, nice-to-haves
- Can be applied incrementally after core is stable

## 🚦 Decision Matrix

| Criteria | Option A (Reset) | Option B (Surgical) | Option C (Hybrid) |
|----------|------------------|---------------------|-------------------|
| **Time to complete** | 30 min | 2-4 hours | 1-2 hours |
| **Risk level** | Low | High | Low |
| **Data preservation** | Manual | Automatic | Automatic |
| **Production-ready** | Yes | No | Yes |
| **Reproducible** | Yes | No | Yes |
| **Recommended for** | Staging | Never | Production |

## 🎬 Next Steps

**DECISION REQUIRED:**

Choose one option and confirm before proceeding:

- [ ] **Option A** - Full reset (recommended for staging)
- [ ] **Option B** - Surgical fix (risky, not recommended)
- [ ] **Option C** - Hybrid (recommended for production)

**Then execute the chosen strategy step-by-step.**

---

**Created:** 2025-01-31  
**Status:** AWAITING DECISION
