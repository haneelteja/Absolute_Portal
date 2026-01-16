-- ==============================================
-- CHECK CUSTOMERS TABLE UNIQUE CONSTRAINT
-- Run this to see what unique constraint exists
-- ==============================================

SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
  AND contype = 'u'
ORDER BY conname;

-- If no results, there is no unique constraint on the customers table
