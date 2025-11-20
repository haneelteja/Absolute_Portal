-- ==============================================
-- FIX RLS POLICIES FOR SALES_TRANSACTIONS TABLE
-- This will allow INSERT operations for sales transactions
-- ==============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'sales_transactions';

-- Step 2: Check current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'sales_transactions';

-- Step 3: Remove ALL existing policies
DROP POLICY IF EXISTS "Allow all operations on sales_transactions" ON public.sales_transactions;
DROP POLICY IF EXISTS "Users can view sales transactions based on client/branch access" ON public.sales_transactions;
DROP POLICY IF EXISTS "Users can insert sales transactions based on client/branch access" ON public.sales_transactions;
DROP POLICY IF EXISTS "Users can update sales transactions based on client/branch access" ON public.sales_transactions;
DROP POLICY IF EXISTS "Users can delete sales transactions based on client/branch access" ON public.sales_transactions;
DROP POLICY IF EXISTS "sales_transactions_select_policy" ON public.sales_transactions;
DROP POLICY IF EXISTS "sales_transactions_insert_policy" ON public.sales_transactions;
DROP POLICY IF EXISTS "sales_transactions_update_policy" ON public.sales_transactions;
DROP POLICY IF EXISTS "sales_transactions_delete_policy" ON public.sales_transactions;

-- Step 4: Create comprehensive policies with explicit role grants
-- SELECT Policy - Allow everyone to read
CREATE POLICY "sales_transactions_select_policy" 
ON public.sales_transactions 
FOR SELECT 
TO public, anon, authenticated
USING (true);

-- INSERT Policy - Allow everyone to insert
CREATE POLICY "sales_transactions_insert_policy" 
ON public.sales_transactions 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);

-- UPDATE Policy - Allow everyone to update
CREATE POLICY "sales_transactions_update_policy" 
ON public.sales_transactions 
FOR UPDATE 
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy - Allow everyone to delete
CREATE POLICY "sales_transactions_delete_policy" 
ON public.sales_transactions 
FOR DELETE 
TO public, anon, authenticated
USING (true);

-- Step 5: Grant explicit table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_transactions TO public;

-- Step 6: Verify policies were created
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'sales_transactions'
ORDER BY cmd, policyname;

-- Step 7: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'sales_transactions'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

