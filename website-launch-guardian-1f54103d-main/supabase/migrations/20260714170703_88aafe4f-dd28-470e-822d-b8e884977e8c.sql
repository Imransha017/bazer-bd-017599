
DROP FUNCTION IF EXISTS public.get_public_vendor(text);

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.slug = _slug AND v.status = 'approved'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_vendor_by_id(_id uuid)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.id = _id AND v.status = 'approved'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vendor_by_id(uuid) TO anon, authenticated;
