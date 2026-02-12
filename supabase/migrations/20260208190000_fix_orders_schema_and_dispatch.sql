-- Fix orders schema for compatibility with get_orders_sorted and create orders_dispatch
-- Handles orders tables from different migrations (quantity vs number_of_cases, date, etc.)

-- 1. Add missing columns to orders if they don't exist
DO $$
BEGIN
  -- Add date column if missing (used by get_orders_sorted)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'date') THEN
    ALTER TABLE orders ADD COLUMN date DATE;
    UPDATE orders SET date = created_at::date WHERE date IS NULL;
    ALTER TABLE orders ALTER COLUMN date SET DEFAULT (CURRENT_DATE);
    ALTER TABLE orders ALTER COLUMN date SET NOT NULL;
  END IF;

  -- Add number_of_cases if missing (copy from quantity)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'number_of_cases') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'quantity') THEN
      ALTER TABLE orders ADD COLUMN number_of_cases INTEGER;
      UPDATE orders SET number_of_cases = quantity WHERE number_of_cases IS NULL;
      ALTER TABLE orders ALTER COLUMN number_of_cases SET NOT NULL;
    ELSE
      ALTER TABLE orders ADD COLUMN number_of_cases INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;

-- 2. Create orders_dispatch table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders_dispatch (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  area TEXT NOT NULL,
  sku TEXT NOT NULL,
  cases INTEGER NOT NULL,
  delivery_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders_dispatch ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated (match orders policy)
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON orders_dispatch;
CREATE POLICY "Enable all operations for authenticated users" ON orders_dispatch
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. Recreate get_orders_sorted to use columns that exist
DROP FUNCTION IF EXISTS get_orders_sorted();

CREATE OR REPLACE FUNCTION get_orders_sorted()
RETURNS TABLE (
  id uuid,
  date date,
  client text,
  area text,
  sku text,
  number_of_cases integer,
  tentative_delivery_date date,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    COALESCE(o.date, o.created_at::date)::date,
    o.client,
    COALESCE(o.area, o.branch)::text,
    o.sku,
    COALESCE(o.number_of_cases, o.quantity)::integer,
    COALESCE(o.tentative_delivery_date, o.tentative_delivery_time)::date,
    COALESCE(o.status, 'pending')::text,
    o.created_at,
    o.updated_at
  FROM orders o
  ORDER BY
    CASE WHEN COALESCE(o.status, 'pending') = 'pending' THEN 0 ELSE 1 END,
    COALESCE(o.tentative_delivery_date, o.tentative_delivery_time) DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_orders_sorted() TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_sorted() TO anon;
