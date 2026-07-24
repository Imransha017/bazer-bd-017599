
-- Remove the view that triggered the security_definer_view linter warning
DROP VIEW IF EXISTS public.vendors_public;

-- Re-add the public read policy for approved vendors
CREATE POLICY "Public can view approved vendors" ON public.vendors
  FOR SELECT TO anon USING (status = 'approved'::text);

-- Column-level GRANT: anon may only read non-sensitive columns
GRANT SELECT (
  id, store_name, slug, logo_url, banner_url, description,
  status, total_sales, total_orders, created_at, updated_at
) ON public.vendors TO anon;
