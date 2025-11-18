-- ==============================================
-- VERIFY SALES_TRANSACTIONS TABLE SCHEMA
-- Check all columns to ensure they match what the app expects
-- ==============================================

-- Step 1: Check all columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales_transactions'
ORDER BY ordinal_position;

-- Step 2: Test INSERT with all required fields
-- This simulates what the app is trying to do
INSERT INTO public.sales_transactions (
    customer_id,
    transaction_type,
    amount,
    total_amount,
    quantity,
    sku,
    description,
    transaction_date,
    branch
) VALUES (
    (SELECT id FROM public.customers WHERE is_active = true LIMIT 1),
    'sale',
    100.00,
    100.00,
    10,
    'TEST_SKU',
    'Test transaction',
    CURRENT_DATE,
    'TEST_BRANCH'
)
RETURNING *;

-- Clean up test data
DELETE FROM public.sales_transactions 
WHERE description = 'Test transaction' AND sku = 'TEST_SKU';

