-- ==============================================
-- ADD UNIQUE CONSTRAINT FOR (client_name, branch, sku)
-- This prevents duplicate customers with same Client Name + Branch + SKU
-- ==============================================

-- Step 1: Check for existing duplicates
SELECT 
    client_name,
    branch,
    sku,
    COUNT(*) as count,
    array_agg(id ORDER BY created_at) as customer_ids
FROM public.customers
WHERE sku IS NOT NULL AND sku != ''
GROUP BY client_name, branch, sku
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: Drop old unique constraint if it exists (client_name + branch only)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_client_name_branch_key;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_client_name_branch_unique;

-- Step 3: Add new unique constraint that includes SKU
-- This allows same client_name + branch with different SKUs
ALTER TABLE public.customers 
ADD CONSTRAINT customers_client_branch_sku_unique 
UNIQUE (client_name, branch, sku);

-- Step 4: Verify the constraint was created
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
  AND contype = 'u'
  AND pg_get_constraintdef(oid) LIKE '%client_name%'
  AND pg_get_constraintdef(oid) LIKE '%branch%'
  AND pg_get_constraintdef(oid) LIKE '%sku%';

