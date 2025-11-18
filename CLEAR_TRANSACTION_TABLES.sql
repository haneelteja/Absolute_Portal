-- ==============================================
-- CLEAR TRANSACTION TABLES
-- This script will delete all data from:
-- 1. Orders
-- 2. Recent Client Transactions (sales_transactions)
-- 3. Elma Transaction History (factory_payables)
-- 4. Transport Transactions (transport_expenses)
-- ==============================================

-- WARNING: This will permanently delete all data from these tables!
-- Make sure you have a backup if needed.

-- Step 1: Check current row counts (for verification)
SELECT 'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL
SELECT 'factory_payables', COUNT(*) FROM factory_payables
UNION ALL
SELECT 'transport_expenses', COUNT(*) FROM transport_expenses;

-- Step 2: Delete data in order (respecting foreign key constraints)
-- Delete from child tables first, then parent tables if needed

-- Clear Transport Transactions
DELETE FROM transport_expenses;
SELECT 'transport_expenses cleared' as status, COUNT(*) as remaining_rows FROM transport_expenses;

-- Clear Elma Transaction History (factory_payables)
DELETE FROM factory_payables;
SELECT 'factory_payables cleared' as status, COUNT(*) as remaining_rows FROM factory_payables;

-- Clear Recent Client Transactions (sales_transactions)
DELETE FROM sales_transactions;
SELECT 'sales_transactions cleared' as status, COUNT(*) as remaining_rows FROM sales_transactions;

-- Clear Orders
DELETE FROM orders;
SELECT 'orders cleared' as status, COUNT(*) as remaining_rows FROM orders;

-- Step 3: Verify all tables are empty
SELECT 'orders' as table_name, COUNT(*) as remaining_rows FROM orders
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL
SELECT 'factory_payables', COUNT(*) FROM factory_payables
UNION ALL
SELECT 'transport_expenses', COUNT(*) FROM transport_expenses;

-- Step 4: Reset sequences if any (optional, for auto-increment IDs if used)
-- Note: UUID primary keys don't need sequence reset

-- ==============================================
-- ALTERNATIVE: If you want to reset created_at/updated_at timestamps
-- You can also use TRUNCATE instead of DELETE (faster, but resets sequences)
-- ==============================================

-- Uncomment below if you prefer TRUNCATE (faster, but cannot be rolled back)
-- TRUNCATE TABLE transport_expenses CASCADE;
-- TRUNCATE TABLE factory_payables CASCADE;
-- TRUNCATE TABLE sales_transactions CASCADE;
-- TRUNCATE TABLE orders CASCADE;

