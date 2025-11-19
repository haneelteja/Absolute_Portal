-- ==============================================
-- FINAL FIX FOR ORDERS RLS POLICIES
-- This ensures policies are correctly applied to all roles
-- ==============================================

-- Step 1: Verify current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'orders'
ORDER BY cmd, policyname;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

-- Step 4: Recreate policies (these should apply to all roles by default)
CREATE POLICY "orders_select_policy" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "orders_insert_policy" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "orders_update_policy" 
ON public.orders 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "orders_delete_policy" 
ON public.orders 
FOR DELETE 
USING (true);

-- Step 5: Ensure table-level permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO public;

-- Step 6: Verify everything is correct
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'orders'
ORDER BY cmd, policyname;

SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'orders'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

