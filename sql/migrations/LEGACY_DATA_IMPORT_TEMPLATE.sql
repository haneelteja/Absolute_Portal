-- ==============================================
-- LEGACY DATA IMPORT TEMPLATE
-- Use this template to import your legacy data
-- Replace the sample data with your actual data
-- ==============================================

-- IMPORTANT: Run imports in the correct order!
-- 1. Master Data (SKU, Vendors, Pricing)
-- 2. Reference Data (Customers, Users)
-- 3. Transactional Data (Orders, Transactions)

-- ==============================================
-- STEP 1: IMPORT SKU CONFIGURATIONS
-- ==============================================
-- Replace the sample data below with your actual SKU data

INSERT INTO sku_configurations (sku, bottles_per_case)
VALUES 
  ('P 500 ML', 20),
  ('P 1000 ML', 12),
  ('P 250 ML', 24)
  -- Add more SKUs here
ON CONFLICT (sku) DO UPDATE 
SET 
  bottles_per_case = EXCLUDED.bottles_per_case,
  updated_at = NOW();

-- Verify SKU import
SELECT 'SKU Configurations' as table_name, COUNT(*) as imported_count FROM sku_configurations;

-- ==============================================
-- STEP 2: IMPORT LABEL VENDORS
-- ==============================================
-- Replace the sample data below with your actual vendor data

INSERT INTO label_vendors (vendor_name, label_type, price_per_label)
VALUES 
  ('ABC Labels', 'Standard', 0.50),
  ('XYZ Printing', 'Premium', 0.75)
  -- Add more vendors here
ON CONFLICT DO NOTHING;

-- Verify vendor import
SELECT 'Label Vendors' as table_name, COUNT(*) as imported_count FROM label_vendors;

-- ==============================================
-- STEP 3: IMPORT FACTORY PRICING
-- ==============================================
-- Replace the sample data below with your actual pricing data

INSERT INTO factory_pricing (sku, price_per_case, pricing_date)
VALUES 
  ('P 500 ML', 1000.00, CURRENT_DATE),
  ('P 1000 ML', 1500.00, CURRENT_DATE),
  ('P 250 ML', 700.00, CURRENT_DATE)
  -- Add more pricing data here
ON CONFLICT DO NOTHING;

-- Verify pricing import
SELECT 'Factory Pricing' as table_name, COUNT(*) as imported_count FROM factory_pricing;

-- ==============================================
-- STEP 4: IMPORT CUSTOMERS
-- ==============================================
-- Replace the sample data below with your actual customer data
-- IMPORTANT: Ensure SKUs referenced here exist in sku_configurations

INSERT INTO customers (
  client_name, branch, sku, price_per_case, price_per_bottle,
  contact_person, phone, email, address, is_active
)
VALUES 
  ('Benguluru Bhavan', 'Gachibowli', 'P 500 ML', 1200.00, 60.00, 
   'John Doe', '1234567890', 'john@example.com', '123 Main St', true),
  ('Benguluru Bhavan', 'Kondapur', 'P 1000 ML', 1800.00, 150.00,
   'Jane Doe', '0987654321', 'jane@example.com', '456 Oak Ave', true),
  ('Biryanis and more', 'Kukatpally', 'P 500 ML', 1100.00, 55.00,
   'Bob Smith', '1122334455', 'bob@example.com', '789 Pine St', true)
  -- Add more customers here
ON CONFLICT (client_name, branch) DO UPDATE 
SET 
  sku = EXCLUDED.sku,
  price_per_case = EXCLUDED.price_per_case,
  price_per_bottle = EXCLUDED.price_per_bottle,
  contact_person = EXCLUDED.contact_person,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify customer import
SELECT 'Customers' as table_name, COUNT(*) as imported_count FROM customers;

-- ==============================================
-- STEP 5: IMPORT ORDERS
-- ==============================================
-- Replace the sample data below with your actual order data

INSERT INTO orders (
  client, branch, sku, number_of_cases, tentative_delivery_date, status
)
VALUES 
  ('Benguluru Bhavan', 'Gachibowli', 'P 500 ML', 20, '2024-02-01', 'pending'),
  ('Benguluru Bhavan', 'Kondapur', 'P 1000 ML', 15, '2024-02-05', 'dispatched'),
  ('Biryanis and more', 'Kukatpally', 'P 500 ML', 10, '2024-02-10', 'pending')
  -- Add more orders here
ON CONFLICT DO NOTHING;

-- Verify orders import
SELECT 'Orders' as table_name, COUNT(*) as imported_count FROM orders;

-- ==============================================
-- STEP 6: IMPORT SALES TRANSACTIONS
-- ==============================================
-- Replace the sample data below with your actual sales transaction data
-- IMPORTANT: This requires customer_id (UUID), so we need to look it up

