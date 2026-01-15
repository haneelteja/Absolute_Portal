-- ==============================================
-- VALIDATE MIGRATED DATA
-- Run this script after importing legacy data
-- to verify data integrity and completeness
-- ==============================================

-- ==============================================
-- 1. TABLE ROW COUNTS
-- ==============================================
SELECT 'Table Row Counts' as section;
SELECT 
  'sku_configurations' as table_name, 
  COUNT(*) as row_count,
  COUNT(DISTINCT sku) as unique_skus
FROM sku_configurations
UNION ALL
SELECT 
  'label_vendors', 
  COUNT(*),
  COUNT(DISTINCT vendor_name)
FROM label_vendors
UNION ALL
SELECT 
  'factory_pricing', 
  COUNT(*),
  COUNT(DISTINCT sku)
FROM factory_pricing
UNION ALL
SELECT 
  'customers', 
  COUNT(*),
  COUNT(DISTINCT client_name || '-' || COALESCE(branch, ''))
FROM customers
UNION ALL
SELECT 
  'orders', 
  COUNT(*),
  COUNT(DISTINCT client || '-' || branch)
FROM orders
UNION ALL
SELECT 
  'sales_transactions', 
  COUNT(*),
  COUNT(DISTINCT customer_id)
FROM sales_transactions
UNION ALL
SELECT 
  'factory_payables', 
  COUNT(*),
  NULL
FROM factory_payables
UNION ALL
SELECT 
  'transport_expenses', 
  COUNT(*),
  COUNT(DISTINCT expense_group)
FROM transport_expenses
UNION ALL
SELECT 
  'label_purchases', 
  COUNT(*),
  COUNT(DISTINCT vendor)
FROM label_purchases
UNION ALL
SELECT 
  'label_payments', 
  COUNT(*),
  COUNT(DISTINCT vendor)
FROM label_payments
ORDER BY table_name;

-- ==============================================
-- 2. DATA INTEGRITY CHECKS
-- ==============================================

-- Check for orphaned sales transactions (should be 0)
SELECT 
  'Orphaned Sales Transactions' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Found orphaned records'
  END as status
FROM sales_transactions s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE c.id IS NULL;

-- Check for orders with invalid SKUs (should be 0)
SELECT 
  'Orders with Invalid SKUs' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Found orders with invalid SKUs'
  END as status
FROM orders o
LEFT JOIN sku_configurations sc ON o.sku = sc.sku
WHERE sc.sku IS NULL;

-- Check for sales transactions with invalid SKUs (should be 0 or acceptable)
SELECT 
  'Sales Transactions with Invalid SKUs' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING - Some transactions have invalid SKUs (may be acceptable)'
  END as status
FROM sales_transactions s
WHERE s.sku IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sku_configurations sc WHERE sc.sku = s.sku
  );

-- Check for customers with invalid SKUs (should be 0 or acceptable)
SELECT 
  'Customers with Invalid SKUs' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING - Some customers have invalid SKUs (may be acceptable)'
  END as status
FROM customers c
WHERE c.sku IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sku_configurations sc WHERE sc.sku = c.sku
  );

-- Check for duplicate customers (should be 0)
SELECT 
  'Duplicate Customers' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Found duplicate customers'
  END as status
FROM (
  SELECT client_name, branch, COUNT(*) as cnt
  FROM customers
  GROUP BY client_name, branch
  HAVING COUNT(*) > 1
) duplicates;

-- Check for duplicate SKUs (should be 0)
SELECT 
  'Duplicate SKUs' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Found duplicate SKUs'
  END as status
FROM (
  SELECT sku, COUNT(*) as cnt
  FROM sku_configurations
  GROUP BY sku
  HAVING COUNT(*) > 1
) duplicates;

-- ==============================================
-- 3. DATA QUALITY CHECKS
-- ==============================================

-- Check for customers without contact information
SELECT 
  'Customers Without Contact Info' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING - Some customers missing contact info'
  END as status
FROM customers
WHERE (contact_person IS NULL OR contact_person = '')
  AND (phone IS NULL OR phone = '')
  AND (email IS NULL OR email = '');

