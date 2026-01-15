# Legacy Data Migration Guide

This guide will help you migrate your legacy data into the Aamodha Operations Portal database.

## Table of Contents
1. [Migration Strategy](#migration-strategy)
2. [Data Mapping](#data-mapping)
3. [Migration Order](#migration-order)
4. [Import Methods](#import-methods)
5. [Validation & Verification](#validation--verification)
6. [Troubleshooting](#troubleshooting)

---

## Migration Strategy

### Recommended Approach

1. **Phase 1: Master Data** (No dependencies)
   - SKU Configurations
   - Label Vendors
   - Factory Pricing

2. **Phase 2: Reference Data** (Dependencies on Phase 1)
   - Customers
   - Users/Profiles

3. **Phase 3: Transactional Data** (Dependencies on Phase 2)
   - Orders
   - Sales Transactions
   - Factory Payables
   - Transport Expenses
   - Label Purchases
   - Label Payments

### Data Preparation Steps

1. **Export Legacy Data**
   - Export data from your legacy system (Excel, CSV, Database, etc.)
   - Clean and normalize the data
   - Map fields to new schema

2. **Data Validation**
   - Check for duplicates
   - Validate required fields
   - Ensure data types match
   - Verify relationships

3. **Import Data**
   - Use SQL scripts for bulk imports
   - Use CSV import for smaller datasets
   - Use application UI for manual entry

---

## Data Mapping

### 1. SKU Configurations (`sku_configurations`)

**Required Fields:**
- `sku` (TEXT, UNIQUE) - Product SKU code
- `bottles_per_case` (INTEGER) - Number of bottles per case

**Example Legacy Data Format:**
```csv
SKU,Bottles Per Case
P 500 ML,20
P 1000 ML,12
P 250 ML,24
```

**SQL Import Template:**
```sql
INSERT INTO sku_configurations (sku, bottles_per_case)
VALUES 
  ('P 500 ML', 20),
  ('P 1000 ML', 12),
  ('P 250 ML', 24)
ON CONFLICT (sku) DO UPDATE 
SET bottles_per_case = EXCLUDED.bottles_per_case;
```

---

### 2. Customers (`customers`)

**Required Fields:**
- `client_name` (TEXT) - Client/Company name
- `branch` (TEXT) - Branch name (can be NULL)
- `sku` (TEXT) - Product SKU (optional)
- `price_per_case` (DECIMAL) - Price per case (optional)
- `price_per_bottle` (DECIMAL) - Price per bottle (optional)

**Optional Fields:**
- `contact_person` (TEXT)
- `phone` (TEXT)
- `email` (TEXT)
- `address` (TEXT)
- `is_active` (BOOLEAN, default: true)

**Unique Constraint:** `(client_name, branch)`

**Example Legacy Data Format:**
```csv
Client Name,Branch,SKU,Price Per Case,Price Per Bottle,Contact Person,Phone,Email,Address
Benguluru Bhavan,Gachibowli,P 500 ML,1200.00,60.00,John Doe,1234567890,john@example.com,123 Main St
Benguluru Bhavan,Kondapur,P 1000 ML,1800.00,150.00,Jane Doe,0987654321,jane@example.com,456 Oak Ave
```

**SQL Import Template:**
```sql
INSERT INTO customers (
  client_name, branch, sku, price_per_case, price_per_bottle,
  contact_person, phone, email, address, is_active
)
VALUES 
  ('Benguluru Bhavan', 'Gachibowli', 'P 500 ML', 1200.00, 60.00, 
   'John Doe', '1234567890', 'john@example.com', '123 Main St', true),
  ('Benguluru Bhavan', 'Kondapur', 'P 1000 ML', 1800.00, 150.00,
   'Jane Doe', '0987654321', 'jane@example.com', '456 Oak Ave', true)
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
```

---

### 3. Factory Pricing (`factory_pricing`)

**Required Fields:**
- `sku` (TEXT) - Product SKU
- `price_per_case` (DECIMAL) - Factory price per case
- `pricing_date` (DATE) - Date of pricing (default: CURRENT_DATE)

**Example Legacy Data Format:**
```csv
SKU,Price Per Case,Pricing Date
P 500 ML,1000.00,2024-01-01
P 1000 ML,1500.00,2024-01-01
P 250 ML,700.00,2024-01-01
```

**SQL Import Template:**
```sql
INSERT INTO factory_pricing (sku, price_per_case, pricing_date)
VALUES 
  ('P 500 ML', 1000.00, '2024-01-01'),
  ('P 1000 ML', 1500.00, '2024-01-01'),
  ('P 250 ML', 700.00, '2024-01-01');
```

---

### 4. Sales Transactions (`sales_transactions`)

**Required Fields:**
- `customer_id` (UUID) - Reference to customers table
- `transaction_type` (TEXT) - Must be 'sale' or 'payment'
- `amount` (DECIMAL) - Transaction amount
- `transaction_date` (DATE) - Transaction date

**Optional Fields:**
- `quantity` (INTEGER)
- `sku` (TEXT)
- `description` (TEXT)

**Important:** You must first import customers to get their UUIDs!

**Example Legacy Data Format:**
```csv
Client Name,Branch,Transaction Type,Amount,Quantity,SKU,Description,Transaction Date
Benguluru Bhavan,Gachibowli,sale,12000.00,10,P 500 ML,Sale of 10 cases,2024-01-15
Benguluru Bhavan,Gachibowli,payment,5000.00,,,Payment received,2024-01-20
```

**SQL Import Template (with customer lookup):**
```sql
-- First, get customer IDs
WITH customer_lookup AS (
  SELECT id, client_name, branch 
  FROM customers
)
INSERT INTO sales_transactions (
  customer_id, transaction_type, amount, quantity, sku, description, transaction_date
)
SELECT 
  c.id,
  'sale'::TEXT,
  12000.00,
  10,
  'P 500 ML',
  'Sale of 10 cases',
  '2024-01-15'::DATE
FROM customer_lookup c
WHERE c.client_name = 'Benguluru Bhavan' AND c.branch = 'Gachibowli';
```

---

### 5. Orders (`orders`)

**Required Fields:**
- `client` (TEXT) - Client name
- `branch` (TEXT) - Branch name
- `sku` (TEXT) - Product SKU
- `number_of_cases` (INTEGER) - Number of cases
- `tentative_delivery_date` (DATE) - Delivery date
- `status` (TEXT) - 'pending', 'dispatched', or 'cancelled' (default: 'pending')

**Example Legacy Data Format:**
```csv
Client,Branch,SKU,Number of Cases,Tentative Delivery Date,Status
Benguluru Bhavan,Gachibowli,P 500 ML,20,2024-02-01,pending
Benguluru Bhavan,Kondapur,P 1000 ML,15,2024-02-05,dispatched
```

**SQL Import Template:**
```sql
INSERT INTO orders (
  client, branch, sku, number_of_cases, tentative_delivery_date, status
)
VALUES 
  ('Benguluru Bhavan', 'Gachibowli', 'P 500 ML', 20, '2024-02-01', 'pending'),
  ('Benguluru Bhavan', 'Kondapur', 'P 1000 ML', 15, '2024-02-05', 'dispatched');
```

---

### 6. Factory Payables (`factory_payables`)

**Required Fields:**
- `transaction_type` (TEXT) - 'production' or 'payment'
- `amount` (DECIMAL) - Transaction amount
- `transaction_date` (DATE) - Transaction date

**Optional Fields:**
- `quantity` (INTEGER)
- `description` (TEXT)

**Example Legacy Data Format:**
```csv
Transaction Type,Amount,Quantity,Description,Transaction Date
production,50000.00,50,Production of 50 cases,2024-01-10
payment,30000.00,,Payment to factory,2024-01-25
```

**SQL Import Template:**
```sql
INSERT INTO factory_payables (
  transaction_type, amount, quantity, description, transaction_date
)
VALUES 
  ('production', 50000.00, 50, 'Production of 50 cases', '2024-01-10'),
  ('payment', 30000.00, NULL, 'Payment to factory', '2024-01-25');
```

---

### 7. Transport Expenses (`transport_expenses`)

**Required Fields:**
- `expense_group` (TEXT) - Expense category/group
- `amount` (DECIMAL) - Expense amount
- `transaction_date` (DATE) - Expense date

**Optional Fields:**
- `description` (TEXT)

**Example Legacy Data Format:**
```csv
Expense Group,Amount,Description,Transaction Date
Fuel,5000.00,Fuel expenses for January,2024-01-15
Maintenance,2000.00,Vehicle maintenance,2024-01-20
```

**SQL Import Template:**
```sql
INSERT INTO transport_expenses (
  expense_group, amount, description, transaction_date
)
VALUES 
  ('Fuel', 5000.00, 'Fuel expenses for January', '2024-01-15'),
  ('Maintenance', 2000.00, 'Vehicle maintenance', '2024-01-20');
```

---

### 8. Label Vendors (`label_vendors`)

**Required Fields:**
- `vendor_name` (TEXT) - Vendor name

**Optional Fields:**
- `label_type` (TEXT)
- `price_per_label` (DECIMAL)

**Example Legacy Data Format:**
```csv
Vendor Name,Label Type,Price Per Label
ABC Labels,Standard,0.50
XYZ Printing,Premium,0.75
```

**SQL Import Template:**
```sql
INSERT INTO label_vendors (vendor_name, label_type, price_per_label)
VALUES 
  ('ABC Labels', 'Standard', 0.50),
  ('XYZ Printing', 'Premium', 0.75);
```

---

### 9. Label Purchases (`label_purchases`)

**Required Fields:**
- `client_name` (TEXT) - Client name
- `sku` (TEXT) - Product SKU
- `vendor` (TEXT) - Vendor name
- `quantity` (INTEGER) - Number of labels
- `price_per_label` (DECIMAL) - Price per label
- `total_amount` (DECIMAL) - Total amount
- `purchase_date` (DATE) - Purchase date

**Example Legacy Data Format:**
```csv
Client Name,SKU,Vendor,Quantity,Price Per Label,Total Amount,Purchase Date
Benguluru Bhavan,P 500 ML,ABC Labels,1000,0.50,500.00,2024-01-10
```

**SQL Import Template:**
```sql
INSERT INTO label_purchases (
  client_name, sku, vendor, quantity, price_per_label, total_amount, purchase_date
)
VALUES 
  ('Benguluru Bhavan', 'P 500 ML', 'ABC Labels', 1000, 0.50, 500.00, '2024-01-10');
```

---

### 10. Label Payments (`label_payments`)

**Required Fields:**
- `vendor` (TEXT) - Vendor name
- `payment_amount` (DECIMAL) - Payment amount
- `payment_date` (DATE) - Payment date
- `payment_method` (TEXT) - 'Cash', 'Bank Transfer', or 'UPI'

**Example Legacy Data Format:**
```csv
Vendor,Payment Amount,Payment Date,Payment Method
ABC Labels,500.00,2024-01-15,Bank Transfer
XYZ Printing,750.00,2024-01-20,UPI
```

**SQL Import Template:**
```sql
INSERT INTO label_payments (
  vendor, payment_amount, payment_date, payment_method
)
VALUES 
  ('ABC Labels', 500.00, '2024-01-15', 'Bank Transfer'),
  ('XYZ Printing', 750.00, '2024-01-20', 'UPI');
```

---

## Migration Order

Execute imports in this order to respect foreign key constraints:

### Step 1: Master Data (No Dependencies)
```sql
-- 1.1 SKU Configurations
-- 1.2 Label Vendors
-- 1.3 Factory Pricing
```

### Step 2: Reference Data
```sql
-- 2.1 Customers (depends on SKU Configurations for validation)
-- 2.2 Users/Profiles (if migrating user data)
```

### Step 3: Transactional Data
```sql
-- 3.1 Orders (depends on Customers)
-- 3.2 Sales Transactions (depends on Customers)
-- 3.3 Factory Payables
-- 3.4 Transport Expenses
-- 3.5 Label Purchases (depends on Label Vendors)
-- 3.6 Label Payments (depends on Label Vendors)
```

---

## Import Methods

### Method 1: SQL Scripts (Recommended for Large Datasets)

1. Prepare your data in CSV format
2. Convert CSV to SQL INSERT statements using the templates above
3. Run SQL scripts in Supabase SQL Editor or via CLI

**Advantages:**
- Fast for large datasets
- Can be version controlled
- Easy to rerun if needed

### Method 2: CSV Import via Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Select the table
3. Click "Insert" → "Import data from CSV"
4. Upload your CSV file

**Advantages:**
- User-friendly interface
- Good for small to medium datasets
- Visual feedback

### Method 3: Application UI (For Manual Entry)

1. Use the application's UI forms
2. Enter data manually or in small batches

**Advantages:**
- Validates data through application logic
- Good for small amounts of data
- Can catch errors immediately

### Method 4: Python/Node.js Script (For Complex Transformations)

Use the provided migration scripts in `sql/migrations/` folder for programmatic imports.

---

## Validation & Verification

### Pre-Migration Validation

Run these queries to check your data before migration:

```sql
-- Check for duplicate SKUs
SELECT sku, COUNT(*) 
FROM (your_legacy_sku_data) 
GROUP BY sku 
HAVING COUNT(*) > 1;

-- Check for duplicate customers
SELECT client_name, branch, COUNT(*) 
FROM (your_legacy_customer_data) 
GROUP BY client_name, branch 
HAVING COUNT(*) > 1;

-- Validate transaction types
SELECT DISTINCT transaction_type 
FROM (your_legacy_transaction_data)
WHERE transaction_type NOT IN ('sale', 'payment');
```

### Post-Migration Verification

Run these queries after migration:

```sql
-- Count records in each table
SELECT 'sku_configurations' as table_name, COUNT(*) as row_count FROM sku_configurations
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'factory_payables', COUNT(*) FROM factory_payables
UNION ALL
SELECT 'transport_expenses', COUNT(*) FROM transport_expenses
UNION ALL
SELECT 'label_vendors', COUNT(*) FROM label_vendors
UNION ALL
SELECT 'label_purchases', COUNT(*) FROM label_purchases
UNION ALL
SELECT 'label_payments', COUNT(*) FROM label_payments
UNION ALL
SELECT 'factory_pricing', COUNT(*) FROM factory_pricing;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_sales_transactions
FROM sales_transactions s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE c.id IS NULL;

-- Verify data integrity
SELECT 
  'customers' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT client_name || '-' || COALESCE(branch, '')) as unique_customers
FROM customers;
```

---

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - **Error:** `violates foreign key constraint`
   - **Solution:** Ensure parent records exist before inserting child records

2. **Unique Constraint Violations**
   - **Error:** `duplicate key value violates unique constraint`
   - **Solution:** Use `ON CONFLICT DO UPDATE` or remove duplicates from source data

3. **Data Type Mismatches**
   - **Error:** `invalid input syntax for type`
   - **Solution:** Validate and convert data types before import

4. **Missing Required Fields**
   - **Error:** `null value in column violates not-null constraint`
   - **Solution:** Fill in required fields or provide default values

5. **Date Format Issues**
   - **Error:** `invalid input syntax for type date`
   - **Solution:** Ensure dates are in YYYY-MM-DD format

### Getting Help

If you encounter issues:
1. Check the error message carefully
2. Verify your data matches the schema
3. Review the validation queries above
4. Check the migration order
5. Consult the SQL templates provided

---

## Next Steps

1. **Prepare Your Data**
   - Export from legacy system
   - Clean and normalize
   - Map to new schema

2. **Start with Master Data**
   - Import SKU configurations
   - Import label vendors
   - Import factory pricing

3. **Import Reference Data**
   - Import customers
   - Set up users/profiles

4. **Import Transactional Data**
   - Import in the order specified
   - Validate after each step

5. **Verify Everything**
   - Run validation queries
   - Check data integrity
   - Test application functionality

---

## Additional Resources

- See `sql/migrations/` for example migration scripts
- See `sql/utilities/` for helper scripts
- Check `docs/` for additional documentation

Good luck with your migration! 🚀
