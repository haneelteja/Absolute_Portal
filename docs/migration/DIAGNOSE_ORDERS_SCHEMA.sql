-- Run this in Supabase SQL Editor to see the current orders table schema
-- Copy the output and share it if you need help fixing 400 errors

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;