-- Check for negative amounts in transactions
SELECT 
  'Negative Transaction Amounts' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING - Found negative amounts (may be intentional)'
  END as status
FROM (
  SELECT id FROM sales_transactions WHERE amount < 0
  UNION ALL
  SELECT id FROM factory_payables WHERE amount < 0
  UNION ALL
  SELECT id FROM transport_expenses WHERE amount < 0
  UNION ALL
  SELECT id FROM label_payments WHERE payment_amount < 0
) negative_amounts;

-- Check for future-dated transactions (beyond reasonable date)
SELECT 
  'Future-Dated Transactions' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING - Found transactions dated in the future'
  END as status
FROM (
  SELECT id FROM sales_transactions WHERE transaction_date > CURRENT_DATE + INTERVAL '30 days'
  UNION ALL
  SELECT id FROM factory_payables WHERE transaction_date > CURRENT_DATE + INTERVAL '30 days'
  UNION ALL
  SELECT id FROM transport_expenses WHERE transaction_date > CURRENT_DATE + INTERVAL '30 days'
  UNION ALL
  SELECT id FROM orders WHERE tentative_delivery_date > CURRENT_DATE + INTERVAL '365 days'
) future_dates;

-- Check for very old transactions (older than 10 years)
SELECT 
  'Very Old Transactions' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING - Found very old transactions (may need review)'
  END as status
FROM (
  SELECT id FROM sales_transactions WHERE transaction_date < CURRENT_DATE - INTERVAL '10 years'
  UNION ALL
  SELECT id FROM factory_payables WHERE transaction_date < CURRENT_DATE - INTERVAL '10 years'
  UNION ALL
  SELECT id FROM transport_expenses WHERE transaction_date < CURRENT_DATE - INTERVAL '10 years'
) old_dates;

-- ==============================================
-- 4. REFERENTIAL INTEGRITY SUMMARY
-- ==============================================

SELECT 'Referential Integrity Summary' as section;

-- Sales transactions referencing customers
SELECT 
  'Sales Transactions → Customers' as relationship,
  COUNT(DISTINCT s.customer_id) as referenced_customers,
  (SELECT COUNT(*) FROM customers) as total_customers,
  CASE 
    WHEN COUNT(DISTINCT s.customer_id) <= (SELECT COUNT(*) FROM customers) THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM sales_transactions s;

-- Orders referencing valid clients/branches
SELECT 
  'Orders → Customers (by name)' as relationship,
  COUNT(DISTINCT o.client || '-' || o.branch) as unique_order_customers,
  (SELECT COUNT(DISTINCT client_name || '-' || COALESCE(branch, '')) FROM customers) as total_customers,
  CASE 
    WHEN COUNT(DISTINCT o.client || '-' || o.branch) <= 
         (SELECT COUNT(DISTINCT client_name || '-' || COALESCE(branch, '')) FROM customers) 
    THEN '✓ PASS'
    ELSE '⚠ WARNING - Some orders reference non-existent customers'
  END as status
FROM orders o;

-- ==============================================
-- 5. DATA COMPLETENESS CHECKS
-- ==============================================

SELECT 'Data Completeness' as section;

-- Check for empty required fields
SELECT 
  'Customers with Missing Required Fields' as check_name,
  COUNT(*) as issue_count
FROM customers
WHERE client_name IS NULL OR client_name = '';

-- Check for transactions with missing amounts
SELECT 
  'Transactions with Missing Amounts' as check_name,
  COUNT(*) as issue_count
FROM (
  SELECT id FROM sales_transactions WHERE amount IS NULL
  UNION ALL
  SELECT id FROM factory_payables WHERE amount IS NULL
  UNION ALL
  SELECT id FROM transport_expenses WHERE amount IS NULL
) missing_amounts;

-- ==============================================
-- 6. FINAL SUMMARY
-- ==============================================

SELECT 'Validation Complete!' as message;
SELECT 
  'Review the results above and address any issues marked as FAIL or WARNING' as next_steps;
