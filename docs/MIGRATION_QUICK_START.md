# Migration Quick Start Checklist

Use this checklist to quickly migrate your legacy data.

## Pre-Migration Checklist

- [ ] **Backup your legacy data**
  - Export all data from legacy system
  - Save backups in multiple locations
  - Document data sources

- [ ] **Review database schema**
  - Understand table structures
  - Note required vs optional fields
  - Identify relationships and dependencies

- [ ] **Prepare your data**
  - Clean and normalize CSV/Excel files
  - Remove duplicates
  - Standardize formats (dates, numbers, etc.)
  - Map legacy fields to new schema

- [ ] **Test environment ready**
  - Database is cleared (if needed)
  - Access to Supabase SQL Editor
  - Python installed (for CSV converter, optional)

## Migration Steps

### Phase 1: Master Data (No Dependencies)

- [ ] **Import SKU Configurations**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 1
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM sku_configurations;`

- [ ] **Import Label Vendors**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 2
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM label_vendors;`

- [ ] **Import Factory Pricing**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 3
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM factory_pricing;`

### Phase 2: Reference Data

- [ ] **Import Customers**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 4
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM customers;`
  - [ ] Check for duplicates: Run validation script

- [ ] **Set up Users/Profiles** (if migrating user data)
  - [ ] Create user accounts in Supabase Auth
  - [ ] Import user profiles
  - [ ] Set up user_management records

### Phase 3: Transactional Data

- [ ] **Import Orders**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 5
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM orders;`

- [ ] **Import Sales Transactions**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 6
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM sales_transactions;`
  - [ ] Check for orphaned records

- [ ] **Import Factory Payables**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 7
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM factory_payables;`

- [ ] **Import Transport Expenses**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 8
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM transport_expenses;`

- [ ] **Import Label Purchases**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 9
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM label_purchases;`

- [ ] **Import Label Payments**
  ```sql
  -- Use: sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql
  -- Section: STEP 10
  ```
  - [ ] Verify: `SELECT COUNT(*) FROM label_payments;`

## Post-Migration Validation

- [ ] **Run validation script**
  ```sql
  -- Use: sql/utilities/VALIDATE_MIGRATED_DATA.sql
  ```
  - [ ] Review all validation results
  - [ ] Fix any FAIL items
  - [ ] Review WARNING items

- [ ] **Manual verification**
  - [ ] Spot check random records
  - [ ] Verify calculations (totals, amounts)
  - [ ] Check date ranges
  - [ ] Verify relationships

- [ ] **Test application**
  - [ ] Login and navigate
  - [ ] View imported data in UI
  - [ ] Test key features
  - [ ] Verify reports/dashboards

## Common Issues & Quick Fixes

### Issue: Foreign Key Violations
**Fix:** Ensure parent records exist before importing child records

### Issue: Duplicate Key Errors
**Fix:** Use `ON CONFLICT DO UPDATE` or remove duplicates

### Issue: Date Format Errors
**Fix:** Ensure dates are in YYYY-MM-DD format

### Issue: Missing Required Fields
**Fix:** Fill in required fields or provide defaults

## Tools & Resources

- **Migration Guide:** `docs/LEGACY_DATA_MIGRATION_GUIDE.md`
- **SQL Template:** `sql/migrations/LEGACY_DATA_IMPORT_TEMPLATE.sql`
- **Validation Script:** `sql/utilities/VALIDATE_MIGRATED_DATA.sql`
- **CSV Converter:** `sql/utilities/csv_to_sql.py`
- **CSV Converter Guide:** `sql/utilities/CSV_TO_SQL_CONVERTER.md`

## Getting Help

If you encounter issues:
1. Check error messages carefully
2. Review the migration guide
3. Run validation queries
4. Check data formats and types
5. Verify migration order

## Success Criteria

Your migration is successful when:
- ✅ All tables have expected row counts
- ✅ No orphaned records exist
- ✅ Data integrity checks pass
- ✅ Application functions correctly
- ✅ Reports show correct data
- ✅ Users can access their data

---

**Good luck with your migration!** 🚀
