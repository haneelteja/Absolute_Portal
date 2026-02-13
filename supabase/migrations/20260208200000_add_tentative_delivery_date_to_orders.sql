-- Add tentative_delivery_date to orders if table has tentative_delivery_time instead
-- Enables frontend to use consistent column name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_time')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_date') THEN
    ALTER TABLE orders ADD COLUMN tentative_delivery_date DATE;
    UPDATE orders SET tentative_delivery_date = tentative_delivery_time WHERE tentative_delivery_date IS NULL;
    ALTER TABLE orders ALTER COLUMN tentative_delivery_date SET NOT NULL;
  END IF;
END $$;
