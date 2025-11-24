-- Enable RLS on user_management table with proper policies
-- This avoids recursion by using a helper function

-- First, enable RLS
ALTER TABLE user_management ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow all operations on user_management" ON user_management;
DROP POLICY IF EXISTS "Users can view user management" ON user_management;
DROP POLICY IF EXISTS "Users can insert user management" ON user_management;
DROP POLICY IF EXISTS "Users can update user management" ON user_management;
DROP POLICY IF EXISTS "Users can delete user management" ON user_management;
DROP POLICY IF EXISTS "Admins can insert user management" ON user_management;
DROP POLICY IF EXISTS "Admins can update user management" ON user_management;
DROP POLICY IF EXISTS "Admins can delete user management" ON user_management;
DROP POLICY IF EXISTS "Users can view own user_management record" ON user_management;
DROP POLICY IF EXISTS "Users can insert own user_management record" ON user_management;
DROP POLICY IF EXISTS "Users can update own user_management record" ON user_management;
DROP POLICY IF EXISTS "Admins and managers can view all user_management records" ON user_management;
DROP POLICY IF EXISTS "Admins can insert user_management records" ON user_management;
DROP POLICY IF EXISTS "Admins can update user_management records" ON user_management;
DROP POLICY IF EXISTS "Admins can delete user_management records" ON user_management;

-- Create a helper function to check if current user is admin
-- This avoids recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user has admin role in user_management
  -- Use SECURITY DEFINER to bypass RLS for this check
  RETURN EXISTS (
    SELECT 1 FROM user_management
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if current user is admin or manager
CREATE OR REPLACE FUNCTION is_current_user_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_management
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy 1: Users can view their own record
CREATE POLICY "Users can view own record" ON user_management
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Admins and managers can view all records
CREATE POLICY "Admins and managers can view all" ON user_management
  FOR SELECT USING (is_current_user_admin_or_manager());

-- Policy 3: Admins can insert new records
CREATE POLICY "Admins can insert" ON user_management
  FOR INSERT WITH CHECK (is_current_user_admin());

-- Policy 4: Admins can update any record
CREATE POLICY "Admins can update" ON user_management
  FOR UPDATE USING (is_current_user_admin());

-- Policy 5: Admins can delete any record
CREATE POLICY "Admins can delete" ON user_management
  FOR DELETE USING (is_current_user_admin());

-- Policy 6: Users can update their own record (for profile updates)
CREATE POLICY "Users can update own record" ON user_management
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO anon;
GRANT EXECUTE ON FUNCTION is_current_user_admin_or_manager() TO anon;

