-- ==============================================
-- IMPORT FACTORY PRICING DATA (WITH UPDATE ON CONFLICT)
-- This script imports factory pricing configurations
-- Updates existing records if they already exist
-- Based on the data provided with dates 3/1/2025 and 10/1/2025
-- ==============================================

-- Note: This assumes a unique constraint on (sku, pricing_date)
-- If your table doesn't have this constraint, you may need to add it first:
-- ALTER TABLE factory_pricing ADD CONSTRAINT factory_pricing_sku_date_unique 
--   UNIQUE (sku, pricing_date);

-- ==============================================
-- Import data for 3/1/2025 (Tax: 18%)
-- ==============================================

INSERT INTO factory_pricing (
  sku, 
  price_per_bottle, 
  bottles_per_case, 
  pricing_date, 
  tax
)
VALUES 
  -- Data for 3/1/2025 (Tax: 18%)
  ('1000 P', 8.05, 12, '2025-03-01', 18),
  ('500 P', 5.2, 20, '2025-03-01', 18),
  ('750 P', 7.0, 12, '2025-03-01', 18),
  ('250 P', 3.6, 30, '2025-03-01', 18),
  ('750 AL', 7.0, 12, '2025-03-01', 18),
  ('500 AL', 5.2, 12, '2025-03-01', 18),
  ('1000 EC', 7.5, 12, '2025-03-01', 18),
  ('500 EC', 4.8, 20, '2025-03-01', 18),
  ('250 EC', 3.6, 35, '2025-03-01', 18),
  
  -- Data for 10/1/2025 (Tax: 5%)
  ('1000 P', 8.05, 12, '2025-10-01', 5),
  ('500 P', 5.2, 20, '2025-10-01', 5),
  ('750 P', 7.0, 12, '2025-10-01', 5),
  ('250 P', 3.6, 30, '2025-10-01', 5),
  ('750 AL', 7.0, 12, '2025-10-01', 5),
  ('500 AL', 5.2, 12, '2025-10-01', 5),
  ('1000 EC', 7.5, 12, '2025-10-01', 5),
  ('500 EC', 4.2, 20, '2025-10-01', 5),  -- Note: Price changed from 4.8 to 4.2
  ('250 EC', 3.4, 35, '2025-10-01', 5)   -- Note: Price changed from 3.6 to 3.4
ON CONFLICT (sku, pricing_date) DO UPDATE SET
  price_per_bottle = EXCLUDED.price_per_bottle,
  bottles_per_case = EXCLUDED.bottles_per_case,
  tax = EXCLUDED.tax,
  updated_at = NOW();

-- ==============================================
-- Alternative: If you don't have unique constraint,
-- use this approach to delete and re-insert
-- ==============================================

-- Uncomment below if you want to replace existing data for these dates:
/*
-- Delete existing records for these dates first
DELETE FROM factory_pricing 
WHERE pricing_date IN ('2025-03-01', '2025-10-01');

-- Then run the INSERT statement above without ON CONFLICT
*/

-- ==============================================
-- Verify the import
-- ==============================================

-- Count records by date
SELECT 
  pricing_date,
  tax,
  COUNT(*) as record_count
FROM factory_pricing
WHERE pricing_date IN ('2025-03-01', '2025-10-01')
GROUP BY pricing_date, tax
ORDER BY pricing_date;

-- Show all imported records
SELECT 
  pricing_date,
  sku,
  bottles_per_case,
  price_per_bottle,
  tax,
  cost_per_case  -- This is auto-calculated (price_per_bottle * bottles_per_case)
FROM factory_pricing
WHERE pricing_date IN ('2025-03-01', '2025-10-01')
ORDER BY pricing_date, sku;

-- ==============================================
-- Summary
-- ==============================================

SELECT 
  'Factory Pricing Import Complete!' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT sku) as unique_skus,
  COUNT(DISTINCT pricing_date) as unique_dates
FROM factory_pricing
WHERE pricing_date IN ('2025-03-01', '2025-10-01');
