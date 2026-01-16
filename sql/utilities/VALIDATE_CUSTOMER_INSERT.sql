-- ==============================================
-- VALIDATION SCRIPT FOR INSERT_CUSTOMERS_FROM_PRICING_DATA.sql
-- Run this to check for potential issues before executing the insert
-- ==============================================

-- 1. Check current unique constraint on customers table
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
  AND contype = 'u'
ORDER BY conname;

-- 2. Test the CTE syntax (dry run - no actual insert)
WITH pricing_data AS (
  SELECT * FROM (VALUES 
    ('Jubile Festa inn', 'Jubilee Hills', '500 P', 9.00),
    ('Jubile Festa inn', 'Jubilee Hills', '250 EC', 5.50),
    ('House party', 'Sanikpuri', '500 P', 9.00)
  ) AS t(client_name, branch, sku, price_per_bottle)
),
distinct_customers AS (
  SELECT DISTINCT ON (client_name, branch)
    client_name,
    branch,
    sku,
    price_per_bottle
  FROM pricing_data
  ORDER BY client_name, branch, sku
)
SELECT 
  'CTE Test' as test_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT client_name || '-' || COALESCE(branch, '')) as unique_combinations
FROM distinct_customers;

-- 3. Check for data type compatibility
SELECT 
  'Data Type Check' as test_name,
  pg_typeof('Jubile Festa inn'::TEXT) as client_name_type,
  pg_typeof('Jubilee Hills'::TEXT) as branch_type,
  pg_typeof('500 P'::TEXT) as sku_type,
  pg_typeof(9.00::DECIMAL(10,2)) as price_type,
  pg_typeof(true::BOOLEAN) as is_active_type;

-- 4. Count unique client-branch combinations in the data
WITH pricing_data AS (
  SELECT * FROM (VALUES 
    ('Jubile Festa inn', 'Jubilee Hills', '500 P', 9.00),
    ('Jubile Festa inn', 'Jubilee Hills', '250 EC', 5.50),
    ('House party', 'Sanikpuri', '500 P', 9.00),
    ('This is it café', 'Sanikpuri', '500 P', 9.00),
    ('Tilaks kitchen', 'Madhapur', '500 P', 8.50),
    ('Golden Pavilion', 'Banjara Hills', '750 AL', 14.00),
    ('Element E7', 'Kukatpally', '1000 P', 15.00),
    ('Deccan kitchen', 'Film nagar', '750 P', 14.50),
    ('Deccan kitchen', 'Film nagar', '250 EC', 5.50),
    ('The English café', 'Nanakramguda', '750 P', 15.00),
    ('Atias Kitchen', 'Gandipet', '1000 P', 14.00),
    ('Gismat', 'Hyderabad', '500 P', 8.30),
    ('Good Vibes', 'Khajaguda', '500 P', 9.50),
    ('Fusion Aroma', 'Nallagandla', '1000 P', 14.50),
    ('Biryanis and More', 'Ameerpet', '1000 P', 15.00),
    ('Biryanis and More', 'Tirumalagiri', '1000 P', 15.00),
    ('Biryanis and More', 'Nizampet', '1000 P', 15.00),
    ('Biryanis and More', 'Ongole', '1000 P', 16.00),
    ('Biryanis and More', 'Warangal', '1000 P', 15.00),
    ('Biryanis and More', 'Khammam', '1000 P', 15.00),
    ('Biryanis and More', 'Gachibowli', '1000 P', 15.00),
    ('Biryanis and More', 'Narakoduru', '1000 P', 14.50),
    ('Biryanis and More', 'Chandha Nagar', '1000 P', 15.00),
    ('Tara South Indian', 'Hitech City', '500 P', 8.50),
    ('benguluru Bhavan', 'Kondapur', '500 P', 8.50),
    ('Mid land', 'Telangana', '1000 P', 15.50),
    ('Mid land', 'Telangana', '750 AL', 14.50),
    ('Mid land', 'Andhra Pradesh', '750 AL', 14.50),
    ('Tonique', 'Vijayawada', '1000 P', 14.00),
    ('Krigo', 'Elluru', '1000 P', 14.50),
    ('Alley 91', 'Nanakramguda', '500 P', 10.00),
    ('Alley 91', 'Nanakramguda', '250 EC', 5.71),
    ('Blossamin Spa', 'Tirumalagiri', '250 P', 6.00),
    ('jagan Pan House', 'Bhoodan Pochampally', '500 P', 9.50),
    ('jagan Pan House', 'Bhoodan Pochampally', '1000 P', 15.00),
    ('Chandhu Poda Marriage Order', 'Ongole', '250 P', 6.80),
    ('Maryadha Ramanna', 'Kondapur', '500 P', 8.50),
    ('Maryadha Ramanna', 'L B Nagar', '500 P', 8.50),
    ('Chaitanya''s Modern Kitchen', 'Khajaguda', '500 P', 8.75),
    ('soul of south', 'Film nagar', '500 P', 8.50),
    ('1980s Milatry Hotel', 'Khajaguda', '750 AL', 14.50),
    ('Intercity', 'Bachupally', '500 EC', 5.50),
    ('Aaha', 'Khajaguda', '500 AL', 8.75),
    ('Gismat', 'Dilshuknagar', '500 P', 8.50),
    ('Gismat', 'Ameerpet', '500 P', 8.50),
    ('Gismat', 'Chandha Nagar', '500 P', 8.50),
    ('Gismat', 'Pragathi nagar', '500 P', 8.50),
    ('Gismat', 'Kondapur', '500 P', 8.50),
    ('Gismat', 'Lakshmipuram', '500 P', 8.50),
    ('Gismat', 'Tenali', '500 P', 8.50),
    ('Gismat', 'Main office', '500 P', 8.50),
    ('Intercity', 'Bachupally', '500 EC', 5.90),
    ('Hiyya Chrono Jail Mandi', 'Madhapur', '500 P', 8.50),
    ('Tawalogy', 'Gandipet', '1000 P', 14.50),
    ('Tawalogy', 'Gandipet', '250 EC', 4.29),
    ('Happy Monkeys', 'Nagole', '500 P', 9.00),
    ('Alley 91', 'Nanakramguda', '250 P', 7.67)
  ) AS t(client_name, branch, sku, price_per_bottle)
)
SELECT 
  'Data Summary' as test_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT client_name || '-' || COALESCE(branch, '')) as unique_client_branch_combinations,
  COUNT(DISTINCT client_name) as unique_clients,
  COUNT(DISTINCT branch) as unique_branches,
  COUNT(DISTINCT sku) as unique_skus
