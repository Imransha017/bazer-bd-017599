CREATE TABLE public.dropshipping_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  default_commission_pct numeric NOT NULL DEFAULT 0,
  min_payout numeric NOT NULL DEFAULT 500,
  cookie_days integer NOT NULL DEFAULT 30,
  auto_approve_apps boolean NOT NULL DEFAULT false,
  auto_approve_earnings boolean NOT NULL DEFAULT true,
  allowed_payout_methods text[] NOT NULL DEFAULT ARRAY['bkash','nagad','rocket','bank'],
  terms_md text, hero_title text, hero_subtitle text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dropshipping_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.dropshipping_settings TO anon, authenticated;
GRANT ALL ON public.dropshipping_settings TO service_role;
ALTER TABLE public.dropshipping_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ds settings read" ON public.dropshipping_settings FOR SELECT USING (true);
CREATE POLICY "ds settings admin write" ON public.dropshipping_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.dropshipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.dropshipping_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, body_md text,
  tone text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dropshipping_announcements TO authenticated;
GRANT ALL ON public.dropshipping_announcements TO service_role;
ALTER TABLE public.dropshipping_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann read" ON public.dropshipping_announcements FOR SELECT TO authenticated USING (
  (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
  OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ann admin manage" ON public.dropshipping_announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ann_updated BEFORE UPDATE ON public.dropshipping_announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dropshippers
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pixel_id text,
  ADD COLUMN IF NOT EXISTS ga_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dropshipping_enabled boolean NOT NULL DEFAULT true;

-- site_settings
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site settings admin read" ON public.site_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "site settings admin update" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings (id, settings) VALUES (1, '{"brand":{"name":"Bazar BD","tagline":"Bangladesh premium marketplace","logo_url":"","favicon_url":""},"header":{"top_bar_enabled":true,"top_bar_text":"Free delivery over ৳2000","nav_links":[{"label":"Home","href":"/","sort":1},{"label":"Categories","href":"/categories","sort":2}],"show_search":true,"show_wishlist":true,"show_cart":true,"show_account":true},"footer":{"columns":[],"payment_badges":[],"app_links":{"app_store":"","google_play":""},"contact":{"email":"","phone":"","address":""},"social":{"facebook":"","instagram":"","youtube":"","twitter":""},"copyright_text":"© Bazar"}}'::jsonb);

CREATE VIEW public.site_settings_public AS
  SELECT id, settings, updated_at FROM public.site_settings WHERE id = 1;
ALTER VIEW public.site_settings_public SET (security_invoker = off);
GRANT SELECT ON public.site_settings_public TO anon, authenticated;

CREATE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, cookie_days
  FROM public.affiliate_settings WHERE id = 1;
GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

CREATE VIEW public.dropshippers_public AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers WHERE status = 'approved';
ALTER VIEW public.dropshippers_public SET (security_invoker = off);
GRANT SELECT ON public.dropshippers_public TO anon, authenticated;

-- promotions
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL DEFAULT 'top_bar',
  title text NOT NULL DEFAULT '', message text NOT NULL DEFAULT '',
  link_url text, button_label text,
  bg_color text NOT NULL DEFAULT '#7c3aed', text_color text NOT NULL DEFAULT '#ffffff',
  sort_order int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo public read" ON public.promotions FOR SELECT USING (
  active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "promo admin read" ON public.promotions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "promo admin manage" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER promotions_set_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- vendor.footer
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS footer jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Recreate get_public_vendor with footer field
DROP FUNCTION IF EXISTS public.get_public_vendor(text);
CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v WHERE v.slug = _slug AND v.status = 'approved' LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.get_public_vendor_by_id(_id uuid)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v WHERE v.id = _id AND v.status = 'approved' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vendor_by_id(uuid) TO anon, authenticated;

-- affiliate_settings adjust anon grants (column-level)
REVOKE ALL ON public.affiliate_settings FROM anon;
GRANT SELECT (id, is_enabled, commission_pct, cookie_days) ON public.affiliate_settings TO anon;
