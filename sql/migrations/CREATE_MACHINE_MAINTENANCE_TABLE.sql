-- Machine Maintenance Table
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS machine_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  equipment TEXT NOT NULL,
  part TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount NUMERIC,
  delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE machine_maintenance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can manage machine_maintenance"
  ON machine_maintenance
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert application configuration entries for machine maintenance
INSERT INTO invoice_configurations (config_key, config_value, config_type, description)
VALUES
  ('machine_equipment', '[]', 'string', 'Equipment list for Machine Maintenance dropdown'),
  ('machine_maintenance_whatsapp_number', '', 'string', 'WhatsApp number to notify for machine maintenance events (e.g. 919876543210)'),
  ('machine_maintenance_request_template', 'New maintenance request created.
Equipment: {{equipment}}
Part: {{part}}
Quantity: {{quantity}}
Date: {{date}}', 'string', 'WhatsApp template for new machine maintenance request'),
  ('machine_maintenance_received_template', 'Maintenance request received.
Equipment: {{equipment}}
Part: {{part}}
Quantity: {{quantity}}
Amount: {{amount}}
Delivery Date: {{delivery_date}}', 'string', 'WhatsApp template when maintenance request is marked as received')
ON CONFLICT (config_key) DO NOTHING;
