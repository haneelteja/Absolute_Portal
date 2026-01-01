-- Promote user nalluruhaneel@gmail.com to manager role
-- This migration updates the user role in user_management table

UPDATE user_management
SET 
  role = 'manager',
  updated_at = NOW()
WHERE email = 'nalluruhaneel@gmail.com';

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
  current_role TEXT;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM user_management
  WHERE email = 'nalluruhaneel@gmail.com';
  
  IF updated_count > 0 THEN
    SELECT role INTO current_role
    FROM user_management
    WHERE email = 'nalluruhaneel@gmail.com';
    RAISE NOTICE 'User nalluruhaneel@gmail.com role updated to: %', current_role;
  ELSE
    RAISE NOTICE 'User nalluruhaneel@gmail.com not found in user_management table';
  END IF;
END $$;

