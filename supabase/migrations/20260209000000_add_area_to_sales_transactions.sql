-- Add area column to sales_transactions for denormalization and filtering
-- Area can be derived from customers via customer_id, but storing it enables
-- direct filtering and avoids joins in some queries.

ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS area TEXT;

-- Backfill area from customers for existing rows
UPDATE sales_transactions st
SET area = c.area
FROM customers c
WHERE st.customer_id = c.id
  AND st.area IS NULL;
