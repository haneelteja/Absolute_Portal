-- Add sku column to material_purchases for Preforms purchases
-- SKU is required when item = 'Preforms', populated from sku_configurations

ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS sku TEXT;

CREATE INDEX IF NOT EXISTS idx_material_purchases_sku ON material_purchases(sku) WHERE sku IS NOT NULL;
