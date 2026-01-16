-- ==============================================
-- INSERT CUSTOMERS FROM PRICING DATA (NO CONFLICT HANDLING)
-- Use this version if there is NO unique constraint on the customers table
-- ==============================================

WITH pricing_data AS (
  SELECT * FROM (VALUES 
    -- Data from 4/1/2025
    ('Jubile Festa inn', 'Jubilee Hills', '500 P', 9.00),
    ('Jubile Festa inn', 'Jubilee Hills', '250 EC', 5.50),
    ('House party', 'Sanikpuri', '500 P', 9.00),
    ('This is it café', 'Sanikpuri', '500 P', 9.00),
    ('Tilaks kitchen', 'Madhapur', '500 P', 8.50),
    ('Golden Pavilion', 'Banjara Hills', '750 AL', 14.00),
    ('Element E7', 'Kukatpally', '1000 P', 15.00),
    ('Deccan kitchen', 'Film nagar', '750 P', 14.50),
    ('Deccan kitchen', 'Film nagar', '250 EC', 5.50),
    ('The English café', 'Nanakramguda', '750 P', 15.00),
    ('Atias Kitchen', 'Gandipet', '1000 P', 14.00),
    ('Gismat', 'Hyderabad', '500 P', 8.30),
    ('Good Vibes', 'Khajaguda', '500 P', 9.50),
    ('Fusion Aroma', 'Nallagandla', '1000 P', 14.50),
    ('Biryanis and More', 'Ameerpet', '1000 P', 15.00),
    ('Biryanis and More', 'Tirumalagiri', '1000 P', 15.00),
    ('Biryanis and More', 'Nizampet', '1000 P', 15.00),
    ('Biryanis and More', 'Ongole', '1000 P', 16.00),
    ('Biryanis and More', 'Warangal', '1000 P', 15.00),
    ('Biryanis and More', 'Khammam', '1000 P', 15.00),
    ('Biryanis and More', 'Gachibowli', '1000 P', 15.00),
    ('Biryanis and More', 'Narakoduru', '1000 P', 14.50),
    ('Biryanis and More', 'Chandha Nagar', '1000 P', 15.00),
    ('Tara South Indian', 'Hitech City', '500 P', 8.50),
    ('benguluru Bhavan', 'Kondapur', '500 P', 8.50),
    ('Mid land', 'Telangana', '1000 P', 15.50),
    ('Mid land', 'Telangana', '750 AL', 14.50),
    ('Mid land', 'Andhra Pradesh', '750 AL', 14.50),
    ('Tonique', 'Vijayawada', '1000 P', 14.00),
    ('Krigo', 'Elluru', '1000 P', 14.50),
    ('Alley 91', 'Nanakramguda', '500 P', 10.00),
    ('Alley 91', 'Nanakramguda', '250 EC', 5.71),
    ('Blossamin Spa', 'Tirumalagiri', '250 P', 6.00),
    ('jagan Pan House', 'Bhoodan Pochampally', '500 P', 9.50),
    ('jagan Pan House', 'Bhoodan Pochampally', '1000 P', 15.00),
    ('Chandhu Poda Marriage Order', 'Ongole', '250 P', 6.80),
    ('Maryadha Ramanna', 'Kondapur', '500 P', 8.50),
    ('Maryadha Ramanna', 'L B Nagar', '500 P', 8.50),
    ('Chaitanya''s Modern Kitchen', 'Khajaguda', '500 P', 8.75),
    ('soul of south', 'Film nagar', '500 P', 8.50),
    ('1980s Milatry Hotel', 'Khajaguda', '750 AL', 14.50),
    ('Intercity', 'Bachupally', '500 EC', 5.50),
    ('Aaha', 'Khajaguda', '500 AL', 8.75),
    
    -- Data from 9/8/2025
    ('Gismat', 'Dilshuknagar', '500 P', 8.50),
    ('Gismat', 'Ameerpet', '500 P', 8.50),
    ('Gismat', 'Chandha Nagar', '500 P', 8.50),
    ('Gismat', 'Pragathi nagar', '500 P', 8.50),
    ('Gismat', 'Kondapur', '500 P', 8.50),
    ('Gismat', 'Lakshmipuram', '500 P', 8.50),
    ('Gismat', 'Tenali', '500 P', 8.50),
    ('Gismat', 'Main office', '500 P', 8.50),
    
    -- Data from 11/15/2025
    ('Intercity', 'Bachupally', '500 EC', 5.90),
    
    -- Data from 12/1/2025
    ('Hiyya Chrono Jail Mandi', 'Madhapur', '500 P', 8.50),
    ('Tawalogy', 'Gandipet', '1000 P', 14.50),
    ('Tawalogy', 'Gandipet', '250 EC', 4.29),
    
    -- Data from 1/1/2026
    ('Happy Monkeys', 'Nagole', '500 P', 9.00),
    ('Alley 91', 'Nanakramguda', '250 P', 7.67)
  ) AS t(client_name, branch, sku, price_per_bottle)
),
-- Remove duplicates: if same client-branch-SKU appears multiple times, keep the latest price
deduplicated_data AS (
  SELECT DISTINCT ON (client_name, branch, sku)
    client_name,
    branch,
    sku,
    price_per_bottle
  FROM pricing_data
  ORDER BY client_name, branch, sku, price_per_bottle DESC
)
INSERT INTO customers (
  client_name, 
  branch, 
  sku, 
  price_per_bottle,
  is_active
)
SELECT 
  client_name,
  branch,
  sku,
  price_per_bottle,
  true
FROM deduplicated_data;

-- Verify the import
SELECT 
  'Customers Imported' as status,
  COUNT(*) as total_customers,
  COUNT(DISTINCT client_name) as unique_clients,
  COUNT(DISTINCT branch) as unique_branches
FROM customers;

-- Show summary by client
SELECT 
  client_name,
  COUNT(*) as branch_count,
  STRING_AGG(DISTINCT branch, ', ' ORDER BY branch) as branches
FROM customers
GROUP BY client_name
ORDER BY client_name;
