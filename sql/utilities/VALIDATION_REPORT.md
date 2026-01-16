# SQL Validation Report: INSERT_CUSTOMERS_FROM_PRICING_DATA.sql

## ✅ Syntax Validation

### 1. CTE Syntax
- **Status**: ✅ VALID
- **Check**: `WITH pricing_data AS (...), distinct_customers AS (...)`
- **Result**: Correct PostgreSQL CTE syntax

### 2. VALUES Clause
- **Status**: ✅ VALID
- **Check**: All VALUES tuples have 4 columns matching the CTE structure
- **Result**: Syntax is correct

### 3. DISTINCT ON
- **Status**: ✅ VALID
- **Check**: `SELECT DISTINCT ON (client_name, branch) ... ORDER BY client_name, branch, sku`
- **Result**: Correct syntax. Will keep first SKU alphabetically for each client-branch combination

### 4. INSERT ... SELECT
- **Status**: ✅ VALID
- **Check**: `INSERT INTO customers (...) SELECT ... FROM distinct_customers`
- **Result**: Correct syntax

### 5. ON CONFLICT
- **Status**: ✅ VALID
- **Check**: `ON CONFLICT (client_name, branch) DO UPDATE SET ...`
- **Result**: Correct syntax, matches UNIQUE constraint

## ✅ Schema Compatibility

### Table Structure Match
| Column | Expected Type | Provided Type | Status |
|--------|--------------|---------------|--------|
| client_name | TEXT NOT NULL | TEXT | ✅ |
| branch | TEXT | TEXT | ✅ |
| sku | TEXT | TEXT | ✅ |
| price_per_bottle | DECIMAL(10,2) | DECIMAL | ✅ |
| is_active | BOOLEAN | BOOLEAN | ✅ |

### Unique Constraint
- **Expected**: `UNIQUE(client_name, branch)` (from schema)
- **ON CONFLICT clause**: `ON CONFLICT (client_name, branch)`
- **Status**: ✅ MATCHES

## ⚠️ Data Quality Issues

### 1. Decimal Precision Rounding
**Issue**: Some prices were rounded from original values:
- Original: `5.714285714` → Used: `5.71` ✅ (acceptable for DECIMAL(10,2))
- Original: `4.285714286` → Used: `4.29` ✅ (acceptable for DECIMAL(10,2))
- Original: `7.666666667` → Used: `7.67` ✅ (acceptable for DECIMAL(10,2))

**Impact**: Minimal - values fit within DECIMAL(10,2) precision
**Status**: ✅ ACCEPTABLE

### 2. Duplicate Client-Branch Combinations
**Issue**: Multiple SKUs for same client-branch:
- `Jubile Festa inn` + `Jubilee Hills`: 2 SKUs (500 P, 250 EC)
- `Deccan kitchen` + `Film nagar`: 2 SKUs (750 P, 250 EC)
- `Mid land` + `Telangana`: 2 SKUs (1000 P, 750 AL)
- `Alley 91` + `Nanakramguda`: 3 SKUs (500 P, 250 EC, 250 P)
- `jagan Pan House` + `Bhoodan Pochampally`: 2 SKUs (500 P, 1000 P)
- `Tawalogy` + `Gandipet`: 2 SKUs (1000 P, 250 EC)
- `Intercity` + `Bachupally`: 2 entries with same SKU but different prices (5.50, 5.90)

**Impact**: 
- DISTINCT ON will keep only the first SKU alphabetically
- For `Intercity` + `Bachupally`, the later price (5.90) will overwrite the earlier one (5.50) via ON CONFLICT
- Other duplicate SKUs will be lost

**Status**: ⚠️ WARNING - Data loss for multiple SKUs per client-branch

### 3. Special Characters
**Issue**: Apostrophe in client name
- `Chaitanya's Modern Kitchen` → Correctly escaped as `'Chaitanya''s Modern Kitchen'`
- **Status**: ✅ CORRECT

## ✅ Logic Validation

### 1. Deduplication Logic
- **Method**: DISTINCT ON (client_name, branch) ORDER BY client_name, branch, sku
- **Result**: Keeps first SKU alphabetically for each client-branch
- **Status**: ✅ CORRECT (but see warning above)

### 2. Conflict Resolution
- **Method**: ON CONFLICT DO UPDATE
- **Behavior**: Updates existing records with new SKU and price
- **Status**: ✅ CORRECT

### 3. Data Flow
1. CTE `pricing_data` creates all rows from VALUES
2. CTE `distinct_customers` deduplicates by client-branch
3. INSERT selects from `distinct_customers`
4. ON CONFLICT handles existing records
- **Status**: ✅ CORRECT

## ⚠️ Potential Runtime Issues

### 1. Unique Constraint Mismatch
**Risk**: If the database has `UNIQUE(client_name, branch, sku)` instead of `UNIQUE(client_name, branch)`

**Check Required**: Run this query first:
```sql
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'customers'::regclass 
  AND contype = 'u';
```

**Impact**: 
- If constraint is `(client_name, branch, sku)`: ON CONFLICT clause needs to be updated
- Current SQL assumes `(client_name, branch)` only

**Status**: ⚠️ NEEDS VERIFICATION

### 2. NULL Branch Values
**Risk**: Some branches might be NULL in the data
- **Check**: All branches in the data appear to have values
- **Status**: ✅ NO ISSUES FOUND

## 📊 Expected Results

### Records to be Inserted
- **Total rows in source data**: 60
- **Unique client-branch combinations**: ~50-55 (after deduplication)
- **Clients with multiple SKUs**: 7 combinations will lose additional SKUs

### Verification Queries
The script includes verification queries that will:
1. Count total customers
2. Count unique clients
3. Count unique branches
4. Show summary by client

## ✅ Final Validation Status

### Overall Status: ✅ VALID WITH WARNINGS

### Issues Summary:
1. ✅ **Syntax**: All valid
2. ✅ **Schema**: Compatible
3. ⚠️ **Data Loss**: Multiple SKUs per client-branch will be lost (expected behavior)
4. ⚠️ **Constraint**: Needs verification of actual unique constraint in database

### Recommendations:
1. ✅ **Run validation script first**: Execute `VALIDATE_CUSTOMER_INSERT.sql` to check constraint
2. ⚠️ **Review duplicate SKUs**: Manually review which SKU should be kept for each client-branch
3. ✅ **Backup before execution**: Always backup the customers table before running
4. ✅ **Test in staging**: Test the script in a staging environment first

## 🔧 Suggested Improvements

### Option 1: Keep Most Recent SKU (by date)
If you want to keep the most recent SKU based on the date in the original data:
```sql
ORDER BY 
  CASE 
    WHEN client_name = 'Intercity' AND branch = 'Bachupally' AND price_per_bottle = 5.90 THEN 1
    WHEN client_name = 'Alley 91' AND branch = 'Nanakramguda' AND sku = '250 P' THEN 1
    ELSE 2
  END,
  client_name, branch, sku
```

### Option 2: Keep Most Common SKU
If you want to keep the SKU that appears most frequently:
```sql
-- Would require additional CTE to count frequencies
```

### Option 3: Insert All SKUs (if constraint allows)
If the unique constraint is `(client_name, branch, sku)`, remove DISTINCT ON and insert all rows.
