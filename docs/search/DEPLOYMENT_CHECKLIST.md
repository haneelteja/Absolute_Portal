# Deployment Checklist - Enhanced Search & Filtering System

## Pre-Deployment

### Database Migrations
- [ ] Run `20250110000000_create_saved_filters_table.sql` in Supabase SQL Editor
- [ ] Run `20250110000001_create_fulltext_search_indexes.sql` in Supabase SQL Editor
- [ ] Run `20250110000002_create_search_function.sql` in Supabase SQL Editor (optional, for advanced search)
- [ ] Verify tables created: `saved_filters`, `bulk_operations`
- [ ] Verify indexes created (check with `\di` in psql or Supabase dashboard)
- [ ] Verify RLS policies are active

### Code Verification
- [ ] All TypeScript types compile without errors
- [ ] Build succeeds (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] All components import correctly

### Testing
- [ ] Test basic search functionality
- [ ] Test saved filters (save, load, delete)
- [ ] Test bulk operations (update, delete)
- [ ] Test cross-module search
- [ ] Test filter combinations
- [ ] Test with real data volumes

## Deployment Steps

### 1. Database Setup
```sql
-- In Supabase SQL Editor, run in order:
-- 1. Create tables
\i supabase/migrations/20250110000000_create_saved_filters_table.sql

-- 2. Create indexes
\i supabase/migrations/20250110000001_create_fulltext_search_indexes.sql

-- 3. Create functions (optional)
\i supabase/migrations/20250110000002_create_search_function.sql
```

### 2. Verify Database
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('saved_filters', 'bulk_operations');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE '%fts%';

-- Check RLS
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('saved_filters', 'bulk_operations');
```

### 3. Code Deployment
- [ ] Commit all search system files
- [ ] Push to GitHub
- [ ] Verify Vercel deployment succeeds
- [ ] Check build logs for errors

### 4. Post-Deployment Verification
- [ ] Test search in production
- [ ] Test saved filters
- [ ] Test bulk operations
- [ ] Monitor error logs
- [ ] Check performance metrics

## Rollback Plan

If issues occur:

1. **Database Rollback**
   ```sql
   -- Drop tables (if needed)
   DROP TABLE IF EXISTS bulk_operations CASCADE;
   DROP TABLE IF EXISTS saved_filters CASCADE;
   
   -- Drop indexes (if needed)
   DROP INDEX IF EXISTS idx_sales_transactions_fts_combined;
   -- (repeat for other modules)
   ```

2. **Code Rollback**
   - Revert to previous commit
   - Remove search component imports
   - Restore original queries

## Monitoring

### Key Metrics
- Search query response time
- Filter save/load success rate
- Bulk operation success rate
- Database query performance
- Error rates

### Alerts
- Search queries > 500ms
- Bulk operation failures > 5%
- Database connection errors
- RLS policy violations

## Support

If deployment issues occur:
1. Check Supabase logs
2. Review build logs in Vercel
3. Check browser console for errors
4. Verify environment variables
5. Review RLS policies

---

**Status**: Ready for deployment after database migrations
