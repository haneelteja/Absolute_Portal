-- Run this in Supabase SQL Editor to fix orders table schema
-- This ensures the orders table has the columns the app expects

-- 1. Add area if only branch exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'branch')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'area') THEN
    ALTER TABLE orders ADD COLUMN area TEXT;
    UPDATE orders SET area = branch WHERE area IS NULL;
    ALTER TABLE orders ALTER COLUMN area SET NOT NULL;
  END IF;
END $$;

-- 2. Add number_of_cases if only quantity exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'quantity')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'number_of_cases') THEN
    ALTER TABLE orders ADD COLUMN number_of_cases INTEGER;
    UPDATE orders SET number_of_cases = quantity WHERE number_of_cases IS NULL;
    ALTER TABLE orders ALTER COLUMN number_of_cases SET NOT NULL;
  END IF;
END $$;

-- 3. Add date if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'date') THEN
    ALTER TABLE orders ADD COLUMN date DATE DEFAULT CURRENT_DATE NOT NULL;
    UPDATE orders SET date = created_at::date WHERE date IS NULL;
  END IF;
END $$;

-- 4. Add tentative_delivery_date if only tentative_delivery_time exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_time')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN tentative_delivery_date DATE;
    UPDATE orders SET tentative_delivery_date = tentative_delivery_time WHERE tentative_delivery_date IS NULL;
    ALTER TABLE orders ALTER COLUMN tentative_delivery_date SET NOT NULL;
  END IF;
END $$;

-- 5. Recreate get_orders_sorted
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
