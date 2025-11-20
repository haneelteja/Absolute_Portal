-- ==============================================
-- CLEAR ORDERS_DISPATCH TABLE
-- This script clears all data from the orders_dispatch table
-- ==============================================

-- Clear all data from orders_dispatch table
TRUNCATE TABLE public.orders_dispatch RESTART IDENTITY CASCADE;

-- Verify table is empty
SELECT COUNT(*) as remaining_records FROM public.orders_dispatch;

