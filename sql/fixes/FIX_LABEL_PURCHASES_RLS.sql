-- ==============================================
-- FIX RLS POLICIES FOR LABEL_PURCHASES TABLE
-- This will allow INSERT operations for label purchases
-- ==============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'label_purchases';

-- Step 2: Check current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'label_purchases';

-- Step 3: Remove ALL existing policies
DROP POLICY IF EXISTS "Allow all operations on label_purchases" ON public.label_purchases;
DROP POLICY IF EXISTS "Users can view label purchases based on client/branch access" ON public.label_purchases;
DROP POLICY IF EXISTS "Users can insert label purchases based on client/branch access" ON public.label_purchases;
DROP POLICY IF EXISTS "Users can update label purchases based on client/branch access" ON public.label_purchases;
DROP POLICY IF EXISTS "Users can delete label purchases based on client/branch access" ON public.label_purchases;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_select_policy" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_insert_policy" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_update_policy" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_delete_policy" ON public.label_purchases;

-- Step 4: Create comprehensive policies (simplified - without TO clause)
CREATE POLICY "label_purchases_select_policy" 
ON public.label_purchases 
FOR SELECT 
USING (true);

CREATE POLICY "label_purchases_insert_policy" 
ON public.label_purchases 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "label_purchases_update_policy" 
ON public.label_purchases 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "label_purchases_delete_policy" 
ON public.label_purchases 
FOR DELETE 
USING (true);

-- Step 5: Grant explicit table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_purchases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_purchases TO public;

-- Step 6: Verify policies were created
SELECT 
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'label_purchases'
ORDER BY cmd, policyname;

-- Step 7: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'label_purchases'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

