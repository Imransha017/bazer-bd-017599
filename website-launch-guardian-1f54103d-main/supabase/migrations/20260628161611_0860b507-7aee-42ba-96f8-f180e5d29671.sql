ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS nid_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;