INSERT INTO sales_transactions (
  customer_id, transaction_type, amount, quantity, sku, description, transaction_date
)
SELECT 
  c.id as customer_id,
  'sale'::TEXT as transaction_type,
  12000.00 as amount,
  10 as quantity,
  'P 500 ML' as sku,
  'Sale of 10 cases' as description,
  '2024-01-15'::DATE as transaction_date
FROM customers c
WHERE c.client_name = 'Benguluru Bhavan' AND c.branch = 'Gachibowli'

UNION ALL

SELECT 
  c.id,
  'payment'::TEXT,
  5000.00,
  NULL,
  NULL,
  'Payment received',
  '2024-01-20'::DATE
FROM customers c
WHERE c.client_name = 'Benguluru Bhavan' AND c.branch = 'Gachibowli'
  -- Add more transactions here using UNION ALL
;

-- Verify sales transactions import
SELECT 'Sales Transactions' as table_name, COUNT(*) as imported_count FROM sales_transactions;

-- ==============================================
-- STEP 7: IMPORT FACTORY PAYABLES
-- ==============================================
-- Replace the sample data below with your actual factory payable data

INSERT INTO factory_payables (
  transaction_type, amount, quantity, description, transaction_date
)
VALUES 
  ('production', 50000.00, 50, 'Production of 50 cases', '2024-01-10'),
  ('payment', 30000.00, NULL, 'Payment to factory', '2024-01-25'),
  ('production', 30000.00, 30, 'Production of 30 cases', '2024-01-20')
  -- Add more factory payables here
ON CONFLICT DO NOTHING;

-- Verify factory payables import
SELECT 'Factory Payables' as table_name, COUNT(*) as imported_count FROM factory_payables;

-- ==============================================
-- STEP 8: IMPORT TRANSPORT EXPENSES
-- ==============================================
-- Replace the sample data below with your actual transport expense data

INSERT INTO transport_expenses (
  expense_group, amount, description, transaction_date
)
VALUES 
  ('Fuel', 5000.00, 'Fuel expenses for January', '2024-01-15'),
  ('Maintenance', 2000.00, 'Vehicle maintenance', '2024-01-20'),
  ('Fuel', 3000.00, 'Fuel expenses for February', '2024-02-10')
  -- Add more transport expenses here
ON CONFLICT DO NOTHING;

-- Verify transport expenses import
SELECT 'Transport Expenses' as table_name, COUNT(*) as imported_count FROM transport_expenses;

-- ==============================================
-- STEP 9: IMPORT LABEL PURCHASES
-- ==============================================
-- Replace the sample data below with your actual label purchase data

INSERT INTO label_purchases (
  client_name, sku, vendor, quantity, price_per_label, total_amount, purchase_date
)
VALUES 
  ('Benguluru Bhavan', 'P 500 ML', 'ABC Labels', 1000, 0.50, 500.00, '2024-01-10'),
  ('Benguluru Bhavan', 'P 1000 ML', 'XYZ Printing', 500, 0.75, 375.00, '2024-01-15')
  -- Add more label purchases here
ON CONFLICT DO NOTHING;

-- Verify label purchases import
SELECT 'Label Purchases' as table_name, COUNT(*) as imported_count FROM label_purchases;

-- ==============================================
-- STEP 10: IMPORT LABEL PAYMENTS
-- ==============================================
-- Replace the sample data below with your actual label payment data

INSERT INTO label_payments (
  vendor, payment_amount, payment_date, payment_method
)
VALUES 
  ('ABC Labels', 500.00, '2024-01-15', 'Bank Transfer'),
  ('XYZ Printing', 375.00, '2024-01-20', 'UPI'),
  ('ABC Labels', 250.00, '2024-02-01', 'Cash')
  -- Add more label payments here
ON CONFLICT DO NOTHING;

-- Verify label payments import
SELECT 'Label Payments' as table_name, COUNT(*) as imported_count FROM label_payments;

-- ==============================================
-- FINAL VERIFICATION
-- ==============================================
-- Run this query to see counts for all imported tables

SELECT 'sku_configurations' as table_name, COUNT(*) as row_count FROM sku_configurations
UNION ALL
SELECT 'label_vendors', COUNT(*) FROM label_vendors
UNION ALL
SELECT 'factory_pricing', COUNT(*) FROM factory_pricing
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL
SELECT 'factory_payables', COUNT(*) FROM factory_payables
UNION ALL
SELECT 'transport_expenses', COUNT(*) FROM transport_expenses
UNION ALL
SELECT 'label_purchases', COUNT(*) FROM label_purchases
UNION ALL
SELECT 'label_payments', COUNT(*) FROM label_payments
ORDER BY table_name;

-- Check for orphaned records (should return 0)
SELECT 
  'Orphaned Sales Transactions' as check_name,
  COUNT(*) as count
FROM sales_transactions s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE c.id IS NULL;

-- ==============================================
-- IMPORT COMPLETE!
-- ==============================================
SELECT 'Legacy data import completed successfully!' as message;
