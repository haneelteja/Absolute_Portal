-- ==============================================
-- CLEAR ALL TABLES
-- This script will delete all data from all tables in the database
-- ==============================================

-- WARNING: This will permanently delete all data from all tables!
-- Make sure you have a backup if needed.
-- This operation cannot be rolled back easily.

-- ==============================================
-- Step 1: Check current row counts (for verification)
-- Only queries tables that exist
-- ==============================================
DO $$
DECLARE
    table_list TEXT[] := ARRAY[
        'profiles', 'user_management', 'customers', 'sku_configurations',
        'sales_transactions', 'factory_payables', 'transport_expenses',
        'label_vendors', 'label_purchases', 'label_payments', 'orders',
        'orders_dispatch', 'factory_pricing', 'saved_filters',
        'bulk_operations', 'label_availabilities'
    ];
    table_name TEXT;
    sql_query TEXT;
    result_count INTEGER;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        -- Check if table exists using to_regclass
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO result_count;
            RAISE NOTICE 'Table: % - Row count: %', table_name, result_count;
        ELSE
            RAISE NOTICE 'Table: % - Does not exist, skipping', table_name;
        END IF;
    END LOOP;
END $$;

-- ==============================================
-- Step 2: Delete data in order (respecting foreign key constraints)
-- Delete from child tables first, then parent tables
-- Only deletes from tables that exist
-- ==============================================
DO $$
DECLARE
    -- Tables in deletion order (child tables first)
    table_list TEXT[] := ARRAY[
        'sales_transactions',      -- Child of customers
        'orders_dispatch',          -- Child of orders
        'saved_filters',            -- Standalone
        'bulk_operations',          -- Standalone
        'transport_expenses',       -- Standalone
        'factory_payables',         -- Standalone
        'label_payments',           -- Standalone
        'label_purchases',          -- Standalone
        'orders',                   -- Standalone
        'factory_pricing',          -- Standalone
        'label_vendors',            -- Standalone
        'label_availabilities',     -- Standalone
        'customers',                -- Parent table
        'sku_configurations',       -- Standalone
        'user_management',          -- Standalone
        'profiles'                  -- References auth.users
    ];
    table_name TEXT;
    deleted_count INTEGER;
    remaining_count INTEGER;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        -- Check if table exists using to_regclass
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
            -- Delete all rows
            EXECUTE format('DELETE FROM %I', table_name);
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            -- Check remaining rows
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO remaining_count;
            
            RAISE NOTICE 'Table: % - Deleted: % rows, Remaining: % rows', 
                table_name, deleted_count, remaining_count;
        ELSE
            RAISE NOTICE 'Table: % - Does not exist, skipping', table_name;
        END IF;
    END LOOP;
END $$;

-- ==============================================
-- Step 3: Verify all tables are empty
-- Only checks tables that exist
-- ==============================================
DO $$
DECLARE
    table_list TEXT[] := ARRAY[
        'profiles', 'user_management', 'customers', 'sku_configurations',
        'sales_transactions', 'factory_payables', 'transport_expenses',
        'label_vendors', 'label_purchases', 'label_payments', 'orders',
        'orders_dispatch', 'factory_pricing', 'saved_filters',
        'bulk_operations', 'label_availabilities'
    ];
    table_name TEXT;
    remaining_count INTEGER;
    all_empty BOOLEAN := true;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Final Verification:';
    RAISE NOTICE '========================================';
    
    FOREACH table_name IN ARRAY table_list
    LOOP
        -- Check if table exists using to_regclass
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO remaining_count;
            IF remaining_count > 0 THEN
                all_empty := false;
                RAISE NOTICE 'Table: % - Remaining rows: %', table_name, remaining_count;
            ELSE
                RAISE NOTICE 'Table: % - Empty ✓', table_name;
            END IF;
        ELSE
            RAISE NOTICE 'Table: % - Does not exist (skipped)', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    IF all_empty THEN
        RAISE NOTICE 'All existing tables are now empty!';
    ELSE
        RAISE NOTICE 'Some tables still have data. Please check above.';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- ==============================================
-- ALTERNATIVE: Faster method using TRUNCATE
-- Uncomment below if you prefer TRUNCATE (faster, but cannot be rolled back)
-- Note: TRUNCATE resets sequences and cannot be used with tables that have foreign key references
-- ==============================================

-- Uncomment the following if you want to use TRUNCATE instead:
/*
-- Disable foreign key checks temporarily (PostgreSQL doesn't support this directly)
-- So we need to truncate in the correct order

TRUNCATE TABLE sales_transactions CASCADE;
TRUNCATE TABLE orders_dispatch CASCADE;
TRUNCATE TABLE saved_filters CASCADE;
TRUNCATE TABLE bulk_operations CASCADE;
TRUNCATE TABLE transport_expenses CASCADE;
TRUNCATE TABLE factory_payables CASCADE;
TRUNCATE TABLE label_payments CASCADE;
TRUNCATE TABLE label_purchases CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE factory_pricing CASCADE;
TRUNCATE TABLE label_vendors CASCADE;
TRUNCATE TABLE label_availabilities CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE sku_configurations CASCADE;
TRUNCATE TABLE user_management CASCADE;
TRUNCATE TABLE profiles CASCADE;
*/

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
SELECT 'All tables cleared successfully!' as message;
