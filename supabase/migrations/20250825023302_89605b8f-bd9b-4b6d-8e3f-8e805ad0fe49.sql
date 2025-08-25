-- Add foreign key constraints for proper table relationships
-- First, update any null client_id values to ensure data integrity
UPDATE transport_expenses SET client_id = null WHERE client_id = '';
UPDATE label_purchases SET client_id = null WHERE client_id = '';
UPDATE sales_transactions SET customer_id = null WHERE customer_id = '';
UPDATE label_design_costs SET customer_id = null WHERE customer_id = '';

-- Add foreign key constraints
ALTER TABLE transport_expenses 
ADD CONSTRAINT fk_transport_expenses_client 
FOREIGN KEY (client_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE label_purchases 
ADD CONSTRAINT fk_label_purchases_client 
FOREIGN KEY (client_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE sales_transactions 
ADD CONSTRAINT fk_sales_transactions_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE label_design_costs 
ADD CONSTRAINT fk_label_design_costs_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Add foreign key for label_purchases to label_vendors
ALTER TABLE label_purchases 
ADD CONSTRAINT fk_label_purchases_vendor 
FOREIGN KEY (vendor_id) REFERENCES label_vendors(id) ON DELETE RESTRICT;