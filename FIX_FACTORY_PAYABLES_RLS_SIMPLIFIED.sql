-- ==============================================
-- FIX RLS POLICIES FOR FACTORY_PAYABLES TABLE (SIMPLIFIED)
-- Run this if the previous script didn't create policies
-- ==============================================

-- Step 1: Drop ALL existing policies (run this first)
DROP POLICY IF EXISTS "Allow all operations on factory_payables" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can view factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can insert factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can update factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "Users can delete factory payables based on client/branch access" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_select_policy" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_insert_policy" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_update_policy" ON public.factory_payables;
DROP POLICY IF EXISTS "factory_payables_delete_policy" ON public.factory_payables;

-- Step 2: Create policies one at a time (run each separately if needed)
CREATE POLICY "factory_payables_select_policy" 
ON public.factory_payables 
FOR SELECT 
USING (true);

CREATE POLICY "factory_payables_insert_policy" 
ON public.factory_payables 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "factory_payables_update_policy" 
ON public.factory_payables 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "factory_payables_delete_policy" 
ON public.factory_payables 
FOR DELETE 
USING (true);

-- Step 3: Verify policies were created
SELECT 
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables'
ORDER BY cmd, policyname;

