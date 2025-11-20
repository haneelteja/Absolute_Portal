-- ==============================================
-- CLEAR TRANSACTION TABLES (SAFE VERSION WITH TRANSACTION)
-- This script uses a transaction so you can rollback if needed
-- ==============================================

BEGIN;

-- Step 1: Check current row counts BEFORE deletion
SELECT 'BEFORE DELETION' as status;
SELECT 'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL
SELECT 'factory_payables', COUNT(*) FROM factory_payables
UNION ALL
SELECT 'transport_expenses', COUNT(*) FROM transport_expenses;

-- Step 2: Delete data
DELETE FROM transport_expenses;
DELETE FROM factory_payables;
DELETE FROM sales_transactions;
DELETE FROM orders;

-- Step 3: Verify deletion
SELECT 'AFTER DELETION' as status;
SELECT 'orders' as table_name, COUNT(*) as remaining_rows FROM orders
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL
SELECT 'factory_payables', COUNT(*) FROM factory_payables
UNION ALL
SELECT 'transport_expenses', COUNT(*) FROM transport_expenses;

-- Step 4: Review the results above
-- If everything looks good, run: COMMIT;
-- If you want to undo, run: ROLLBACK;

-- COMMIT;  -- Uncomment this line to confirm deletion
-- ROLLBACK;  -- Uncomment this line to undo deletion

