-- Allow 'production' as valid transaction_type in factory_payables
-- The original CHECK only allowed ('debit', 'credit'); sales recording uses 'production'
ALTER TABLE factory_payables DROP CONSTRAINT IF EXISTS factory_payables_transaction_type_check;
ALTER TABLE factory_payables ADD CONSTRAINT factory_payables_transaction_type_check
  CHECK (transaction_type IN ('debit', 'credit', 'production'));
