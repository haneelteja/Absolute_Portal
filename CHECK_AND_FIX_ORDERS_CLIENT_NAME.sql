-- ==============================================
-- CHECK AND FIX ORDERS CLIENT_NAME COLUMN
-- This script checks if orders have client_name populated
-- and helps identify any missing data
-- ==============================================

-- Step 1: Check orders with missing or null client_name
SELECT 
    id,
    client_name,
    client,
    branch,
    sku,
    number_of_cases,
    tentative_delivery_date,
    status,
    created_at
FROM orders
WHERE client_name IS NULL OR client_name = ''
ORDER BY created_at DESC;

-- Step 2: Check total count
SELECT 
    COUNT(*) as total_orders,
    COUNT(client_name) as orders_with_client_name,
    COUNT(*) - COUNT(client_name) as orders_missing_client_name
FROM orders;

-- Step 3: If you need to update orders that have 'client' but not 'client_name'
-- (Uncomment and run only if needed)
/*
UPDATE orders
SET client_name = client
WHERE (client_name IS NULL OR client_name = '')
  AND client IS NOT NULL
  AND client != '';
*/

-- Step 4: Verify the RPC function returns data correctly
SELECT * FROM get_orders_sorted() LIMIT 5;

