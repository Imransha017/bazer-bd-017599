
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS footer jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS public.get_public_vendor(text);
DROP FUNCTION IF EXISTS public.get_public_vendor_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
 RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.slug = _slug AND v.status = 'approved'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_vendor_by_id(_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.id = _id AND v.status = 'approved'
  LIMIT 1;
$function$;
