-- ==============================================
-- ADD TOTAL_AMOUNT COLUMN TO SALES_TRANSACTIONS
-- This column is required by the application
-- ==============================================

-- Step 1: Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales_transactions'
ORDER BY ordinal_position;

-- Step 2: Add total_amount column if it doesn't exist
ALTER TABLE public.sales_transactions 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2);

-- Step 3: Set total_amount to equal amount for existing records
UPDATE public.sales_transactions 
SET total_amount = amount 
WHERE total_amount IS NULL AND amount IS NOT NULL;

-- Step 4: Set default value for any remaining NULL values
UPDATE public.sales_transactions 
SET total_amount = 0
WHERE total_amount IS NULL;

-- Step 5: Make total_amount NOT NULL (optional - only if you want to enforce it)
-- ALTER TABLE public.sales_transactions ALTER COLUMN total_amount SET NOT NULL;

-- Step 6: Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales_transactions'
  AND column_name = 'total_amount';

-- Step 7: Test INSERT (should work now)
-- This is just a test - don't run unless you want to insert test data
-- INSERT INTO public.sales_transactions (
--     customer_id,
--     transaction_type,
--     amount,
--     total_amount,
--     transaction_date
-- ) VALUES (
--     (SELECT id FROM public.customers LIMIT 1),
--     'sale',
--     100.00,
--     100.00,
--     CURRENT_DATE
-- );

