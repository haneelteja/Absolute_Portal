-- Add bottles_per_case and generated cost_per_case to factory_pricing
ALTER TABLE public.factory_pricing
  ADD COLUMN IF NOT EXISTS bottles_per_case integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cost_per_case numeric GENERATED ALWAYS AS (price_per_bottle * bottles_per_case) STORED;