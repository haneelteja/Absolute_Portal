-- ==============================================
-- FIX RLS POLICIES FOR CUSTOMERS TABLE
-- This will allow INSERT operations for customers
-- ==============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'customers';

-- Step 2: Check current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'customers';

-- Step 3: Remove ALL existing policies
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.customers;

-- Step 4: Create comprehensive policies with explicit role grants
-- SELECT Policy - Allow everyone to read
CREATE POLICY "customers_select_policy" 
ON public.customers 
FOR SELECT 
TO public, anon, authenticated
USING (true);

-- INSERT Policy - Allow everyone to insert
CREATE POLICY "customers_insert_policy" 
ON public.customers 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);

-- UPDATE Policy - Allow everyone to update
CREATE POLICY "customers_update_policy" 
ON public.customers 
FOR UPDATE 
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy - Allow everyone to delete
CREATE POLICY "customers_delete_policy" 
ON public.customers 
FOR DELETE 
TO public, anon, authenticated
USING (true);

-- Step 5: Grant explicit table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO public;

-- Step 6: Verify policies were created
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'customers'
ORDER BY cmd, policyname;

-- Step 7: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- Step 8: Test INSERT manually
INSERT INTO public.customers (
    client_name,
    branch,
    sku,
    price_per_case,
    price_per_bottle,
    pricing_date
) VALUES (
    'TEST_CLIENT',
    'TEST_BRANCH',
    'TEST_SKU',
    100.00,
    10.00,
    CURRENT_DATE
)
RETURNING *;

-- Clean up test data
DELETE FROM public.customers WHERE client_name = 'TEST_CLIENT' AND branch = 'TEST_BRANCH';

