-- Create production table for recording daily production by SKU
CREATE TABLE IF NOT EXISTS production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL,
  sku text NOT NULL,
  no_of_cases integer NOT NULL CHECK (no_of_cases > 0),
  created_at timestamptz DEFAULT now()
);

-- Index for efficient queries by date and SKU
CREATE INDEX IF NOT EXISTS idx_production_date ON production(production_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_sku ON production(sku);

-- Enable RLS
ALTER TABLE production ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (idempotent: drop if exists first)
DROP POLICY IF EXISTS "Allow all operations on production" ON production;
CREATE POLICY "Allow all operations on production"
  ON production FOR ALL
  USING (true)
  WITH CHECK (true);
