-- Create saved_filters table for Enhanced Search & Filtering System
-- This table stores user-saved filter combinations for quick access

CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL,
  filter JSONB NOT NULL, -- Stores the SearchFilter object
  is_shared BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_filters_module ON saved_filters(module);
CREATE INDEX IF NOT EXISTS idx_saved_filters_created_by ON saved_filters(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_filters_is_shared ON saved_filters(is_shared);
CREATE INDEX IF NOT EXISTS idx_saved_filters_is_default ON saved_filters(is_default);
CREATE INDEX IF NOT EXISTS idx_saved_filters_tags ON saved_filters USING GIN(tags);

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own filters and shared filters
CREATE POLICY "Users can view own and shared filters" ON saved_filters
  FOR SELECT USING (
    created_by = auth.uid() OR is_shared = true
  );

-- Users can insert their own filters
CREATE POLICY "Users can insert own filters" ON saved_filters
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own filters
CREATE POLICY "Users can update own filters" ON saved_filters
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own filters
CREATE POLICY "Users can delete own filters" ON saved_filters
  FOR DELETE USING (created_by = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_filters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_filters_updated_at();

-- Create bulk_operations table for tracking bulk operations
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('update', 'delete', 'archive', 'export', 'assign')),
  module VARCHAR(100) NOT NULL,
  record_ids UUID[] NOT NULL,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  errors JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for bulk_operations
CREATE INDEX IF NOT EXISTS idx_bulk_operations_module ON bulk_operations(module);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_by ON bulk_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_at ON bulk_operations(created_at DESC);

-- Enable RLS
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bulk_operations
-- Users can view their own bulk operations
CREATE POLICY "Users can view own bulk operations" ON bulk_operations
  FOR SELECT USING (created_by = auth.uid());

-- Users can insert their own bulk operations
CREATE POLICY "Users can insert own bulk operations" ON bulk_operations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own bulk operations
CREATE POLICY "Users can update own bulk operations" ON bulk_operations
  FOR UPDATE USING (created_by = auth.uid());
