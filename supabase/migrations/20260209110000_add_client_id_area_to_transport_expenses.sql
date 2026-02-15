-- Add client_id and area to transport_expenses if missing
-- These columns link transport expenses to dealers and enable dealer/area display

-- Add client_id (references customers for dealer lookup)
ALTER TABLE transport_expenses
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Add area (dealer's area - can be set from customer or manually)
ALTER TABLE transport_expenses
ADD COLUMN IF NOT EXISTS area TEXT;

-- Index for filtering by client
CREATE INDEX IF NOT EXISTS idx_transport_expenses_client_id 
  ON transport_expenses(client_id) 
  WHERE client_id IS NOT NULL;

-- Index for filtering by area
CREATE INDEX IF NOT EXISTS idx_transport_expenses_area 
  ON transport_expenses(area) 
  WHERE area IS NOT NULL;
