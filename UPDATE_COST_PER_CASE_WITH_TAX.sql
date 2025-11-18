-- ==============================================
-- UPDATE COST_PER_CASE CALCULATION TO INCLUDE TAX
-- Formula: (price_per_bottle * bottles_per_case) * (1 + tax/100)
-- ==============================================

-- Step 1: Drop the existing generated column
ALTER TABLE public.factory_pricing
  DROP COLUMN IF EXISTS cost_per_case;

-- Step 2: Recreate with tax included in the calculation
-- If tax is NULL or 0, it will just be price_per_bottle * bottles_per_case
ALTER TABLE public.factory_pricing
  ADD COLUMN cost_per_case NUMERIC(10,2) 
  GENERATED ALWAYS AS (
    (price_per_bottle * bottles_per_case) * 
    (1 + COALESCE(tax, 0) / 100)
  ) STORED;

-- Step 3: Verify the calculation
SELECT 
    sku,
    bottles_per_case,
    price_per_bottle,
    tax,
    cost_per_case,
    -- Manual calculation for verification
    (price_per_bottle * bottles_per_case) * (1 + COALESCE(tax, 0) / 100) as manual_calculation
FROM public.factory_pricing
LIMIT 5;

