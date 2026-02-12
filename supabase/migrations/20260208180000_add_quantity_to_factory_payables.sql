-- Add quantity column to factory_payables (nullable - for production entries it stores cases)
ALTER TABLE factory_payables 
ADD COLUMN IF NOT EXISTS quantity integer;

COMMENT ON COLUMN factory_payables.quantity IS 'Number of cases for production entries';
