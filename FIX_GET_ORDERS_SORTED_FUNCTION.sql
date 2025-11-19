-- ==============================================
-- FIX get_orders_sorted RPC FUNCTION
-- The function was selecting 'client' but the actual column is 'client_name'
-- ==============================================

CREATE OR REPLACE FUNCTION get_orders_sorted()
RETURNS TABLE (
  id UUID,
  client TEXT,
  branch TEXT,
  sku TEXT,
  number_of_cases INTEGER,
  tentative_delivery_date DATE,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.client_name as client,  -- Map client_name to client in return
    o.branch,
    o.sku,
    o.number_of_cases,
    o.tentative_delivery_date,
    o.status,
    o.created_at,
    o.updated_at
  FROM orders o
  ORDER BY 
    CASE WHEN o.status = 'pending' THEN 1 ELSE 2 END,
    o.tentative_delivery_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_orders_sorted() TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_sorted() TO anon;
GRANT EXECUTE ON FUNCTION get_orders_sorted() TO public;

-- Verify the function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_orders_sorted';