FROM pricing_data;

-- 5. Find duplicate client-branch combinations (will be deduplicated)
WITH pricing_data AS (
  SELECT * FROM (VALUES 
    ('Jubile Festa inn', 'Jubilee Hills', '500 P', 9.00),
    ('Jubile Festa inn', 'Jubilee Hills', '250 EC', 5.50),
    ('Deccan kitchen', 'Film nagar', '750 P', 14.50),
    ('Deccan kitchen', 'Film nagar', '250 EC', 5.50),
    ('Mid land', 'Telangana', '1000 P', 15.50),
    ('Mid land', 'Telangana', '750 AL', 14.50),
    ('Alley 91', 'Nanakramguda', '500 P', 10.00),
    ('Alley 91', 'Nanakramguda', '250 EC', 5.71),
    ('Alley 91', 'Nanakramguda', '250 P', 7.67),
    ('jagan Pan House', 'Bhoodan Pochampally', '500 P', 9.50),
    ('jagan Pan House', 'Bhoodan Pochampally', '1000 P', 15.00),
    ('Tawalogy', 'Gandipet', '1000 P', 14.50),
    ('Tawalogy', 'Gandipet', '250 EC', 4.29),
    ('Intercity', 'Bachupally', '500 EC', 5.50),
    ('Intercity', 'Bachupally', '500 EC', 5.90)
  ) AS t(client_name, branch, sku, price_per_bottle)
)
SELECT 
  'Duplicate Client-Branch Combinations' as test_name,
  client_name,
  branch,
  COUNT(*) as duplicate_count,
  STRING_AGG(DISTINCT sku, ', ' ORDER BY sku) as skus,
  STRING_AGG(DISTINCT price_per_bottle::TEXT, ', ' ORDER BY price_per_bottle::TEXT) as prices
FROM pricing_data
GROUP BY client_name, branch
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, client_name, branch;

-- 6. Check for NULL or empty values that might cause issues
SELECT 
  'NULL/Empty Check' as test_name,
  COUNT(*) FILTER (WHERE client_name IS NULL OR client_name = '') as null_client_names,
  COUNT(*) FILTER (WHERE branch IS NULL OR branch = '') as null_branches,
  COUNT(*) FILTER (WHERE price_per_bottle IS NULL) as null_prices
FROM (VALUES 
  ('Jubile Festa inn', 'Jubilee Hills', '500 P', 9.00),
  ('House party', 'Sanikpuri', '500 P', 9.00)
) AS t(client_name, branch, sku, price_per_bottle);

-- 7. Verify decimal precision (should fit in DECIMAL(10,2))
SELECT 
  'Decimal Precision Check' as test_name,
  price_per_bottle,
  CASE 
    WHEN price_per_bottle::DECIMAL(10,2) = price_per_bottle THEN '✓ OK'
    ELSE '✗ Precision loss'
  END as precision_check
FROM (VALUES 
  (5.71::DECIMAL),
  (4.29::DECIMAL),
  (7.67::DECIMAL),
  (5.714285714::DECIMAL),
  (4.285714286::DECIMAL),
  (7.666666667::DECIMAL)
) AS t(price_per_bottle);
