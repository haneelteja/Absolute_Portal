-- Allow multiple SKUs per dealer: change unique constraint from (dealer_name, area) to (dealer_name, area, sku)
-- Fixes 409 Conflict when adding dealer with multiple SKU pricing rows

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_dealer_name_area_key;

-- Multiple rows per dealer+area allowed when SKU differs (one row per dealer+area+sku)
ALTER TABLE customers ADD CONSTRAINT customers_dealer_name_area_sku_key 
  UNIQUE (dealer_name, area, sku);
