-- ==============================================
-- FIX RLS POLICIES FOR FACTORY_PAYABLES TABLE
-- This will allow INSERT operations for factory payables
-- ==============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables';

-- Step 2: Check current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables';

-- Step 3: Remove ALL existing policies
DROP POLICY IF EXISTS "Allow all operations on factory_payables" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can view factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can insert factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can update factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can delete factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_select_policy" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_insert_policy" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_update_policy" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_delete_policy" ON public.factory_payables;

-- Step 4: Create comprehensive policies with explicit role grants
-- SELECT Policy - Allow everyone to read
CREATE POLICY "factory_payables_select_policy" 
ON public.factory_payables 
FOR SELECT 
TO public, anon, authenticated
USING (true);

-- INSERT Policy - Allow everyone to insert
CREATE POLICY "factory_payables_insert_policy" 
ON public.factory_payables 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);

-- UPDATE Policy - Allow everyone to update
CREATE POLICY "factory_payables_update_policy" 
ON public.factory_payables 
FOR UPDATE 
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy - Allow everyone to delete
CREATE POLICY "factory_payables_delete_policy" 
ON public.factory_payables 
FOR DELETE 
TO public, anon, authenticated
USING (true);

-- Step 5: Grant explicit table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_payables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_payables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_payables TO public;

-- Step 6: Verify policies were created
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables'
ORDER BY cmd, policyname;

-- Step 7: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'factory_payables'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

