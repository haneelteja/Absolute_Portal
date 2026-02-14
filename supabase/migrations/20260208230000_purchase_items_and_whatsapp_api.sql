-- ==============================================
-- Purchase items config, material_purchases table
-- WhatsApp API key configurable in Application Configuration
-- ==============================================

-- 1. Add purchase_items config (item list for preforms, caps, shrink dropdown)
INSERT INTO invoice_configurations (config_key, config_value, config_type, description)
VALUES 
  ('purchase_items', '["Preforms", "Caps", "Shrink"]', 'string', 'Item list for Purchase page dropdown (preforms, caps, shrink)')
ON CONFLICT (config_key) DO NOTHING;

-- 2. Create material_purchases table for storing purchase records
CREATE TABLE IF NOT EXISTS material_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item VARCHAR(100) NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  cost_per_unit DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  vendor VARCHAR(255),
  description TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_item ON material_purchases(item);
CREATE INDEX IF NOT EXISTS idx_material_purchases_date ON material_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_material_purchases_vendor ON material_purchases(vendor);

-- Enable RLS
ALTER TABLE material_purchases ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read material_purchases"
  ON material_purchases FOR SELECT
  TO authenticated
  USING (true);

-- Allow managers to insert/update/delete
CREATE POLICY "Managers can manage material_purchases"
  ON material_purchases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_management
      WHERE user_management.user_id = auth.uid()
      AND user_management.role IN ('manager', 'admin')
      AND user_management.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_management
      WHERE user_management.user_id = auth.uid()
      AND user_management.role IN ('manager', 'admin')
      AND user_management.status = 'active'
    )
  );

-- 3. Set WhatsApp API key (insert if not exists, update if exists)
INSERT INTO invoice_configurations (config_key, config_value, config_type, description)
VALUES 
  ('whatsapp_api_key', '1OW8XOWd3ivnnWExSQfJ8bmct8SkXGITChq', 'string', '360Messenger WhatsApp API Key')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
