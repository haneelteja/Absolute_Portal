-- Fix orders schema and add insert_orders RPC
-- Run via: supabase db push  OR  copy to Supabase SQL Editor and run manually

-- 0. Create orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    CREATE TABLE orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      client TEXT NOT NULL,
      area TEXT NOT NULL,
      sku TEXT NOT NULL,
      number_of_cases INTEGER NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      tentative_delivery_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Enable all operations for authenticated users" ON orders FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 1. Add client if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'client') THEN
    ALTER TABLE orders ADD COLUMN client TEXT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'dealer_name') THEN
      UPDATE orders SET client = dealer_name WHERE client IS NULL;
    ELSE
      UPDATE orders SET client = '' WHERE client IS NULL;
    END IF;
    ALTER TABLE orders ALTER COLUMN client SET NOT NULL;
  END IF;
END $$;

-- 2. Add area if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'area') THEN
    ALTER TABLE orders ADD COLUMN area TEXT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'branch') THEN
      UPDATE orders SET area = branch WHERE area IS NULL;
    ELSE
      UPDATE orders SET area = '' WHERE area IS NULL;
    END IF;
    ALTER TABLE orders ALTER COLUMN area SET NOT NULL;
  END IF;
END $$;

-- 3. Add number_of_cases if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'number_of_cases') THEN
    ALTER TABLE orders ADD COLUMN number_of_cases INTEGER;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'quantity') THEN
      UPDATE orders SET number_of_cases = quantity WHERE number_of_cases IS NULL;
    ELSE
      UPDATE orders SET number_of_cases = 0 WHERE number_of_cases IS NULL;
    END IF;
    ALTER TABLE orders ALTER COLUMN number_of_cases SET NOT NULL;
  END IF;
END $$;

-- 4. Add date if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'date') THEN
    ALTER TABLE orders ADD COLUMN date DATE;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'created_at') THEN
      UPDATE orders SET date = COALESCE(created_at::date, CURRENT_DATE) WHERE date IS NULL;
    ELSE
      UPDATE orders SET date = CURRENT_DATE WHERE date IS NULL;
    END IF;
    ALTER TABLE orders ALTER COLUMN date SET NOT NULL;
    ALTER TABLE orders ALTER COLUMN date SET DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- 5a. Add sku if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'sku') THEN
    ALTER TABLE orders ADD COLUMN sku TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- 5b. Add status if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status') THEN
    ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- 5c. Add tentative_delivery_date if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN tentative_delivery_date DATE;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_time') THEN
      UPDATE orders SET tentative_delivery_date = tentative_delivery_time WHERE tentative_delivery_date IS NULL;
    ELSE
      UPDATE orders SET tentative_delivery_date = CURRENT_DATE WHERE tentative_delivery_date IS NULL;
    END IF;
    ALTER TABLE orders ALTER COLUMN tentative_delivery_date SET NOT NULL;
  END IF;
END $$;

-- 6. Create orders_dispatch if missing
CREATE TABLE IF NOT EXISTS orders_dispatch (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  area TEXT NOT NULL,
  sku TEXT NOT NULL,
  cases INTEGER NOT NULL,
  delivery_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE orders_dispatch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON orders_dispatch;
CREATE POLICY "Enable all operations for authenticated users" ON orders_dispatch FOR ALL USING (auth.role() = 'authenticated');

-- 7. Recreate get_orders_sorted
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
    o.date,
    o.client,
    o.area,
    o.sku,
    o.number_of_cases,
    o.tentative_delivery_date,
    COALESCE(o.status, 'pending')::text,
    o.created_at,
    o.updated_at
  FROM orders o
  ORDER BY
    CASE WHEN COALESCE(o.status, 'pending') = 'pending' THEN 0 ELSE 1 END,
    o.tentative_delivery_date DESC NULLS LAST;
END;
$$;
GRANT EXECUTE ON FUNCTION get_orders_sorted() TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_sorted() TO anon;

-- 8. Create insert_orders RPC
DROP FUNCTION IF EXISTS insert_orders(jsonb);
CREATE OR REPLACE FUNCTION insert_orders(orders_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec jsonb;
  new_id uuid;
  ids uuid[] := '{}';
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(orders_json)
  LOOP
    INSERT INTO orders (client, area, sku, number_of_cases, date, tentative_delivery_date, status)
    VALUES (
      (rec->>'client')::text,
      (rec->>'area')::text,
      (rec->>'sku')::text,
      COALESCE((rec->>'number_of_cases')::integer, 0),
      COALESCE((rec->>'date')::date, CURRENT_DATE),
      (rec->>'tentative_delivery_date')::date,
      COALESCE((rec->>'status')::text, 'pending')
    )
    RETURNING id INTO new_id;
    ids := array_append(ids, new_id);
  END LOOP;
  RETURN jsonb_build_object('ids', ids);
END;
$$;
GRANT EXECUTE ON FUNCTION insert_orders(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_orders(jsonb) TO anon;
